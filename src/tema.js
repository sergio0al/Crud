// Personalización del tema (se guarda en localStorage y se aplica con variables CSS de daisyUI)
const CLAVE = 'tema'

export const COLORES = [
  { nombre: 'Bosque', valor: '#1f3d2b' },
  { nombre: 'Esmeralda', valor: '#059669' },
  { nombre: 'Turquesa', valor: '#0d9488' },
  { nombre: 'Azul', valor: '#2563eb' },
  { nombre: 'Índigo', valor: '#4f46e5' },
  { nombre: 'Morado', valor: '#7c3aed' },
  { nombre: 'Rosa', valor: '#db2777' },
  { nombre: 'Rojo', valor: '#dc2626' },
  { nombre: 'Naranja', valor: '#ea580c' },
  { nombre: 'Ámbar', valor: '#d97706' },
  { nombre: 'Grafito', valor: '#1c1d1a' },
]

export const ESQUINAS = {
  rectas: { selector: '0.125rem', field: '0.125rem', box: '0.25rem' },
  suaves: { selector: '0.5rem', field: '0.5rem', box: '0.75rem' },
  redondas: { selector: '1rem', field: '1.5rem', box: '1.25rem' },
}

export const TEMA_INICIAL = { modo: 'claro', color: null, esquinas: 'suaves' } // color null = el del tema

export function cargarTema() {
  try {
    return { ...TEMA_INICIAL, ...JSON.parse(localStorage.getItem(CLAVE)) }
  } catch {
    return { ...TEMA_INICIAL }
  }
}

export function guardarTema(tema) {
  localStorage.setItem(CLAVE, JSON.stringify(tema))
  aplicarTema(tema)
}

const oscuroSistema = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

/** Negro o blanco, lo que se lea mejor sobre el color dado */
export function colorContraste(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminancia = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminancia > 0.4 ? '#111111' : '#ffffff'
}

export const esHex = (v) => /^#[0-9a-f]{6}$/i.test(v)

export function aplicarTema(tema = cargarTema()) {
  const raiz = document.documentElement
  const oscuro = tema.modo === 'oscuro' || (tema.modo === 'sistema' && oscuroSistema())
  raiz.dataset.theme = oscuro ? 'oscuro' : 'sobrio'

  if (tema.color && esHex(tema.color)) {
    raiz.style.setProperty('--color-primary', tema.color)
    raiz.style.setProperty('--color-primary-content', colorContraste(tema.color))
  } else {
    raiz.style.removeProperty('--color-primary')
    raiz.style.removeProperty('--color-primary-content')
  }

  const r = ESQUINAS[tema.esquinas] ?? ESQUINAS.suaves
  raiz.style.setProperty('--radius-selector', r.selector)
  raiz.style.setProperty('--radius-field', r.field)
  raiz.style.setProperty('--radius-box', r.box)
}

// Si el modo es "sistema", seguir los cambios del sistema operativo
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (cargarTema().modo === 'sistema') aplicarTema()
})
