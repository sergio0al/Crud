import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { migrarEstado } from '../constants'

export const PREFIJO = 'PRJ'
export const clave = (p) => `${PREFIJO}-${p.numero}`

const COLUMNAS = ['titulo', 'descripcion', 'fecha', 'estado', 'prioridad', 'asignatura', 'documento', 'repositorio', 'origen', 'tablero_id']
const aFila = (datos) => Object.fromEntries(COLUMNAS.filter((k) => k in datos).map((k) => [k, datos[k] ?? null]))

// nombres: Map id → nombre de los usuarios con los que comparto tableros (y yo)
const desdeFila = (f, nombres) => ({
  ...f,
  tablero_id: f.tablero_id ?? null, // null = tablero personal
  creadorId: f.origen?.tipo ?? f.user_id, // 'classroom', 'moodle' o el usuario que la creó
  autorNombre: nombres.get(f.user_id) ?? 'Usuario',
  asignatura: f.asignatura ?? f.origen?.curso ?? '', // ?? por si aún no existe la columna en la base de datos
  creado: Date.parse(f.creado),
  actualizado: f.actualizado ? Date.parse(f.actualizado) : null,
  comentarios: (f.comentarios ?? [])
    .map((c) => ({ id: c.id, autorId: c.user_id, autorNombre: nombres.get(c.user_id) ?? 'Usuario', texto: c.texto, fecha: Date.parse(c.creado) }))
    .sort((a, b) => a.fecha - b.fecha),
})

const CLAVE_LOCAL = 'proyectos'
const claveMigrado = (usuario) => `migrado_supabase_${usuario.id}`

/**
 * Proyectos que puede ver el usuario: los de su tablero personal (tablero_id = null)
 * y los de las tablas compartidas de las que es miembro (RLS en Supabase).
 * Se actualizan solos cuando otro miembro cambia algo (tiempo real).
 */
