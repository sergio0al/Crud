import { useCallback, useEffect, useRef, useState } from 'react'
import { desconectar, estadoClassroom, guardarUrl, sincronizar, ultimaSincronizacion } from '../classroom'

const CADA_MINUTOS = 5

/**
 * Sincroniza las tareas de Classroom del usuario al abrir la app y cada pocos minutos.
 * La URL del script nunca llega al navegador: solo sabemos si está "conectado" o no.
 * `activo` evita importar antes de tener cargados (y migrados) los proyectos.
 */
export function useClassroom(importar, activo) {
  const [conectado, setConectado] = useState(null) // null = comprobando
  const [estado, setEstado] = useState({ cargando: false, error: '', ultima: ultimaSincronizacion() })
  const [aviso, setAviso] = useState(null) // texto del aviso emergente
  const importarRef = useRef(importar)
  useEffect(() => {
    importarRef.current = importar
  })

  useEffect(() => {
    estadoClassroom()
      .then(setConectado)
      .catch((err) => {
        setConectado(false)
        setEstado((e) => ({ ...e, error: err.message }))
      })
  }, [])

  /** Envía la URL al servidor (se guarda allí, no en el navegador) */
  const conectar = async (url) => {
    setConectado(await guardarUrl(url))
    setEstado((e) => ({ ...e, error: '' }))
  }

  const quitar = async () => {
    setConectado(await desconectar())
    setEstado((e) => ({ ...e, error: '' }))
  }

  const sincronizarAhora = useCallback(
    async (silencioso = false) => {
      if (!conectado) return
      setEstado((e) => ({ ...e, cargando: true, error: '' }))
      try {
        const resultado = await sincronizar()
        if (!resultado) return // ya había una sincronización en marcha
        await importarRef.current(resultado.nuevas)
        setEstado({ cargando: false, error: '', ultima: Date.now() })
        const n = resultado.nuevas.length
        if (n) setAviso(`${n} ${n === 1 ? 'tarea nueva' : 'tareas nuevas'} de Classroom`)
        else if (!silencioso) setAviso('No hay tareas nuevas en Classroom')
      } catch (err) {
        setEstado((e) => ({ ...e, cargando: false, error: err.message }))
        if (!silencioso) setAviso(err.message)
      }
    },
    [conectado],
  )

  useEffect(() => {
    if (!conectado || !activo) return
    sincronizarAhora(true)
    const id = setInterval(() => sincronizarAhora(true), CADA_MINUTOS * 60000)
    return () => clearInterval(id)
  }, [conectado, activo, sincronizarAhora])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  return { conectado: Boolean(conectado), conectar, quitar, ...estado, sincronizarAhora, aviso }
}
