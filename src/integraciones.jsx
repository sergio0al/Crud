// Integraciones que crean proyectos automáticamente: Google Classroom y Moodle.
//
// Seguridad: el enlace de cada usuario (con su token) se guarda SOLO en el servidor (tablas *_privado)
// y lo usa la Edge Function correspondiente. El navegador nunca lo recibe: solo pide las tareas nuevas.
import { supabase } from './supabase'
import { IconoClassroom, IconoGithub, IconoMoodle } from './components/Iconos'

const diasHasta = (iso) => Math.ceil((new Date(iso + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 86400000)
const fechaLegible = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

const descripcionDe = (lineas, texto) =>
  [lineas.filter(Boolean).join('\n'), texto].filter(Boolean).join('\n\n')

export const INTEGRACIONES = {
  classroom: {
    clave: 'classroom',
    nombre: 'Google Classroom',
    corto: 'Classroom',
    Icono: IconoClassroom,
    color: 'bg-success/10 text-success', // etiqueta en tarjetas y panel
    descripcion: 'Cada correo de “Nueva tarea” se convierte en un proyecto en Por hacer.',
    etiquetaUrl: 'URL del script (aplicación web)',
    placeholder: 'https://script.google.com/macros/s/.../exec?token=TU_CLAVE',
    validar: (url) =>
      !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)
        ? 'La URL debe ser la de la aplicación web de Google Apps Script (https://script.google.com/...).'
        : !/[?&]token=/.test(url)
          ? 'Falta el token al final de la URL: ...?token=TU_CLAVE'
          : null,
    guia: [
      'Abre script.google.com con la cuenta donde te llegan los correos de Classroom.',
      'Crea un proyecto nuevo y pega el contenido de google-apps-script/Classroom.gs.',
      'Cambia TOKEN por una clave tuya.',
      'Ejecuta la función probar y acepta los permisos de Gmail.',
      'Implementar → Nueva implementación → Aplicación web. Ejecutar como: Yo. Acceso: Cualquier usuario.',
      'Copia la URL, añade ?token=TU_CLAVE al final y pégala aquí.',
    ],
    aProyecto: (t) => ({
      titulo: t.titulo || 'Tarea de Classroom',
      descripcion: descripcionDe(
        [
          t.curso && `**Curso:** ${t.curso}`,
          t.profesor && `**Profesor:** ${t.profesor}`,
          t.entrega && `**Entrega:** ${fechaLegible(t.entrega)}`,
        ],
        t.texto,
      ),
      fecha: t.entrega || t.recibido.slice(0, 10),
      estado: 'por_hacer',
      prioridad: t.entrega && diasHasta(t.entrega) <= 2 ? 'alta' : 'media',
      asignatura: t.curso || '',
      origen: { tipo: 'classroom', id: t.id, curso: t.curso || '', enlace: t.enlace || '' },
    }),
  },

  moodle: {
    clave: 'moodle',
    nombre: 'Moodle',
    corto: 'Moodle',
    Icono: IconoMoodle,
    color: 'bg-warning/10 text-warning',
    descripcion: 'Cada entrega del calendario de Moodle se convierte en un proyecto en Por hacer.',
    etiquetaUrl: 'Enlace de exportación del calendario',
    placeholder: 'https://.../moodle/calendar/export_execute.php?userid=...&authtoken=...',
    validar: (url) =>
      !/^https:\/\/.+\/calendar\/export_execute\.php\?/.test(url)
        ? 'Pega el enlace de “Exportar calendario” de Moodle (contiene /calendar/export_execute.php).'
        : !/[?&]authtoken=/.test(url)
          ? 'Al enlace le falta el authtoken.'
          : null,
    guia: [
      'Entra en tu Moodle y abre el Calendario.',
      'Pulsa “Importar o exportar calendarios” → “Exportar calendario”.',
      'En “Eventos a exportar” elige Todos (o Eventos de cursos); en “Periodo”, Recientes y próximos.',
      'Pulsa “Obtener URL del calendario” y copia el enlace.',
      'Pégalo aquí y pulsa Conectar.',
    ],
    aProyecto: (t) => ({
      titulo: t.titulo || 'Tarea de Moodle',
      descripcion: descripcionDe(
        [
          t.curso && `**Curso:** ${t.curso}`,
          t.entrega && `**Entrega:** ${fechaLegible(t.entrega)}${t.hora ? `, ${t.hora}` : ''}`,
        ],
        t.texto && t.texto !== t.titulo ? t.texto : '',
      ),
      fecha: t.entrega,
      estado: 'por_hacer',
      prioridad: diasHasta(t.entrega) <= 2 ? 'alta' : 'media',
      asignatura: t.curso || '',
      origen: { tipo: 'moodle', id: t.id, curso: t.curso || '', enlace: t.enlace || '' },
    }),
  },
}

/** Integraciones que no traen tareas, solo sirven de herramienta (GitHub: crear repositorios) */
export const HERRAMIENTAS = {
  github: {
    clave: 'github',
    nombre: 'GitHub',
    corto: 'GitHub',
    Icono: IconoGithub,
    color: 'bg-base-content/10 text-base-content',
    importa: false, // no crea proyectos: solo se usa para crear el repositorio de una entrega
    secreto: true, // el campo es un token: se escribe oculto
    descripcion: 'Crea un repositorio privado en tu GitHub para cada entrega, con un botón en la tarea.',
    etiquetaUrl: 'Token personal de GitHub',
    placeholder: 'ghp_... o github_pat_...',
    validar: (token) =>
      !/^(ghp_|github_pat_)[A-Za-z0-9_]+$/.test(token) ? 'El token de GitHub empieza por ghp_ o github_pat_.' : null,
    guia: [
      'Entra en github.com con tu cuenta → foto de perfil → Settings → Developer settings.',
      'Personal access tokens → Tokens (classic) → Generate new token (classic).',
      'Ponle un nombre (por ejemplo "Gestión de proyectos"), elige la caducidad y marca el permiso "repo".',
      'Pulsa Generate token, copia el token (empieza por ghp_) y pégalo aquí.',
    ],
  },
}
const TODAS = { ...INTEGRACIONES, ...HERRAMIENTAS }

/** Datos de la integración de la que viene un proyecto (o undefined si se creó a mano) */
export const integracionDe = (proyecto) => INTEGRACIONES[proyecto?.origen?.tipo]

// ---------- Llamadas a la Edge Function de cada integración ----------

async function llamar(clave, cuerpo) {
  const { data, error } = await supabase.functions.invoke(clave, { body: cuerpo })
  if (error) {
    let mensaje = `No se pudo contactar con el servidor de ${TODAS[clave].corto}`
    try {
      mensaje = (await error.context.json()).error ?? mensaje
    } catch {
      /* sin cuerpo */
    }
    throw new Error(mensaje)
  }
  return data
}

export const ultimaSincronizacion = (clave) => Number(localStorage.getItem(`${clave}_ultima`)) || null
export const estadoIntegracion = async (clave) => (await llamar(clave, { accion: 'estado' })).configurado
export const guardarUrl = async (clave, url) => (await llamar(clave, { accion: 'guardar', url })).configurado
export const desconectar = async (clave) => (await llamar(clave, { accion: 'borrar' })).configurado

/** Crea un Google Doc para una tarea (con el script de Classroom) y devuelve su enlace */
export const crearDocumento = async ({ titulo, asignatura, fecha }) =>
  (await llamar('classroom', { accion: 'crearDocumento', titulo, asignatura, fecha })).url

/** Crea un repositorio privado en el GitHub del usuario para una entrega y devuelve su enlace */
export const crearRepositorio = async ({ titulo, asignatura, fecha, descripcion }) =>
  (await llamar('github', { accion: 'crearRepositorio', titulo, asignatura, fecha, descripcion })).url

const ocupado = {}

/** Pide al servidor las tareas nuevas (el servidor ya las marca como importadas). */
export async function sincronizar(clave) {
  if (ocupado[clave]) return null // evita dos sincronizaciones a la vez (y duplicados)
  ocupado[clave] = true
  try {
    const { total, nuevas, fechas } = await llamar(clave, { accion: 'sincronizar' })
    localStorage.setItem(`${clave}_ultima`, String(Date.now()))
    return { total, nuevas: nuevas.map(INTEGRACIONES[clave].aProyecto), fechas: fechas ?? [] }
  } finally {
    ocupado[clave] = false
  }
}
