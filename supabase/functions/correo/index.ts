// Edge Function "correo": envía las notificaciones que esperan en la cola (correos_pendientes)
// desde el Gmail del owner, a través de su script de Google (el mismo de Classroom, acción "correo").
// - accion "enviar": la llama la tarea programada cada 2 minutos (con el secreto de correo_config).
//   Agrupa lo pendiente por persona y manda un solo correo a cada una.
// - accion "prueba": la llama un usuario desde Configuración para recibir un correo de prueba.
// Necesita que el owner tenga Classroom conectado con la versión del script que incluye doPost.
// Se despliega SIN "Verify JWT": la propia función comprueba el secreto o la sesión del usuario.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Envía un correo con el script de Google del owner (sale de su Gmail con el nombre "Sarflow")
async function enviarCorreo(urlScript: string | null, para: { email: string; nombre: string }, asunto: string, html: string) {
  if (!urlScript) throw new Error('El owner no tiene conectado el script de Google (Classroom)')
  let datos: { enviado?: boolean; error?: string }
  try {
    const r = await fetch(urlScript, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: 'correo', para: para.email, asunto, html, texto: asunto }),
    })
    datos = await r.json()
  } catch {
    throw new Error('El script de Google no respondió. ¿Has publicado la versión nueva del script?')
  }
  if (datos.error) throw new Error(datos.error)
  if (!datos.enviado) throw new Error('El script no confirmó el envío. Publica la versión nueva de Classroom.gs.')
}

// Plantilla sencilla: lista de avisos y botón para abrir la app
function plantilla(nombre: string, avisos: { titulo: string; texto: string }[], appUrl: string | null) {
  const filas = avisos
    .map(
      (a) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e4">
        <div style="font-size:14px;font-weight:600;color:#1c1d1a">${escapar(a.titulo)}</div>
        <div style="font-size:13px;color:#5c5d58;margin-top:2px">${escapar(a.texto)}</div></td></tr>`,
    )
    .join('')
  const boton = appUrl
    ? `<p style="margin:24px 0 0"><a href="${escapar(appUrl)}" style="background:#1f3d2b;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;display:inline-block">Abrir Sarflow</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:24px">
      <div style="font-size:18px;font-weight:700;color:#1c1d1a">Sarflow</div>
      <p style="font-size:14px;color:#1c1d1a;margin:16px 0 4px">Hola${nombre ? ` ${escapar(nombre)}` : ''}, tienes ${avisos.length === 1 ? 'una novedad' : `${avisos.length} novedades`}:</p>
      <table style="width:100%;border-collapse:collapse">${filas}</table>
      ${boton}
    </div>
    <p style="font-size:11px;color:#8a8b86;text-align:center;margin-top:16px">Puedes elegir qué avisos te llegan por correo en Sarflow → Configuración → Notificaciones.</p>
  </div></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let cuerpo: Record<string, string>
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'Petición no válida' }, 400)
  }

  // Script de Google del owner (de su conexión con Classroom)
  const urlScript = async () => {
    const { data: owner } = await admin.from('perfiles').select('id').eq('rol', 'owner').limit(1).maybeSingle()
    if (!owner) return null
    const { data } = await admin.from('classroom_privado').select('url').eq('user_id', owner.id).maybeSingle()
    return (data?.url as string | undefined) ?? null
  }

  const config = async (clave: string) =>
    ((await admin.from('correo_config').select('valor').eq('clave', clave).maybeSingle()).data?.valor as string | undefined) ?? null

  // ---------- Correo de prueba para el usuario que lo pide ----------
  if (cuerpo.accion === 'prueba') {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: quien, error } = await admin.auth.getUser(jwt)
    if (error || !quien?.user) return responder({ error: 'Sesión no válida' }, 401)
    // Se recuerda la dirección de la app para poner el botón "Abrir Sarflow" en los correos
    const app = String(cuerpo.app ?? '')
    if (/^https:\/\/[\w.-]+(:\d+)?$/.test(app)) await admin.from('correo_config').upsert({ clave: 'app_url', valor: app })
    const { data: perfil } = await admin.from('perfiles').select('email, nombre').eq('id', quien.user.id).single()
    try {
      await enviarCorreo(
        await urlScript(),
        { email: perfil?.email ?? quien.user.email!, nombre: perfil?.nombre ?? '' },
        'Sarflow: correo de prueba',
        plantilla(perfil?.nombre ?? '', [{ titulo: 'Correo de prueba', texto: 'Si lees esto, las notificaciones por correo funcionan.' }], await config('app_url')),
      )
    } catch (err) {
      return responder({ error: (err as Error).message }, 400)
    }
    return responder({ enviado: true, email: perfil?.email ?? quien.user.email })
  }

  // ---------- Envío de la cola (tarea programada) ----------
  if (cuerpo.accion === 'enviar') {
    const secreto = await config('secreto')
    if (!secreto || cuerpo.secreto !== secreto) return responder({ error: 'No autorizado' }, 401)

    const { data: pendientes, error } = await admin
      .from('correos_pendientes')
      .select('id, destinatario, texto, intentos, proyectos(titulo)')
      .is('enviado_en', null)
      .lt('intentos', 3)
      .order('creado')
      .limit(500)
    if (error) return responder({ error: error.message }, 400)
    if (!pendientes?.length) return responder({ enviados: 0 })

    const porPersona = new Map<string, typeof pendientes>()
    for (const p of pendientes) porPersona.set(p.destinatario, [...(porPersona.get(p.destinatario) ?? []), p])

    const { data: perfiles } = await admin.from('perfiles').select('id, email, nombre').in('id', [...porPersona.keys()])
    const appUrl = await config('app_url')
    const script = await urlScript()
    let enviados = 0

    for (const [persona, avisos] of porPersona) {
      const perfil = perfiles?.find((x) => x.id === persona)
      const ids = avisos.map((a) => a.id)
      if (!perfil?.email) {
        await admin.from('correos_pendientes').update({ intentos: 3, error: 'Sin correo' }).in('id', ids)
        continue
      }
      const lista = avisos.map((a: any) => ({ titulo: a.proyectos?.titulo ?? 'Tarea', texto: a.texto }))
      const asunto = lista.length === 1 ? `Sarflow: ${lista[0].titulo}` : `Sarflow: ${lista.length} novedades`
      try {
        await enviarCorreo(script, { email: perfil.email, nombre: perfil.nombre ?? '' }, asunto, plantilla(perfil.nombre ?? '', lista, appUrl))
        await admin.from('correos_pendientes').update({ enviado_en: new Date().toISOString(), error: null }).in('id', ids)
        enviados++
      } catch (err) {
        // Se reintenta en la próxima vuelta (hasta 3 veces)
        for (const a of avisos)
          await admin.from('correos_pendientes').update({ intentos: a.intentos + 1, error: (err as Error).message.slice(0, 300) }).eq('id', a.id)
      }
    }
    return responder({ enviados })
  }

  return responder({ error: 'Acción desconocida' }, 400)
})
