import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { migrarEstado } from '../constants'
import { idAnonimo } from '../auth'

export const PREFIJO = 'PRJ'
export const clave = (p) => `${PREFIJO}-${p.numero}`

export function useProyectos(usuario) {
  const [guardados, setGuardados] = useLocalStorage('proyectos', [])

  // Normaliza datos antiguos: estados nuevos y número de tarea (PRJ-1, PRJ-2...)
  const proyectos = useMemo(() => {
    const max = Math.max(0, ...guardados.map((p) => p.numero ?? 0))
    const sinNumero = guardados.filter((p) => p.numero == null).map((p) => p.id)
    return guardados.map((p) => ({
      ...p,
      estado: migrarEstado(p.estado),
      numero: p.numero ?? max + 1 + sinNumero.indexOf(p.id),
    }))
  }, [guardados])

  const actualizar = (id, cambio) =>
    setGuardados(proyectos.map((p) => (p.id === id ? { ...p, ...cambio(p), actualizado: Date.now() } : p)))

  const guardar = (datos) => {
    if (datos.id) return actualizar(datos.id, () => datos)
    const numero = Math.max(0, ...proyectos.map((p) => p.numero)) + 1
    setGuardados([...proyectos, { ...datos, id: crypto.randomUUID(), numero, comentarios: [], creado: Date.now() }])
  }

  // Añade varios proyectos de golpe (p. ej. importados de Classroom), usando el estado más reciente
  const importar = (lista) => {
    if (!lista.length) return
    setGuardados((previos) => {
      let numero = Math.max(0, ...previos.map((p) => p.numero ?? 0))
      const base = previos.map((p) => (p.numero == null ? { ...p, numero: ++numero } : p))
      const nuevos = lista.map((datos) => ({
        ...datos,
        id: crypto.randomUUID(),
        numero: ++numero,
        comentarios: [],
        creado: Date.now(),
      }))
      return [...base, ...nuevos]
    })
  }

  const editar = (id, campos) => actualizar(id, () => campos)

  const moverA = (id, estado) => {
    const p = proyectos.find((x) => x.id === id)
    if (p && p.estado !== estado) actualizar(id, () => ({ estado }))
  }

  const borrar = (id) => setGuardados(proyectos.filter((p) => p.id !== id))

  // Los comentarios anónimos no guardan quién es el autor real y no se pueden editar ni borrar
  const comentar = (id, texto, anonimo = false) =>
    actualizar(id, (p) => ({
      comentarios: [
        ...(p.comentarios ?? []),
        anonimo
          ? { id: crypto.randomUUID(), anonimo: true, autorNombre: idAnonimo(usuario), texto, fecha: Date.now() }
          : { id: crypto.randomUUID(), autorId: usuario.id, autorNombre: usuario.nombre, texto, fecha: Date.now() },
      ],
    }))

  const borrarComentario = (id, comentarioId) =>
    actualizar(id, (p) => ({
      comentarios: (p.comentarios ?? []).filter((c) => c.id !== comentarioId || c.anonimo),
    }))

  return { proyectos, guardar, importar, editar, moverA, borrar, comentar, borrarComentario }
}