export function useProyectos(perfil) {
  // Solo dependemos del id y el nombre: cambiar el tema u otros datos del perfil no recarga los proyectos
  const usuario = useMemo(() => ({ id: perfil.id, nombre: perfil.nombre }), [perfil.id, perfil.nombre])
  const [proyectos, setProyectos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cambios, setCambios] = useState([]) // historial de cambios de estado (notificaciones)
  const [error, setError] = useState('')
  const actuales = useRef(proyectos)
  const nombres = useRef(new Map([[usuario.id, usuario.nombre]]))
  useEffect(() => {
    actuales.current = proyectos
  }, [proyectos])

  const cargar = useCallback(async () => {
    const [{ data, error }, { data: gente }, { data: historial }] = await Promise.all([
      supabase.from('proyectos').select('*, comentarios(*)').order('numero'),
      supabase.rpc('companeros'), // si aún no existe la función, solo se conoce el nombre propio
      // Cambios de estado de los últimos 14 días (si aún no existe la tabla, no hay y ya está)
      supabase
        .from('cambios_estado')
        .select('id, proyecto_id, user_id, de, a, creado')
        .gte('creado', new Date(Date.now() - 14 * 86400000).toISOString())
        .order('creado', { ascending: false })
        .limit(200),
    ])
    nombres.current = new Map([...(gente ?? []).map((g) => [g.id, g.nombre]), [usuario.id, usuario.nombre]])
    if (error) setError(`No se pudieron cargar los proyectos: ${error.message}`)
    else setProyectos(data.map((f) => desdeFila(f, nombres.current)))
    setCambios(
      (historial ?? []).map((c) => ({
        id: c.id,
        proyectoId: c.proyecto_id,
        autorId: c.user_id,
        autorNombre: c.user_id ? (nombres.current.get(c.user_id) ?? 'Usuario') : null,
        de: c.de,
        a: c.a,
        fecha: Date.parse(c.creado),
      })),
    )
    setCargando(false)
  }, [usuario])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Tiempo real: si otro miembro de una tabla compartida cambia algo, se recarga (agrupando cambios seguidos)
  useEffect(() => {
    let espera
    const recargar = () => {
      clearTimeout(espera)
      espera = setTimeout(cargar, 500)
    }
    const canal = supabase
      .channel(`proyectos-${usuario.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, recargar)
      .subscribe()
    return () => {
      clearTimeout(espera)
      supabase.removeChannel(canal)
    }
  }, [cargar, usuario.id])

  // Si algo falla en el servidor, se avisa y se recarga el estado real
  const fallo = (err) => {
    const mensaje = err.message ?? String(err)
    const columna = mensaje.match(/'(asignatura|documento|repositorio|tablero_id)' column/)?.[1]
    setError(
      columna
        ? `Falta la columna "${columna}" en la base de datos: ejecuta supabase/${columna === 'tablero_id' ? 'compartidos' : columna === 'repositorio' ? 'github' : columna}.sql en Supabase → SQL Editor.`
        : mensaje,
    )
    cargar()
  }
  // La numeración (PRJ-n) es independiente en cada tablero
  const siguienteNumero = (tableroId = null) =>
    Math.max(0, ...actuales.current.filter((p) => p.tablero_id === tableroId).map((p) => p.numero)) + 1

  const guardar = async (datos) => {
    if (datos.id) return editar(datos.id, datos)
    const { data, error } = await supabase
      .from('proyectos')
      .insert({ ...aFila(datos), numero: siguienteNumero(datos.tablero_id ?? null) })
      .select('*, comentarios(*)')
      .single()
    if (error) return fallo(error)
    setProyectos((ps) => [...ps, desdeFila(data, nombres.current)])
  }

  // Añade varios de golpe al tablero personal (p. ej. tareas de Classroom)
  const importar = async (lista) => {
    if (!lista.length) return
    let numero = siguienteNumero() - 1
    const filas = lista.map((d) => ({ ...aFila(d), numero: ++numero }))
    const { data, error } = await supabase.from('proyectos').insert(filas).select('*, comentarios(*)')
    if (error) return fallo(error)
    setProyectos((ps) => [...ps, ...data.map((f) => desdeFila(f, nombres.current))])
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

  // Si el profesor cambia la fecha de entrega (Moodle), se actualiza en las tareas aún sin terminar
  const actualizarFechas = (tipo, fechas) => {
    const porId = new Map(fechas.map((f) => [f.id, f.entrega]))
    for (const p of actuales.current) {
      const nueva = p.origen?.tipo === tipo && p.tablero_id === null ? porId.get(p.origen.id) : undefined
      if (nueva && nueva !== p.fecha && p.estado !== 'hecho') editar(p.id, { fecha: nueva })
    }
  }

  // Tareas que ya están entregadas en Classroom: pasan a Hecho (solo las del tablero personal aún sin terminar).
  // Se reconocen por el enlace de la tarea (…/a/<id>/…) o, si no, por título y curso.
  const marcarEntregadas = (tipo, entregadas) => {
    const idTarea = (enlace) => enlace?.match(/\/a\/([^/?#]+)/)?.[1]
    const normal = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
    const claveDe = (titulo, curso) => `${normal(titulo)}|${normal(curso)}`
    const porEnlace = new Set(entregadas.map((e) => idTarea(e.enlace)).filter(Boolean))
    const porTitulo = new Set(entregadas.map((e) => claveDe(e.titulo, e.curso)))
    let cambiadas = 0
    for (const p of actuales.current) {
      if (p.origen?.tipo !== tipo || p.tablero_id !== null || p.estado === 'hecho') continue
      const id = idTarea(p.origen.enlace)
      const curso = p.origen.curso || p.asignatura
      if ((id && porEnlace.has(id)) || porTitulo.has(claveDe(p.titulo, curso))) {
        editar(p.id, { estado: 'hecho' })
        cambiadas++
      }
    }
    return cambiadas
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
    // No subir lo que ya está en la cuenta: tareas de Classroom/Moodle ya importadas
    // ni repetidas dentro del propio navegador
    const yaEnCuenta = new Set(actuales.current.filter((p) => p.origen?.id).map((p) => `${p.origen.tipo}:${p.origen.id}`))
    const vistos = new Set()
    const aSubir = locales.filter((p) => {
      if (!p.origen?.id) return true
      const k = `${p.origen.tipo}:${p.origen.id}`
      if (yaEnCuenta.has(k) || vistos.has(k)) return false
      vistos.add(k)
      return true
    })

    let numero = siguienteNumero() - 1
    const filas = aSubir.map((p) => ({
      id: crypto.randomUUID(),
      numero: ++numero,
      titulo: p.titulo || 'Sin título',
      descripcion: p.descripcion ?? '',
      fecha: p.fecha || new Date().toISOString().slice(0, 10),
      estado: migrarEstado(p.estado),
      prioridad: ['baja', 'media', 'alta'].includes(p.prioridad) ? p.prioridad : 'media',
      asignatura: p.asignatura ?? p.origen?.curso ?? '',
      origen: p.origen ?? null,
      creado: p.creado ? new Date(p.creado).toISOString() : new Date().toISOString(),
      _comentarios: (p.comentarios ?? []).filter((c) => !c.anonimo && c.texto?.trim()),
    }))
    if (filas.length) {
      const { error } = await supabase.from('proyectos').insert(filas.map(({ _comentarios: _c, ...f }) => f))
      if (error) return fallo(error)
    }

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
    cambios,
    cargando,
    error,
    limpiarError: () => setError(''),
    guardar,
    importar,
    actualizarFechas,
    marcarEntregadas,
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
