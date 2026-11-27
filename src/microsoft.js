// Office 365 (Microsoft): conectar la cuenta (del cole o personal) y crear documentos de Word en OneDrive.
// El token de Microsoft se queda en el servidor (Edge Function "microsoft"); aquí solo sabemos si está conectado.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

async function llamar(cuerpo) {
  const { data, error } = await supabase.functions.invoke('microsoft', { body: cuerpo })
  if (error) {
    let mensaje = 'No se pudo contactar con el servidor de Microsoft'
    try {
      mensaje = (await error.context.json()).error ?? mensaje
    } catch {
      /* sin cuerpo */
    }
    throw new Error(mensaje)
  }
  return data
}

/** Crea un documento de Word en OneDrive (carpeta Proyectos) y devuelve su enlace */
export const crearDocumentoWord = async ({ titulo, asignatura, fecha }) =>
  (await llamar({ accion: 'crearDocumento', titulo, asignatura, fecha })).url

/** Estado de la conexión con Microsoft. Al volver del inicio de sesión lee ?microsoft=ok|error de la URL. */
export function useMicrosoft() {
  const [estado, setEstado] = useState({ conectado: null, cuenta: '' }) // null = comprobando
  const [aviso, setAviso] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const vuelta = params.get('microsoft')
    if (!vuelta) return null
    window.history.replaceState(null, '', window.location.pathname)
    return vuelta === 'ok' ? 'Cuenta de Microsoft conectada' : params.get('motivo') || 'No se pudo conectar con Microsoft'
  })

  useEffect(() => {
    llamar({ accion: 'estado' })
      .then(({ configurado, cuenta }) => setEstado({ conectado: configurado, cuenta }))
      .catch(() => setEstado({ conectado: false, cuenta: '' }))
  }, [])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 6000)
    return () => clearTimeout(id)
  }, [aviso])

  /** Lleva a la página de inicio de sesión de Microsoft; al terminar vuelve a la app */
  const conectar = async () => {
    const { url } = await llamar({ accion: 'conectar', volver: window.location.origin })
    window.location.href = url
  }

  const quitar = async () => {
    await llamar({ accion: 'borrar' })
    setEstado({ conectado: false, cuenta: '' })
  }

  return { conectado: Boolean(estado.conectado), comprobando: estado.conectado === null, cuenta: estado.cuenta, conectar, quitar, aviso }
}
