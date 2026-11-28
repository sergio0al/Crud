// Tipos de notificación del resumen y qué quiere recibir cada usuario.
// Las preferencias se guardan en el perfil, junto al tema (usuario.tema.notificaciones),
// para que sean las mismas en cualquier dispositivo.

export const TIPOS_NOTIFICACION = [
  { clave: 'classroom', titulo: 'Tareas nuevas de Classroom', texto: 'Cuando llega una tarea de Google Classroom.' },
  { clave: 'moodle', titulo: 'Tareas nuevas de Moodle', texto: 'Cuando llega una entrega del calendario de Moodle.' },
  { clave: 'tablas', titulo: 'Tareas nuevas en tablas compartidas', texto: 'Cuando alguien crea una tarea en una de tus tablas.' },
  { clave: 'asignaciones', titulo: 'Tareas que te asignan', texto: 'Cuando alguien te asigna una tarea.' },
  { clave: 'estados', titulo: 'Cambios de estado', texto: 'Cuando una tarea pasa de una columna a otra.' },
  { clave: 'comentarios', titulo: 'Comentarios', texto: 'Cuando otra persona comenta en una tarea.' },
  { clave: 'entregas', titulo: 'Entregas para hoy o mañana', texto: 'Recordatorio de lo que vence pronto.' },
]

// Además de los tipos: ¿mostrar también lo que hago yo? (mover mis tareas, crear tareas en tablas…)
export const PREFERENCIAS_INICIALES = {
  ...Object.fromEntries(TIPOS_NOTIFICACION.map((t) => [t.clave, true])),
  propias: true,
}

export const preferenciasDe = (usuario) => ({ ...PREFERENCIAS_INICIALES, ...(usuario?.tema?.notificaciones ?? {}) })
