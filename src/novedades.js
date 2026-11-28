// Historial de actualizaciones de la app (lo más nuevo primero).
// Para añadir una novedad: ponla arriba del todo con la fecha del día y un id nuevo.
// tipo: 'nuevo' | 'mejora' | 'cambio' | 'quitado'

export const NOVEDADES = [
  {
    id: 24,
    fecha: '2026-11-28',
    tipo: 'nuevo',
    titulo: 'Notificaciones por correo',
    texto:
      'En Configuración → Notificaciones, cada tipo de aviso tiene ahora un interruptor “Correo”. Lo que actives te llega también a tu correo, agrupado en un solo mensaje cada pocos minutos. Hay un botón para enviarte un correo de prueba.',
  },
  {
    id: 23,
    fecha: '2026-11-28',
    tipo: 'mejora',
    titulo: 'Elige qué notificaciones ver',
    texto:
      'En Configuración → Notificaciones puedes activar o desactivar cada tipo de aviso (Classroom, Moodle, tablas compartidas, asignaciones, cambios de estado, comentarios y entregas) y decidir si ver también lo que haces tú.',
  },
  {
    id: 22,
    fecha: '2026-11-28',
    tipo: 'nuevo',
    titulo: 'Novedades',
    texto: 'Esta misma sección: aquí verás todo lo que va cambiando en Sarflow. Un punto en el menú te avisa cuando hay algo nuevo.',
  },
  {
    id: 21,
    fecha: '2026-11-28',
    tipo: 'nuevo',
    titulo: 'Panel de Desarrollo en cada tarea',
    texto:
      'Las tareas con repositorio de GitHub muestran sus ramas, últimos commits y pull requests (con su estado: MERGED, OPEN…). Puedes crear una rama desde la tarea y copiar los comandos de git listos para usar.',
  },
  {
    id: 20,
    fecha: '2026-11-28',
    tipo: 'mejora',
    titulo: 'Vincular un repositorio que ya existe',
    texto: 'Además de crear un repositorio nuevo, ahora puedes pegar el enlace de uno que ya tengas en GitHub.',
  },
  {
    id: 19,
    fecha: '2026-11-28',
    tipo: 'nuevo',
    titulo: 'Asignar tareas a una persona del equipo',
    texto:
      'En las tablas compartidas cada tarea tiene un campo “Asignado a”. La tarjeta muestra las iniciales de quién la tiene y te llega una notificación cuando te asignan algo.',
  },
  {
    id: 18,
    fecha: '2026-11-28',
    tipo: 'nuevo',
    titulo: 'Notificaciones en el resumen',
    texto:
      'Tareas nuevas de Classroom, Moodle y tus tablas compartidas, cambios de estado, comentarios de otras personas y entregas para hoy o mañana. Con contador de nuevas y “Marcar leídas”.',
  },
  {
    id: 17,
    fecha: '2026-11-28',
    tipo: 'mejora',
    titulo: 'Resumen a pantalla completa',
    texto: 'El resumen aprovecha todo el ancho y el alto de la pantalla en ordenador.',
  },
  {
    id: 16,
    fecha: '2026-11-28',
    tipo: 'mejora',
    titulo: 'Empezar una tarea al crear su documento o repositorio',
    texto: 'Si una tarea está en Por hacer y le creas un documento, una hoja, una presentación o un repositorio, pasa sola a En curso.',
  },
  {
    id: 15,
    fecha: '2026-11-27',
    tipo: 'mejora',
    titulo: 'Las entregas de Classroom pasan solas a Hecho',
    texto: 'Cuando entregas una tarea en Google Classroom, en Sarflow se mueve sola a Hecho.',
  },
  {
    id: 14,
    fecha: '2026-11-27',
    tipo: 'nuevo',
    titulo: 'Documento, hoja de cálculo o presentación',
    texto: 'Al crear el archivo de Google de una tarea puedes elegir el tipo. Se guarda en tu Drive, en la carpeta Proyectos.',
  },
  {
    id: 13,
    fecha: '2026-11-27',
    tipo: 'nuevo',
    titulo: 'Repositorio de GitHub por entrega',
    texto: 'Conecta tu cuenta de GitHub y crea con un clic un repositorio privado para cada tarea, con un README con sus datos.',
  },
  {
    id: 12,
    fecha: '2026-11-27',
    tipo: 'quitado',
    titulo: 'Documentos de Word (Office 365)',
    texto: 'Se probó crear documentos de Word en OneDrive para cada tarea, pero se retiró para quedarnos con Google.',
  },
  {
    id: 11,
    fecha: '2026-11-27',
    tipo: 'nuevo',
    titulo: 'Tablas compartidas',
    texto: 'Crea tablas para trabajar en grupo, invita a otras personas y ved los cambios de los demás al momento.',
  },
  {
    id: 10,
    fecha: '2026-11-27',
    tipo: 'cambio',
    titulo: 'Nuevo nombre y logo: Sarflow',
    texto: 'La app estrena nombre e imagen.',
  },
  {
    id: 9,
    fecha: '2026-11-27',
    tipo: 'mejora',
    titulo: 'Enlaces de la tarea a mano',
    texto: 'El documento de Google y el enlace a Classroom o Moodle aparecen como tarjetas en cada tarea.',
  },
  {
    id: 8,
    fecha: '2026-11-27',
    tipo: 'nuevo',
    titulo: 'Asignaturas',
    texto: 'Cada tarea puede tener su asignatura, con un color propio, y el tablero se puede filtrar por ella.',
  },
  {
    id: 7,
    fecha: '2026-11-27',
    tipo: 'nuevo',
    titulo: 'Integración con Moodle',
    texto: 'Conecta el calendario de Moodle y cada entrega se convierte en una tarea. Si el profesor cambia la fecha, se actualiza sola.',
  },
  {
    id: 6,
    fecha: '2026-11-26',
    tipo: 'mejora',
    titulo: 'Arrastrar tareas en cualquier dispositivo',
    texto: 'Mueve las tarjetas entre columnas con el ratón, el dedo o el trackpad. En el móvil también puedes moverlas desde su menú.',
  },
  {
    id: 5,
    fecha: '2026-11-26',
    tipo: 'nuevo',
    titulo: 'Cuentas de usuario',
    texto: 'Cada persona tiene su cuenta y su tablero privado, guardado en la nube para verlo desde cualquier dispositivo.',
  },
  {
    id: 4,
    fecha: '2026-11-26',
    tipo: 'nuevo',
    titulo: 'Configuración y temas',
    texto: 'Personaliza los colores de la app desde Configuración.',
  },
  {
    id: 3,
    fecha: '2026-11-26',
    tipo: 'nuevo',
    titulo: 'Comentarios en las tareas',
    texto: 'Añade notas y comentarios a cada tarea.',
  },
  {
    id: 2,
    fecha: '2026-11-26',
    tipo: 'nuevo',
    titulo: 'Tareas de Google Classroom',
    texto: 'Las tareas que publican tus profesores en Classroom llegan solas al tablero.',
  },
  {
    id: 1,
    fecha: '2026-11-26',
    tipo: 'nuevo',
    titulo: 'Primera versión',
    texto: 'Tablero de proyectos por columnas (Por hacer, En curso, En revisión, Pruebas y Hecho), con prioridades y fechas de entrega.',
  },
]

export const ULTIMA_NOVEDAD = NOVEDADES[0].id

// Última novedad que ha visto cada usuario (para el punto del menú)
const claveVista = (usuarioId) => `novedades_vista_${usuarioId}`
export const leerNovedadVista = (usuarioId) => Number(localStorage.getItem(claveVista(usuarioId)) || 0)
export const marcarNovedadesVistas = (usuarioId) => localStorage.setItem(claveVista(usuarioId), String(ULTIMA_NOVEDAD))
