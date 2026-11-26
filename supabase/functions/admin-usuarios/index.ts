// Edge Function "admin-usuarios": solo el owner puede crear, eliminar o cambiar la contraseña de usuarios.
// La clave de servicio (SUPABASE_SERVICE_ROLE_KEY) solo existe aquí, en el servidor de Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ¿Quién llama? Debe ser el owner
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: quien, error: errQuien } = await admin.auth.getUser(token)
  if (errQuien || !quien?.user) return responder({ error: 'Sesión no válida' }, 401)
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', quien.user.id).single()
  if (perfil?.rol !== 'owner') return responder({ error: 'Solo el owner puede gestionar usuarios' }, 403)

  let cuerpo: Record<string, string>
  try {
    cuerpo = await req.json()
  } catch {
    return responder({ error: 'Petición no válida' }, 400)
  }
  const { accion } = cuerpo

  if (accion === 'crear') {
    const nombre = (cuerpo.nombre ?? '').trim()
    const email = (cuerpo.email ?? '').trim().toLowerCase()
    const password = cuerpo.password ?? ''
    if (!nombre) return responder({ error: 'El nombre es obligatorio' }, 400)
    if (!/^\S+@\S+\.\S+$/.test(email)) return responder({ error: 'El correo no es válido' }, 400)
    if (password.length < 6) return responder({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })
    if (error) {
      const yaExiste = /already|registered|exists/i.test(error.message)
      return responder({ error: yaExiste ? 'Ya existe una cuenta con ese correo' : error.message }, 400)
    }
    return responder({ id: data.user.id, email })
  }

  if (accion === 'password') {
    if ((cuerpo.password ?? '').length < 6)
      return responder({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)
    const { error } = await admin.auth.admin.updateUserById(cuerpo.id, { password: cuerpo.password })
    if (error) return responder({ error: error.message }, 400)
    return responder({ ok: true })
  }

  if (accion === 'eliminar') {
    const { data: objetivo } = await admin.from('perfiles').select('rol').eq('id', cuerpo.id).single()
    if (objetivo?.rol === 'owner') return responder({ error: 'No se puede eliminar al owner' }, 400)
    const { error } = await admin.auth.admin.deleteUser(cuerpo.id) // borra también sus proyectos (cascade)
    if (error) return responder({ error: error.message }, 400)
    return responder({ ok: true })
  }

  return responder({ error: 'Acción desconocida' }, 400)
})
