// Edge Function "microsoft": conecta la cuenta de Microsoft (Office 365 del cole o personal) y crea
// documentos de Word en su OneDrive, en la carpeta "Proyectos".
// El token de Microsoft se guarda SOLO en el servidor (tabla microsoft_privado); el navegador nunca lo ve.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets): MS_CLIENT_ID y MS_CLIENT_SECRET.
// Esta función se despliega con "Verify JWT" desactivado, porque Microsoft vuelve aquí sin sesión (GET);
// las peticiones POST comprueban la sesión del usuario a mano.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'npm:docx@9'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const CLIENT_ID = Deno.env.get('MS_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('MS_CLIENT_SECRET') ?? ''
const REDIRECT = `${Deno.env.get('SUPABASE_URL')}/functions/v1/microsoft`
// "common": vale tanto para cuentas del cole/trabajo como para cuentas personales (outlook, hotmail…)
const LOGIN = 'https://login.microsoftonline.com/common/oauth2/v2.0'
const PERMISOS = 'offline_access User.Read Files.ReadWrite'
// A dónde se puede volver después de iniciar sesión (la propia app)
const ORIGEN_VALIDO = /^(https:\/\/[a-z0-9-]+\.vercel\.app|http:\/\/localhost(:\d+)?)$/

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function pedirToken(campos: Record<string, string>) {
  const res = await fetch(`${LOGIN}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, scope: PERMISOS, ...campos }),
  })
  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error_description?.split('\r\n')[0] ?? 'Microsoft no ha aceptado el inicio de sesión')
  return datos as { access_token: string; refresh_token?: string }
}

const volverA = (volver: string, params: Record<string, string>) =>
  Response.redirect(`${volver}/?${new URLSearchParams(params)}`, 302)

// ---------- Vuelta desde el inicio de sesión de Microsoft (GET) ----------
async function alVolver(url: URL) {
  const estado = url.searchParams.get('state') ?? ''
  const { data: pendiente } = await admin.from('microsoft_estados').select('*').eq('estado', estado).maybeSingle()
  if (!pendiente) return new Response('El inicio de sesión ha caducado. Vuelve a Sarflow y conéctate otra vez.', { status: 400 })
  await admin.from('microsoft_estados').delete().eq('estado', estado)
  if (Date.now() - new Date(pendiente.creado).getTime() > 10 * 60000)
    return volverA(pendiente.volver, { microsoft: 'error', motivo: 'El inicio de sesión ha caducado, inténtalo otra vez.' })

  const fallo = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (fallo) {
    const motivo = /AADSTS(65001|90094|90008)/.test(fallo)
      ? 'Tu centro no permite conectar apps externas: pide al administrador de Office 365 que la autorice.'
      : /access_denied/.test(url.searchParams.get('error') ?? '')
        ? 'Has cancelado el inicio de sesión.'
        : fallo.split('\r\n')[0].slice(0, 200)
    return volverA(pendiente.volver, { microsoft: 'error', motivo })
  }

  try {
    const tokens = await pedirToken({ grant_type: 'authorization_code', code: url.searchParams.get('code') ?? '' })
    const yo = await (await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json()
    await admin.from('microsoft_privado').upsert({
      user_id: pendiente.user_id,
      refresh_token: tokens.refresh_token,
      cuenta: yo.mail ?? yo.userPrincipalName ?? '',
    })
    return volverA(pendiente.volver, { microsoft: 'ok' })
  } catch (err) {
    return volverA(pendiente.volver, { microsoft: 'error', motivo: (err as Error).message.slice(0, 200) })
  }
}

// ---------- Documento de Word ----------
const nombreArchivo = (titulo: string) =>
  (titulo.replace(/[\\/:*?"<>|#%{}~&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Documento') + '.docx'

const fechaLegible = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

async function crearWord(accessToken: string, { titulo, asignatura, fecha }: Record<string, string>) {
  const subtitulo = [asignatura, fecha && `Entrega: ${fechaLegible(fecha)}`].filter(Boolean).join(' · ')
  const doc = new Document({
    creator: 'Sarflow',
    title: titulo,
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(titulo)] }),
          ...(subtitulo ? [new Paragraph({ children: [new TextRun({ text: subtitulo, color: '666666' })] })] : []),
          new Paragraph(''),
        ],
      },
    ],
  })
  const bytes = await Packer.toBuffer(doc)

  const ruta = `Proyectos/${nombreArchivo(titulo)}`.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${ruta}:/content?@microsoft.graph.conflictBehavior=rename`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    body: bytes,
  })
  const datos = await res.json()
  if (!res.ok) throw new Error(datos.error?.message ?? 'OneDrive no ha dejado crear el documento')
  const enlace = String(datos.webUrl ?? '')
  if (!enlace.startsWith('https://')) throw new Error('OneDrive no ha devuelto el enlace del documento')
  // En OneDrive del cole (SharePoint), ?web=1 hace que se abra en Word online en vez de descargarse
  return /sharepoint\.com/.test(enlace) ? `${enlace}${enlace.includes('?') ? '&' : '?'}web=1` : enlace
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method === 'GET') return alVolver(new URL(req.url))
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)
  if (!CLIENT_ID || !CLIENT_SECRET) return responder({ error: 'Falta configurar la app de Microsoft en el servidor (MS_CLIENT_ID y MS_CLIENT_SECRET).' }, 500)

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

  const leer = async () =>
    (await admin.from('microsoft_privado').select('refresh_token, cuenta').eq('user_id', userId).maybeSingle()).data

  switch (cuerpo.accion) {
    case 'estado': {
      const fila = await leer()
      return responder({ configurado: Boolean(fila), cuenta: fila?.cuenta ?? '' })
    }

    case 'conectar': {
      const volver = (cuerpo.volver ?? '').replace(/\/+$/, '')
      if (!ORIGEN_VALIDO.test(volver)) return responder({ error: 'Dirección de vuelta no permitida' }, 400)
      const estado = crypto.randomUUID()
      await admin.from('microsoft_estados').delete().lt('creado', new Date(Date.now() - 10 * 60000).toISOString())
      const { error } = await admin.from('microsoft_estados').insert({ estado, user_id: userId, volver })
      if (error) return responder({ error: 'Falta ejecutar supabase/office.sql en Supabase.' }, 500)
      const url = `${LOGIN}/authorize?${new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT,
        response_mode: 'query',
        scope: PERMISOS,
        state: estado,
        prompt: 'select_account',
      })}`
      return responder({ url })
    }

    case 'borrar':
      await admin.from('microsoft_privado').delete().eq('user_id', userId)
      return responder({ configurado: false })

    case 'crearDocumento': {
      const fila = await leer()
      if (!fila) return responder({ error: 'Conecta tu cuenta de Microsoft para crear documentos de Word.' }, 400)
      const titulo = (cuerpo.titulo ?? '').trim()
      if (!titulo) return responder({ error: 'La tarea no tiene título' }, 400)
      try {
        const tokens = await pedirToken({ grant_type: 'refresh_token', refresh_token: fila.refresh_token })
        if (tokens.refresh_token)
          await admin.from('microsoft_privado').update({ refresh_token: tokens.refresh_token }).eq('user_id', userId)
        const url = await crearWord(tokens.access_token, { titulo, asignatura: cuerpo.asignatura ?? '', fecha: cuerpo.fecha ?? '' })
        return responder({ url })
      } catch (err) {
        return responder({ error: (err as Error).message }, 502)
      }
    }

    default:
      return responder({ error: 'Acción desconocida' }, 400)
  }
})
