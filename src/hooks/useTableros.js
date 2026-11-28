import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const mensaje = (error) => error.message?.replace(/^.*?exception:\s*/i, '') ?? String(error)
const comprobar = ({ error }) => {
  if (error) throw new Error(mensaje(error))
}

/**
 * Tablas compartidas de las que el usuario es miembro.
 * Se actualizan solas si alguien te añade, te quita o renombra una tabla.
 */
export function useTableros(usuarioId) {
  const [tableros, setTableros] = useState([])
  const [disponible, setDisponible] = useState(true) // false si aún no se ejecutó compartidos.sql

  const cargar = useCallback(async () => {
    const [{ data, error }, { data: gente }] = await Promise.all([
      supabase.from('tableros').select('id, nombre, creador, creado, tablero_miembros(user_id, rol)').order('creado'),
      supabase.rpc('companeros'), // nombres de las personas de mis tablas
    ])
    const nombres = new Map((gente ?? []).map((g) => [g.id, g.nombre]))
    if (error) {
      setDisponible(false)
      setTableros([])
      return
    }
    setDisponible(true)
    setTableros(
      data.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        miembros: t.tablero_miembros.length,
        // Personas de la tabla (para asignarles tareas)
        personas: t.tablero_miembros
          .map((m) => ({ id: m.user_id, nombre: nombres.get(m.user_id) ?? 'Usuario' }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        soyPropietario: t.tablero_miembros.some((m) => m.user_id === usuarioId && m.rol === 'propietario'),
      })),
    )
  }, [usuarioId])

  useEffect(() => {
    cargar()
    let espera
    const recargar = () => {
      clearTimeout(espera)
      espera = setTimeout(cargar, 400)
    }
    const canal = supabase
      .channel(`tableros-${usuarioId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tableros' }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tablero_miembros' }, recargar)
      .subscribe()
    return () => {
      clearTimeout(espera)
      supabase.removeChannel(canal)
    }
  }, [cargar, usuarioId])

  const crear = async (nombre) => {
    const { data, error } = await supabase.rpc('crear_tablero', { nombre })
    if (error) throw new Error(mensaje(error))
    await cargar()
    return data
  }

  const renombrar = async (id, nombre) => {
    comprobar(await supabase.from('tableros').update({ nombre: nombre.trim() }).eq('id', id))
    await cargar()
  }

  const eliminar = async (id) => {
    comprobar(await supabase.from('tableros').delete().eq('id', id))
    await cargar()
  }

  const salir = async (id) => {
    comprobar(await supabase.from('tablero_miembros').delete().eq('tablero_id', id).eq('user_id', usuarioId))
    await cargar()
  }

  const miembros = async (id) => {
    const { data, error } = await supabase.rpc('miembros_tablero', { t: id })
    if (error) throw new Error(mensaje(error))
    return data
  }

  const invitar = async (id, correo) => {
    comprobar(await supabase.rpc('invitar_a_tablero', { t: id, correo }))
    await cargar()
  }

  const quitar = async (id, userId) => {
    comprobar(await supabase.from('tablero_miembros').delete().eq('tablero_id', id).eq('user_id', userId))
    await cargar()
  }

  return { tableros, disponible, crear, renombrar, eliminar, salir, miembros, invitar, quitar }
}
