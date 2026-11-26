import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { migrarEstado } from '../constants'
import { CREADOR_CLASSROOM } from '../classroom'

export const PREFIJO = 'PRJ'
export const clave = (p) => `${PREFIJO}-${p.numero}`

const COLUMNAS = ['titulo', 'descripcion', 'fecha', 'estado', 'prioridad', 'origen']
const aFila = (datos) => Object.fromEntries(COLUMNAS.filter((k) => k in datos).map((k) => [k, datos[k] ?? null]))

const desdeFila = (f, usuario) => ({
  ...f,
  creadorId: f.origen?.tipo === 'classroom' ? CREADOR_CLASSROOM : usuario.id,
  creado: Date.parse(f.creado),
  actualizado: f.actualizado ? Date.parse(f.actualizado) : null,
  comentarios: (f.comentarios ?? [])
    .map((c) => ({ id: c.id, autorId: c.user_id, autorNombre: usuario.nombre, texto: c.texto, fecha: Date.parse(c.creado) }))
    .sort((a, b) => a.fecha - b.fecha),
})

const CLAVE_LOCAL = 'proyectos'
const claveMigrado = (usuario) => `migrado_supabase_${usuario.id}`

/** Proyectos del usuario actual, guardados en Supabase (cada uno ve solo los suyos gracias a RLS). */
export function useProyectos(perfil) {
  // Solo dependemos del id y el nombre: cambiar el tema u otros datos del perfil no recarga los proyectos
  const usuario = useMemo(() => ({ id: perfil.id, nombre: perfil.nombre }), [perfil.id, perfil.nombre])
  const [proyectos, setProyectos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const actuales = useRef(proyectos)
  useEffect(() => {
    actuales.current = proyectos
  }, [proyectos])

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('proyectos').select('*, comentarios(*)').order('numero')
    if (error) setError(`No se pudieron cargar los proyectos: ${error.message}`)
    else setProyectos(data.map((f) => desdeFila(f, usuario)))
    setCargando(false)
  }, [usuario])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Si algo falla en el servidor, se avisa y se recarga el estado real
  const fallo = (err) => {
    setError(err.message ?? String(err))
    cargar()
  }
  const siguienteNumero = () => Math.max(0, ...actuales.current.map((p) => p.numero)) + 1

  const guardar = async (datos) => {
    if (datos.id) return editar(datos.id, datos)
    const { data, error } = await supabase
      .from('proyectos')
      .insert({ ...aFila(datos), numero: siguienteNumero() })
      .select('*, comentarios(*)')
      .single()
    if (error) return fallo(error)
    setProyectos((ps) => [...ps, desdeFila(data, usuario)])
  }

  // Añade varios de golpe (p. ej. tareas de Classroom)
  const importar = async (lista) => {
    if (!lista.length) return
    let numero = siguienteNumero() - 1
    const filas = lista.map((d) => ({ ...aFila(d), numero: ++numero }))
    const { data, error } = await supabase.from('proyectos').insert(filas).select('*, comentarios(*)')
    if (error) return fallo(error)
    setProyectos((ps) => [...ps, ...data.map((f) => desdeFila(f, usuario))])
  }

  const editar = async (id, campos) => {
    const fila = aFila(campos)
    if (!Object.keys(fila).length) return
    setProyectos((ps) => ps.map((p) => (p.id === id ? { ...p, ...fila, actualizado: Date.now() } : p)))
    const { error } = await supabase
      .from('proyectos')
      .update({ ...fila, actualizado: new Date().toISOString() })
      .eq('id', id)
    if (error) fallo(error)
  }

  const moverA = (id, estado) => {
    const p = actuales.current.find((x) => x.id === id)
    if (p && p.estado !== estado) editar(id, { estado })
  }

  const borrar = async (id) => {
    setProyectos((ps) => ps.filter((p) => p.id !== id))
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) fallo(error)
  }

  const comentar = async (id, texto) => {
    const { data, error } = await supabase.from('comentarios').insert({ proyecto_id: id, texto }).select().single()
    if (error) return fallo(error)
    const c = { id: data.id, autorId: data.user_id, autorNombre: usuario.nombre, texto: data.texto, fecha: Date.parse(data.creado) }
    setProyectos((ps) => ps.map((p) => (p.id === id ? { ...p, comentarios: [...p.comentarios, c] } : p)))
  }

  const borrarComentario = async (id, comentarioId) => {
    setProyectos((ps) =>
      ps.map((p) => (p.id === id ? { ...p, comentarios: p.comentarios.filter((c) => c.id !== comentarioId) } : p)),
    )
    const { error } = await supabase.from('comentarios').delete().eq('id', comentarioId)
    if (error) fallo(error)
  }

  // ---------- Pasar a Supabase los proyectos que había en este navegador ----------
  const locales = (() => {
    try {
      return localStorage.getItem(claveMigrado(usuario)) ? [] : JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '[]')
    } catch {
      return []
    }
  })()

  const migrarLocales = async () => {
    let numero = siguienteNumero() - 1
    const filas = locales.map((p) => ({
      id: crypto.randomUUID(),
      numero: ++numero,
      titulo: p.titulo || 'Sin título',
      descripcion: p.descripcion ?? '',
      fecha: p.fecha || new Date().toISOString().slice(0, 10),
      estado: migrarEstado(p.estado),
      prioridad: ['baja', 'media', 'alta'].includes(p.prioridad) ? p.prioridad : 'media',
      origen: p.origen ?? null,
      creado: p.creado ? new Date(p.creado).toISOString() : new Date().toISOString(),
      _comentarios: (p.comentarios ?? []).filter((c) => !c.anonimo && c.texto?.trim()),
    }))
    const { error } = await supabase.from('proyectos').insert(filas.map(({ _comentarios: _c, ...f }) => f))
    if (error) return fallo(error)

    const comentarios = filas.flatMap((f) =>
      f._comentarios.map((c) => ({ proyecto_id: f.id, texto: c.texto, creado: new Date(c.fecha ?? Date.now()).toISOString() })),
    )
    if (comentarios.length) {
      const { error: e2 } = await supabase.from('comentarios').insert(comentarios)
      if (e2) setError(`Proyectos subidos, pero fallaron los comentarios: ${e2.message}`)
    }

    // Que Classroom no vuelva a importar lo que ya estaba
    const ids = JSON.parse(localStorage.getItem('classroom_importados') || '[]')
    if (ids.length) {
      await supabase
        .from('classroom_importados')
        .upsert(ids.map((mensaje_id) => ({ mensaje_id })), { onConflict: 'user_id,mensaje_id', ignoreDuplicates: true })
    }

    localStorage.setItem(claveMigrado(usuario), String(Date.now()))
    await cargar()
  }

  const descartarLocales = () => {
    localStorage.setItem(claveMigrado(usuario), 'descartado')
    setProyectos((ps) => [...ps]) // vuelve a pintar para ocultar el aviso
  }

  return {
    proyectos,
    cargando,
    error,
    limpiarError: () => setError(''),
    guardar,
    importar,
    editar,
    moverA,
    borrar,
    comentar,
    borrarComentario,
    proyectosLocales: locales.length,
    migrarLocales,
    descartarLocales,
  }
}
