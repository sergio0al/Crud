// Integración con Google Classroom a través de un script de Google Apps Script
// que lee los correos de "Nueva tarea" (ver CLASSROOM.md).
//
// Seguridad: la URL del script (con su token) se guarda SOLO en el servidor (tabla classroom_privado)
// y la usa la Edge Function "classroom". El navegador nunca la recibe: solo pide las tareas.
import { supabase } from './supabase'

const CLAVE_ULTIMA = 'classroom_ultima'

export const CREADOR_CLASSROOM = 'classroom'

export const ultimaSincronizacion = () => Number(localStorage.getItem(CLAVE_ULTIMA)) || null

async function llamar(cuerpo) {
  const { data, error } = await supabase.functions.invoke('classroom', { body: cuerpo })
  if (error) {
    let mensaje = 'No se pudo contactar con el servidor de Classroom'
    try {
      mensaje = (await error.context.json()).error ?? mensaje
    } catch {
      /* sin cuerpo */
    }
    throw new Error(mensaje)
  }
  return data
}

/** ¿Tiene el usuario Classroom conectado? (sin revelar la URL) */
export const estadoClassroom = async () => (await llamar({ accion: 'estado' })).configurado
export const guardarUrl = async (url) => (await llamar({ accion: 'guardar', url })).configurado
export const desconectar = async () => (await llamar({ accion: 'borrar' })).configurado

const diasHasta = (iso) => Math.ceil((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000)

export function aProyecto(t) {
  const fecha = t.entrega || t.recibido.slice(0, 10)
  const fechaLegible = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const descripcion = [
    [
      t.curso && `**Curso:** ${t.curso}`,
      t.profesor && `**Profesor:** ${t.profesor}`,
      t.entrega && `**Entrega:** ${fechaLegible(t.entrega)}`,
    ]
      .filter(Boolean)
      .join('\n'),
    t.texto,
  ]
    .filter(Boolean)
    .join('\n\n')
  return {
    titulo: t.titulo || 'Tarea de Classroom',
    descripcion,
    fecha,
    estado: 'por_hacer',
    prioridad: t.entrega && diasHasta(t.entrega) <= 2 ? 'alta' : 'media',
    origen: { tipo: 'classroom', id: t.id, curso: t.curso || '', enlace: t.enlace || '' },
  }
}

/** Pide al servidor las tareas nuevas (el servidor ya las marca como importadas). */
let ocupado = false

export async function sincronizar() {
  if (ocupado) return null // evita dos sincronizaciones a la vez (y duplicados)
  ocupado = true
  try {
    const { total, nuevas } = await llamar({ accion: 'sincronizar' })
    localStorage.setItem(CLAVE_ULTIMA, String(Date.now()))
    return { total, nuevas: nuevas.map(aProyecto) }
  } finally {
    ocupado = false
  }
}
