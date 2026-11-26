// Autenticación simple en localStorage (contraseñas en texto plano, solo para demo)
const CLAVE_USUARIOS = 'usuarios'
const CLAVE_SESION = 'sesion'

const USUARIO_INICIAL = { id: 'admin', nombre: 'Alonso', email: 'hola@alonso.com', password: '1234' }

const leer = (clave, defecto) => {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? defecto
  } catch {
    return defecto
  }
}

export function obtenerUsuarios() {
  const usuarios = leer(CLAVE_USUARIOS, [])
  if (!usuarios.some((u) => u.email === USUARIO_INICIAL.email)) {
    usuarios.unshift(USUARIO_INICIAL)
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios))
  }
  return usuarios
}

export function usuarioActual() {
  const id = localStorage.getItem(CLAVE_SESION)
  return obtenerUsuarios().find((u) => u.id === id) ?? null
}

export function iniciarSesion(email, password) {
  const usuario = obtenerUsuarios().find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!usuario || usuario.password !== password) throw new Error('Correo o contraseña incorrectos')
  localStorage.setItem(CLAVE_SESION, usuario.id)
  return usuario
}

export function registrar({ nombre, email, password }) {
  const usuarios = obtenerUsuarios()
  email = email.trim().toLowerCase()
  if (!nombre.trim()) throw new Error('El nombre es obligatorio')
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El correo no es válido')
  if (password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres')
  if (usuarios.some((u) => u.email.toLowerCase() === email)) throw new Error('Ya existe una cuenta con ese correo')
  const usuario = { id: crypto.randomUUID(), nombre: nombre.trim(), email, password }
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify([...usuarios, usuario]))
  localStorage.setItem(CLAVE_SESION, usuario.id)
  return usuario
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

export const iniciales = (nombre = '') =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

// Id anónimo fijo por persona (p. ej. "anonimo1234"), para comentar sin mostrar el nombre
const CLAVE_ANONIMOS = 'anonimos'

export function idAnonimo(usuario) {
  const anonimos = leer(CLAVE_ANONIMOS, {})
  if (anonimos[usuario.id]) return anonimos[usuario.id]
  const usados = new Set(Object.values(anonimos))
  let id
  do id = `anonimo${Math.floor(1000 + Math.random() * 9000)}`
  while (usados.has(id))
  localStorage.setItem(CLAVE_ANONIMOS, JSON.stringify({ ...anonimos, [usuario.id]: id }))
  return id
}
