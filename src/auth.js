// Autenticación con Supabase Auth. Cada usuario tiene un perfil (nombre, rol, tema, Classroom).
// Solo el owner crea, elimina o cambia contraseñas, a través de la Edge Function "admin-usuarios".
import { supabase } from './supabase'

export const esOwner = (usuario) => usuario?.rol === 'owner'

async function cargarPerfil(user) {
  const { data, error } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (error || !data) throw new Error('No se encontró el perfil de este usuario')
  return { ...data, email: data.email ?? user.email }
}

/** Usuario de la sesión actual (o null) */
export async function usuarioActual() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  try {
    return await cargarPerfil(data.session.user)
  } catch {
    return null
  }
}

export async function iniciarSesion(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new Error(/invalid/i.test(error.message) ? 'Correo o contraseña incorrectos' : error.message)
  return cargarPerfil(data.user)
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
}

export async function actualizarPerfil(id, campos) {
  const { error } = await supabase.from('perfiles').update(campos).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------- Gestión de usuarios (solo owner) ----------

export async function listarUsuarios() {
  const { data, error } = await supabase.from('perfiles').select('id, email, nombre, rol, creado').order('creado')
  if (error) throw new Error(error.message)
  return data
}

async function admin(cuerpo) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: cuerpo })
  if (error) {
    // El mensaje real viene en el cuerpo de la respuesta
    let mensaje = error.message
    try {
      mensaje = (await error.context.json()).error ?? mensaje
    } catch {
      /* sin cuerpo */
    }
    throw new Error(mensaje)
  }
  return data
}

export const crearUsuario = ({ nombre, email, password }) => admin({ accion: 'crear', nombre, email, password })
export const cambiarPassword = (id, password) => admin({ accion: 'password', id, password })
export const eliminarUsuario = (id) => admin({ accion: 'eliminar', id })

export const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
