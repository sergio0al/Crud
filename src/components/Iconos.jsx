const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IconoBuscar = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)

export const IconoFiltro = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
)

export const IconoOrden = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></svg>
)

export const IconoTablero = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></svg>
)

export const IconoMas = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)

export const IconoPuntos = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
)

export const IconoTarea = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="m8 12 3 3 5-6" /></svg>
)

export const IconoCheck = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="m5 12 5 5 9-10" /></svg>
)

export const IconoCalendario = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
)

// Prioridad: alta (dos flechas arriba, rojo), media (=, naranja), baja (flecha abajo, azul)
export const IconoPrioridad = ({ prioridad, ...p }) => {
  if (prioridad === 'alta')
    return (
      <svg viewBox="0 0 24 24" {...base} strokeWidth={2.4} className="size-4 text-error" {...p}>
        <path d="m6 13 6-5 6 5M6 19l6-5 6 5" />
      </svg>
    )
  if (prioridad === 'baja')
    return (
      <svg viewBox="0 0 24 24" {...base} strokeWidth={2.4} className="size-4 text-info" {...p}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" {...base} strokeWidth={2.4} className="size-4 text-warning" {...p}>
      <path d="M5 9h14M5 15h14" />
    </svg>
  )
}

export const IconoComentario = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" /></svg>
)

export const IconoCasa = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" /></svg>
)

export const IconoSalir = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" /></svg>
)

export const IconoCarpeta = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
)

export const IconoReloj = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
)


export const IconoPorcentaje = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></svg>
)

export const IconoGrafico = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
)

export const IconoCerrar = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
)

export const IconoFlecha = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

// Logo de Sarflow: columnas de tablero que crecen y un check encima (usa el color principal del tema)
export const IconoLogo = (p) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
    <g fill="var(--color-primary-content)" opacity=".3">
      <rect x="7" y="18" width="4.6" height="7" rx="2.3" />
      <rect x="13.7" y="14" width="4.6" height="11" rx="2.3" />
      <rect x="20.4" y="10" width="4.6" height="15" rx="2.3" />
    </g>
    <path d="M8.5 15.5 13.5 20 24 8.5" fill="none" stroke="var(--color-primary-content)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const IconoGithub = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
)

export const IconoMoodle = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" /></svg>
)

export const IconoClassroom = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><circle cx="12" cy="9.5" r="2" /><path d="M8.5 14.5a3.5 3.5 0 0 1 7 0M8 21h8M12 17v4" /></svg>
)

export const IconoEnlace = (p) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
)

export const IconoAjustes = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
)

export const IconoUsuarios = (p) => (
  <svg viewBox="0 0 24 24" {...base} strokeWidth={1.7} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></svg>
)
