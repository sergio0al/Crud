// Edge Function "github": guarda el token personal de GitHub del usuario en el servidor
// y crea un repositorio para una entrega. El token nunca se envía al navegador.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const API = 'https://api.github.com'

async function github(token: string, ruta: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gestion-proyectos',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const datos = await res.json().catch(() => ({}))
  return { res, datos }
}

// "Lliurament exercici 17 Arrays" + "ASIX2_0376 ..." → "asix2-0376-lliurament-exercici-17-arrays"
function nombreRepo(titulo: string, asignatura: string) {
  const limpiar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const codigo = (asignatura.trim().split(/\s+/)[0] ?? '').match(/^[A-Za-z]*\d[\w.-]*$/) ? asignatura.trim().split(/\s+/)[0] : ''
  return limpiar(`${codigo} ${titulo}`).slice(0, 80).replace(/-+$/, '') || 'entrega'
}

// "https://github.com/ana/mi-repo" o "ana/mi-repo" → "ana/mi-repo" (null si no es válido)
function repoDe(valor: unknown) {
  const r = String(valor ?? '')
    .trim()
    .replace(/^https:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r) ? r : null
}

const base64 = (texto: string) => {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: quien, error: errQuien } = await admin.auth.getUser(jwt)
  if (errQuien || !quien?.user) return responder({ error: 'Sesión no válida' }, 401)
  const userId = quien.user.id

  let cuerpo: Record<string, string>
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'Petición no válida' }, 400)
  }

  const leer = async () => {
    const { data } = await admin.from('github_privado').select('token, cuenta').eq('user_id', userId).maybeSingle()
    return data as { token: string; cuenta: string } | null
  }

  switch (cuerpo.accion) {
    case 'estado': {
      const fila = await leer()
      return responder({ configurado: Boolean(fila), cuenta: fila?.cuenta ?? '' })
    }

    // En la app el campo se llama "url" para todas las integraciones; aquí es el token
    case 'guardar': {
      const token = (cuerpo.url ?? '').trim()
      if (!/^(ghp_|github_pat_)[A-Za-z0-9_]+$/.test(token))
        return responder({ error: 'Pega un token personal de GitHub (empieza por ghp_ o github_pat_).' }, 400)
      const { res, datos } = await github(token, '/user')
      if (res.status === 401) return responder({ error: 'GitHub no acepta ese token. ¿Lo has copiado entero? ¿Ha caducado?' }, 400)
      if (!res.ok) return responder({ error: datos.message ?? `GitHub respondió ${res.status}` }, 400)
      // Token clásico: debe tener permiso "repo" (o "public_repo")
      const permisos = res.headers.get('x-oauth-scopes')
      if (permisos !== null && !/\b(repo|public_repo)\b/.test(permisos))
        return responder({ error: 'Al token le falta el permiso "repo". Créalo de nuevo marcando "repo".' }, 400)
      const { error } = await admin.from('github_privado').upsert({ user_id: userId, token, cuenta: datos.login ?? '' })
      if (error) return responder({ error: error.message }, 400)
      return responder({ configurado: true, cuenta: datos.login ?? '' })
    }

    case 'borrar':
      await admin.from('github_privado').delete().eq('user_id', userId)
      return responder({ configurado: false })

    case 'crearRepositorio': {
      const fila = await leer()
      if (!fila) return responder({ error: 'Conecta GitHub para poder crear repositorios' }, 400)
      const titulo = String(cuerpo.titulo ?? '').slice(0, 200) || 'Entrega'
      const asignatura = String(cuerpo.asignatura ?? '').slice(0, 200)
      const fecha = String(cuerpo.fecha ?? '').slice(0, 20)
      const descripcion = String(cuerpo.descripcion ?? '').slice(0, 3000)
      const base = nombreRepo(titulo, asignatura)

      // Si el nombre ya existe en la cuenta, se prueba con -2, -3...
      let repo: any = null
      for (let i = 1; i <= 8 && !repo; i++) {
        const nombre = i === 1 ? base : `${base}-${i}`
        const { res, datos } = await github(fila.token, '/user/repos', {
          method: 'POST',
          body: JSON.stringify({
            name: nombre,
            description: [titulo, asignatura].filter(Boolean).join(' · ').slice(0, 350),
            private: true,
            auto_init: false,
          }),
        })
        if (res.ok) repo = datos
        else if (res.status === 422 && JSON.stringify(datos).includes('already exists')) continue
        else if (res.status === 401) return responder({ error: 'GitHub ya no acepta tu token. Vuelve a conectarlo.' }, 400)
        else if (res.status === 403) return responder({ error: 'Tu token no tiene permiso para crear repositorios.' }, 400)
        else return responder({ error: datos.message ?? `GitHub respondió ${res.status}` }, 400)
      }
      if (!repo) return responder({ error: 'Ya existen repositorios con ese nombre. Cambia el título de la tarea.' }, 400)

      // README con los datos de la entrega (si falla, el repositorio sigue creado)
      const readme = [
        `# ${titulo}`,
        '',
        asignatura && `**Asignatura:** ${asignatura}  `,
        fecha && `**Entrega:** ${fecha}  `,
        '',
        descripcion,
      ]
        .filter((l) => l !== false && l !== undefined)
        .join('\n')
        .trim()
      await github(fila.token, `/repos/${repo.full_name}/contents/README.md`, {
        method: 'PUT',
        body: JSON.stringify({ message: 'Crear README de la entrega', content: base64(readme + '\n') }),
      })

      return responder({ url: repo.html_url, nombre: repo.full_name })
    }

    // Panel "Desarrollo" de una tarea: ramas, últimos commits y pull requests de su repositorio
    case 'desarrollo': {
      const fila = await leer()
      if (!fila) return responder({ error: 'Conecta GitHub para ver el desarrollo' }, 400)
      const repo = repoDe(cuerpo.repo)
      if (!repo) return responder({ error: 'El enlace del repositorio no es válido' }, 400)

      const [info, ramas, commits, pulls] = await Promise.all([
        github(fila.token, `/repos/${repo}`),
        github(fila.token, `/repos/${repo}/branches?per_page=50`),
        github(fila.token, `/repos/${repo}/commits?per_page=8`),
        github(fila.token, `/repos/${repo}/pulls?state=all&per_page=15&sort=updated&direction=desc`),
      ])
      if (info.res.status === 401) return responder({ error: 'GitHub ya no acepta tu token. Vuelve a conectarlo.' }, 400)
      if (info.res.status === 404)
        return responder({ error: 'No encuentro el repositorio, o tu cuenta de GitHub no tiene acceso a él.' }, 400)
      if (!info.res.ok) return responder({ error: info.datos.message ?? `GitHub respondió ${info.res.status}` }, 400)

      const lista = (r: { res: Response; datos: any }) => (r.res.ok && Array.isArray(r.datos) ? r.datos : [])
      return responder({
        repo: { nombre: info.datos.full_name, url: info.datos.html_url, principal: info.datos.default_branch },
        ramas: lista(ramas).map((b: any) => ({ nombre: b.name })),
        commits: lista(commits).map((c: any) => ({
          sha: c.sha,
          mensaje: String(c.commit?.message ?? '').split('\n')[0],
          autor: c.author?.login ?? c.commit?.author?.name ?? '',
          fecha: c.commit?.author?.date ?? null,
          url: c.html_url,
        })),
        pulls: lista(pulls).map((p: any) => ({
          numero: p.number,
          titulo: p.title,
          estado: p.merged_at ? 'merged' : p.draft && p.state === 'open' ? 'draft' : p.state, // open | closed | merged | draft
          rama: p.head?.ref ?? '',
          autor: p.user?.login ?? '',
          fecha: p.updated_at,
          url: p.html_url,
        })),
      })
    }

    // Crea una rama desde la rama principal del repositorio
    case 'crearRama': {
      const fila = await leer()
      if (!fila) return responder({ error: 'Conecta GitHub para crear ramas' }, 400)
      const repo = repoDe(cuerpo.repo)
      if (!repo) return responder({ error: 'El enlace del repositorio no es válido' }, 400)
      const nombre = String(cuerpo.nombre ?? '').trim()
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(nombre) || nombre.includes('..') || nombre.endsWith('/') || nombre.endsWith('.lock'))
        return responder({ error: 'Nombre de rama no válido: usa letras, números, guiones y barras.' }, 400)

      const info = await github(fila.token, `/repos/${repo}`)
      if (!info.res.ok) return responder({ error: 'No encuentro el repositorio, o tu cuenta de GitHub no tiene acceso a él.' }, 400)
      const principal = info.datos.default_branch
      const ref = await github(fila.token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(principal)}`)
      if (!ref.res.ok) return responder({ error: 'El repositorio está vacío: haz el primer commit antes de crear ramas.' }, 400)

      const { res, datos } = await github(fila.token, `/repos/${repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${nombre}`, sha: ref.datos.object.sha }),
      })
      if (res.status === 422) return responder({ error: 'Ya existe una rama con ese nombre.' }, 400)
      if (res.status === 403 || res.status === 404) return responder({ error: 'Tu token no tiene permiso para crear ramas en este repositorio.' }, 400)
      if (!res.ok) return responder({ error: datos.message ?? `GitHub respondió ${res.status}` }, 400)
      return responder({ nombre, url: `${info.datos.html_url}/tree/${nombre}` })
    }

    default:
      return responder({ error: 'Acción desconocida' }, 400)
  }
})
