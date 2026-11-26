// Integración con Google Classroom a través de un script de Google Apps Script
// que lee los correos de "Nueva tarea" (ver CLASSROOM.md).

const CLAVE_URL = 'classroom_url'
const CLAVE_IMPORTADOS = 'classroom_importados'
const CLAVE_ULTIMA = 'classroom_ultima'

export const CREADOR_CLASSROOM = 'classroom'

export const obtenerUrl = () => localStorage.getItem(CLAVE_URL) || import.meta.env.VITE_CLASSROOM_URL || ''
export const guardarUrl = (url) =>
  url ? localStorage.setItem(CLAVE_URL, url.trim()) : localStorage.removeItem(CLAVE_URL)

export const ultimaSincronizacion = () => Number(localStorage.getItem(CLAVE_ULTIMA)) || null

const importados = () => new Set(JSON.parse(localStorage.getItem(CLAVE_IMPORTADOS) || '[]'))

export async function pedirTareas(url) {
  let respuesta
  try {
    respuesta = await fetch(url)
  } catch {
    throw new Error('No se pudo conectar con el script. Revisa la URL y que esté publicado para "Cualquier persona".')
  }
  if (!respuesta.ok) throw new Error(`El script respondió con error ${respuesta.status}`)
  let datos
  try {
    datos = await respuesta.json()
  } catch {
    throw new Error('La respuesta no es válida. ¿Es la URL de la aplicación web (termina en /exec)?')
  }
  if (datos.error) throw new Error(datos.error)
  return datos.tareas ?? []
}

const diasHasta = (iso) => Math.ceil((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000)

export function aProyecto(t) {
  const fecha = t.entrega || t.recibido.slice(0, 10)
  const descripcion = [t.curso && `**Curso:** ${t.curso}`, t.entrega ? `**Entrega:** ${t.entrega}` : '', t.texto]
    .filter(Boolean)
    .join('\n\n')
  return {
    titulo: t.titulo || 'Tarea de Classroom',
    descripcion,
    fecha,
    estado: 'por_hacer',
    prioridad: t.entrega && diasHasta(t.entrega) <= 2 ? 'alta' : 'media',
    asignadoId: '',
    creadorId: CREADOR_CLASSROOM,
    origen: { tipo: 'classroom', id: t.id, curso: t.curso || '', enlace: t.enlace || '' },
  }
}

/** Descarga las tareas y devuelve solo las que aún no se han importado (también las borradas cuentan como importadas). */
let ocupado = false

export async function sincronizar(url) {
  if (ocupado) return null // evita dos sincronizaciones a la vez (y duplicados)
  ocupado = true
  try {
    return await descargarNuevas(url)
  } finally {
    ocupado = false
  }
}

async function descargarNuevas(url) {
  const tareas = await pedirTareas(url)
  const ya = importados()
  const nuevas = tareas.filter((t) => t.id && !ya.has(t.id))
  nuevas.forEach((t) => ya.add(t.id))
  localStorage.setItem(CLAVE_IMPORTADOS, JSON.stringify([...ya]))
  localStorage.setItem(CLAVE_ULTIMA, String(Date.now()))
  return { total: tareas.length, nuevas: nuevas.map(aProyecto) }
}
