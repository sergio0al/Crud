export const ESTADOS = [
  { value: 'por_hacer', label: 'Por hacer', badge: 'badge-neutral', borde: 'border-t-neutral' },
  { value: 'en_curso', label: 'En curso', badge: 'badge-info', borde: 'border-t-info' },
  { value: 'en_revision', label: 'En revisión', badge: 'badge-warning', borde: 'border-t-warning' },
  { value: 'pruebas', label: 'Pruebas', badge: 'badge-secondary', borde: 'border-t-secondary' },
  { value: 'hecho', label: 'Hecho', badge: 'badge-success', borde: 'border-t-success' },
]

export const PRIORIDADES = [
  { value: 'baja', label: 'Baja', badge: 'badge-ghost' },
  { value: 'media', label: 'Media', badge: 'badge-accent' },
  { value: 'alta', label: 'Alta', badge: 'badge-error' },
]

// Convierte los estados de la versión anterior a los nuevos
const ESTADOS_ANTIGUOS = { abierto: 'por_hacer', en_proceso: 'en_curso', cerrado: 'hecho' }

export const migrarEstado = (estado) =>
  ESTADOS_ANTIGUOS[estado] ?? (ESTADOS.some((e) => e.value === estado) ? estado : 'por_hacer')

export const findOption = (list, value) => list.find((o) => o.value === value) ?? list[0]
