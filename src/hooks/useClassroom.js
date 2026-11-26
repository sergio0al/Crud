import { useCallback, useEffect, useRef, useState } from 'react'
import { obtenerUrl, sincronizar, ultimaSincronizacion } from '../classroom'

const CADA_MINUTOS = 5

/** Sincroniza las tareas de Classroom al abrir la app y cada pocos minutos. */
export function useClassroom(importar) {
  const [url, setUrl] = useState(obtenerUrl)
  const [estado, setEstado] = useState({ cargando: false, error: '', ultima: ultimaSincronizacion() })
  const [aviso, setAviso] = useState(null) // texto del aviso emergente
  const importarRef = useRef(importar)
  useEffect(() => {
    importarRef.current = importar
  })

  const sincronizarAhora = useCallback(
    async (silencioso = false) => {
      if (!url) return
      setEstado((e) => ({ ...e, cargando: true, error: '' }))
      try {
        const resultado = await sincronizar(url)
        if (!resultado) return // ya había una sincronización en marcha
        importarRef.current(resultado.nuevas)
        setEstado({ cargando: false, error: '', ultima: Date.now() })
        const n = resultado.nuevas.length
        if (n) setAviso(`${n} ${n === 1 ? 'tarea nueva' : 'tareas nuevas'} de Classroom`)
        else if (!silencioso) setAviso('No hay tareas nuevas en Classroom')
      } catch (err) {
        setEstado((e) => ({ ...e, cargando: false, error: err.message }))
        if (!silencioso) setAviso(err.message)
      }
    },
    [url],
  )

  useEffect(() => {
    if (!url) return
    sincronizarAhora(true)
    const id = setInterval(() => sincronizarAhora(true), CADA_MINUTOS * 60000)
    return () => clearInterval(id)
  }, [url, sincronizarAhora])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(id)
  }, [aviso])

  return { url, setUrl, ...estado, sincronizarAhora, aviso }
}
