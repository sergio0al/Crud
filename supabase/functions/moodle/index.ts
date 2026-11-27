// Edge Function "moodle": guarda el enlace de exportación del calendario de Moodle en el servidor
// y lo usa para traer las entregas. El enlace (y su authtoken) nunca se envía al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ZONA = 'Europe/Madrid'

// ---------- Lectura del formato iCal (.ics) ----------
function leerIcs(texto: string) {
  // Las líneas largas se parten en varias que empiezan por espacio o tabulador
  const lineas = texto.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const eventos: Record<string, string>[] = []
  let ev: Record<string, string> | null = null
  for (const l of lineas) {
    if (l === 'BEGIN:VEVENT') ev = {}
    else if (l === 'END:VEVENT') {
      if (ev) eventos.push(ev)
      ev = null
    } else if (ev) {
      const i = l.indexOf(':')
      if (i > 0) ev[l.slice(0, i).split(';')[0].toUpperCase()] = l.slice(i + 1)
    }
  }
  return eventos
}

const desescapar = (v = '') => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

/** DTSTART → { fecha: 'AAAA-MM-DD', hora: 'HH:mm' | null, ts } en hora de España */
function leerFecha(valor = '') {
  const m = valor.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/)
  if (!m) return null
  const [, a, mes, d, h, min, s, z] = m
  if (!h) return { fecha: `${a}-${mes}-${d}`, hora: null, ts: Date.UTC(+a, +mes - 1, +d) / 1000 }
  const fechaUtc = z ? new Date(Date.UTC(+a, +mes - 1, +d, +h, +min, +s)) : new Date(+a, +mes - 1, +d, +h, +min, +s)
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(fechaUtc)
      .map((p) => [p.type, p.value]),
  )
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}`.replace(/^24/, '00'), ts: Math.floor(fechaUtc.getTime() / 1000) }
}

// "Venciment de X", "Vencimiento de X", "X is due"... → "X"
const limpiarTitulo = (t: string) =>
  t
    .replace(/^(venciment de|vencimiento de|fecha de entrega de|data de lliurament de|due:?)\s+/i, '')
    .replace(/\s+(is due|ha de lliurar-se|vence)$/i, '')
    .trim()

// Eventos que no son entregas (apertura de una actividad)
const NO_ES_ENTREGA = /^(obertura|apertura|s'obre|se abre|opens?)\b/i

function aTareas(texto: string, urlCalendario: string) {
  const base = urlCalendario.split('/calendar/')[0]
  return leerIcs(texto)
    .filter((e) => e.UID && e.SUMMARY && !NO_ES_ENTREGA.test(desescapar(e.SUMMARY)))
    .map((e) => {
      const f = leerFecha(e.DTSTART)
      return {
        id: e.UID,
        titulo: limpiarTitulo(desescapar(e.SUMMARY)) || 'Tarea de Moodle',
        curso: desescapar(e.CATEGORIES),
        entrega: f?.fecha ?? null,
        hora: f?.hora ?? null,
        texto: desescapar(e.DESCRIPTION).slice(0, 2000),
        enlace: e.URL ? desescapar(e.URL) : f ? `${base}/calendar/view.php?view=day&time=${f.ts}` : base,
      }
    })
    .filter((t) => t.entrega)
}

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
    const { data } = await admin.from('moodle_privado').select('url').eq('user_id', userId).maybeSingle()
    return data?.url as string | undefined
  }

  switch (cuerpo.accion) {
    case 'estado':
      return responder({ configurado: Boolean(await leerUrl()) })

    case 'guardar': {
      const url = (cuerpo.url ?? '').trim()
      if (!/^https:\/\/.+\/calendar\/export_execute\.php\?/.test(url))
        return responder({ error: 'Pega el enlace de "Exportar calendario" de Moodle (contiene /calendar/export_execute.php).' }, 400)
      if (!/[?&]authtoken=/.test(url)) return responder({ error: 'Al enlace le falta el authtoken.' }, 400)
      // Comprobar que funciona antes de guardarlo
      try {
        const r = await fetch(url)
        const texto = await r.text()
        if (!r.ok || !texto.includes('BEGIN:VCALENDAR')) throw new Error()
      } catch {
        return responder({ error: 'Moodle no devolvió un calendario con ese enlace. Revisa que esté completo.' }, 400)
      }
      const { error } = await admin.from('moodle_privado').upsert({ user_id: userId, url })
      if (error) return responder({ error: error.message }, 400)
      return responder({ configurado: true })
    }

    case 'borrar':
      await admin.from('moodle_privado').delete().eq('user_id', userId)
      return responder({ configurado: false })

    case 'sincronizar': {
      const url = await leerUrl()
      if (!url) return responder({ error: 'Moodle no está conectado' }, 400)
      let texto: string
      try {
        const r = await fetch(url)
        texto = await r.text()
        if (!r.ok || !texto.includes('BEGIN:VCALENDAR')) throw new Error()
      } catch {
        return responder({ error: 'No se pudo leer el calendario de Moodle. Puede que el enlace haya caducado.' }, 502)
      }

      const tareas = aTareas(texto, url)
      const { data: ya } = await admin.from('moodle_importados').select('uid').eq('user_id', userId)
      const importados = new Set((ya ?? []).map((f) => f.uid))
      const nuevas = tareas.filter((t) => !importados.has(t.id))
      if (nuevas.length) {
        const { error } = await admin
          .from('moodle_importados')
          .upsert(nuevas.map((t) => ({ user_id: userId, uid: t.id })), { onConflict: 'user_id,uid', ignoreDuplicates: true })
        if (error) return responder({ error: error.message }, 400)
      }
      // "fechas" sirve para actualizar la entrega si el profesor la cambia en Moodle
      return responder({ total: tareas.length, nuevas, fechas: tareas.map((t) => ({ id: t.id, entrega: t.entrega })) })
    }

    default:
      return responder({ error: 'Acción desconocida' }, 400)
  }
})
