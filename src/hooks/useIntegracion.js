import { useCallback, useEffect, useRef, useState } from 'react'
import { INTEGRACIONES, desconectar, estadoIntegracion, guardarUrl, sincronizar, ultimaSincronizacion } from '../integraciones'

const CADA_MINUTOS = 5

/**
 * Sincroniza una integración (Classroom o Moodle) al abrir la app y cada pocos minutos.
 * El enlace nunca llega al navegador: solo sabemos si está "conectado" o no.
 * - `activo` evita importar antes de tener cargados (y migrados) los proyectos.
 * - `onFechas` recibe [{ id, entrega }] para actualizar fechas que hayan cambiado (Moodle).
 */
export function useIntegracion(clave, importar, activo, onFechas) {
  const info = INTEGRACIONES[clave]
  const [conectado, setConectado] = useState(null) // null = comprobando
  const [estado, setEstado] = useState({ cargando: false, error: '', ultima: ultimaSincronizacion(clave) })
  const [aviso, setAviso] = useState(null)
  const callbacks = useRef({ importar, onFechas })
  useEffect(() => {
    callbacks.current = { importar, onFechas }
  })

  useEffect(() => {
    estadoIntegracion(clave)
      .then(setConectado)
      .catch((err) => {
        setConectado(false)
        setEstado((e) => ({ ...e, error: err.message }))
      })
  }, [clave])

  /** Envía el enlace al servidor (se guarda allí, no en el navegador) */
  const conectar = async (url) => {
    setConectado(await guardarUrl(clave, url))
    setEstado((e) => ({ ...e, error: '' }))
  }

  const quitar = async () => {
    setConectado(await desconectar(clave))
    setEstado((e) => ({ ...e, error: '' }))
  }

  const sincronizarAhora = useCallback(
    async (silencioso = false) => {
      if (!conectado) return
      setEstado((e) => ({ ...e, cargando: true, error: '' }))
      try {
        const resultado = await sincronizar(clave)
        if (!resultado) return // ya había una sincronización en marcha
        await callbacks.current.importar(resultado.nuevas)
        if (resultado.fechas.length) callbacks.current.onFechas?.(clave, resultado.fechas)
        setEstado({ cargando: false, error: '', ultima: Date.now() })
        const n = resultado.nuevas.length
        if (n) setAviso(`${n} ${n === 1 ? 'tarea nueva' : 'tareas nuevas'} de ${info.corto}`)
        else if (!silencioso) setAviso(`No hay tareas nuevas en ${info.corto}`)
      } catch (err) {
        setEstado((e) => ({ ...e, cargando: false, error: err.message }))
        if (!silencioso) setAviso(err.message)
      }
    },
    [conectado, clave, info.corto],
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

  const estadoTexto = !conectado ? 'desconectado' : estado.error ? 'error' : 'conectado'
  return { clave, info, conectado: Boolean(conectado), estadoTexto, conectar, quitar, ...estado, sincronizarAhora, aviso }
}
