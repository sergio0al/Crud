// Edge Function "classroom": guarda la URL del script de Classroom en el servidor y la usa para traer las tareas.
// La URL (y su token) nunca se envía al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const URL_VALIDA = /^https:\/\/script\.google(usercontent)?\.com\//

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: quien, error: errQuien } = await admin.auth.getUser(token)
  if (errQuien || !quien?.user) return responder({ error: 'Sesión no válida' }, 401)
  const userId = quien.user.id

  let cuerpo: Record<string, string>
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'Petición no válida' }, 400)
  }

  const leerUrl = async () => {
    const { data } = await admin.from('classroom_privado').select('url').eq('user_id', userId).maybeSingle()
    return data?.url as string | undefined
  }

  switch (cuerpo.accion) {
    case 'estado':
      return responder({ configurado: Boolean(await leerUrl()) })

    case 'guardar': {
      const url = (cuerpo.url ?? '').trim()
      if (!URL_VALIDA.test(url))
        return responder({ error: 'La URL debe ser la de la aplicación web de Google Apps Script (https://script.google.com/...).' }, 400)
      if (!/[?&]token=/.test(url)) return responder({ error: 'Falta el token al final de la URL: ...?token=TU_CLAVE' }, 400)
      const { error } = await admin.from('classroom_privado').upsert({ user_id: userId, url })
      if (error) return responder({ error: error.message }, 400)
      return responder({ configurado: true })
    }

    case 'borrar': {
      await admin.from('classroom_privado').delete().eq('user_id', userId)
      return responder({ configurado: false })
    }

    case 'sincronizar': {
      const url = await leerUrl()
      if (!url) return responder({ error: 'Classroom no está conectado' }, 400)

      let datos: { tareas?: Array<{ id: string }>; entregadas?: Array<Record<string, string>> | null; error?: string }
      try {
        const r = await fetch(url, { redirect: 'follow' })
        datos = await r.json()
      } catch {
        return responder({ error: 'No se pudo leer el script. Revisa que esté publicado para "Cualquier usuario".' }, 502)
      }
      if (datos.error) return responder({ error: datos.error }, 400)

      const tareas = (datos.tareas ?? []).filter((t) => t?.id)
      const { data: ya } = await admin.from('classroom_importados').select('mensaje_id').eq('user_id', userId)
      const importados = new Set((ya ?? []).map((f) => f.mensaje_id))
      const nuevas = tareas.filter((t) => !importados.has(t.id))

      if (nuevas.length) {
        const { error } = await admin
          .from('classroom_importados')
          .upsert(nuevas.map((t) => ({ user_id: userId, mensaje_id: t.id })), { onConflict: 'user_id,mensaje_id', ignoreDuplicates: true })
        if (error) return responder({ error: error.message }, 400)
      }
      // Tareas entregadas en Classroom (solo si el script tiene activado el servicio de Classroom)
      const entregadas = Array.isArray(datos.entregadas)
        ? datos.entregadas.slice(0, 1000).map((e) => ({
            titulo: String(e?.titulo ?? '').slice(0, 300),
            curso: String(e?.curso ?? '').slice(0, 300),
            enlace: String(e?.enlace ?? '').slice(0, 500),
          }))
        : []
      return responder({ total: tareas.length, nuevas, entregadas })
    }

    // Crea un Google Doc para una tarea con el mismo script de Classroom (en la cuenta de Google del usuario)
    case 'crearDocumento': {
      const url = await leerUrl()
      if (!url) return responder({ error: 'Conecta Classroom para poder crear documentos de Google' }, 400)
      const destino = new URL(url)
      destino.searchParams.set('accion', 'crearDoc')
      destino.searchParams.set('titulo', String(cuerpo.titulo ?? '').slice(0, 200))
      destino.searchParams.set('asignatura', String(cuerpo.asignatura ?? '').slice(0, 200))
      destino.searchParams.set('fecha', String(cuerpo.fecha ?? '').slice(0, 20))
      // Tipo de archivo: documento (Docs), hoja (Sheets) o presentacion (Slides)
      destino.searchParams.set('tipo', ['hoja', 'presentacion'].includes(cuerpo.tipo) ? cuerpo.tipo : 'documento')

      let datos: { url?: string; error?: string }
      try {
        const r = await fetch(destino, { redirect: 'follow' })
        datos = await r.json()
      } catch {
        return responder({ error: 'El script de Google no respondió. ¿Has publicado la versión nueva del script?' }, 502)
      }
      if (datos.error) return responder({ error: datos.error }, 400)
      if (!datos.url?.startsWith('https://docs.google.com/'))
        return responder({ error: 'El script no devolvió un documento. Publica la versión nueva de Classroom.gs.' }, 502)
      return responder({ url: datos.url })
    }

    default:
      return responder({ error: 'Acción desconocida' }, 400)
  }
})
