import { useEffect, useMemo, useRef, useState } from 'react'
import { iniciales } from '../auth'
import { ESTADOS, PRIORIDADES } from '../constants'
import { clave } from '../hooks/useProyectos'
import { integracionDe } from '../integraciones'
import { asignaturaDe, colorAsignatura, listarAsignaturas } from '../asignaturas'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
  IconoBuscar,
  IconoCalendario,
  IconoCheck,
  IconoComentario,
  IconoFiltro,
  IconoMas,
  IconoOrden,
  IconoPrioridad,
  IconoPuntos,
} from './Iconos'

const SIN_ASIGNATURA = '__sin__'
const ORDEN_PRIORIDAD ={ alta: 0, media: 1, baja: 2 }
const ORDENES = [
  { value: 'prioridad', label: 'Prioridad' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'titulo', label: 'Título' },
]
const PUNTO = {
  por_hacer: 'bg-base-content/40',
  en_curso: 'bg-info',
  en_revision: 'bg-warning',
  pruebas: 'bg-secondary',
  hecho: 'bg-success',
}

const formatearFecha = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')

const cerrarMenu = () => document.activeElement?.blur()

// Texto corto para la tarjeta: sin marcas de formato ni las líneas de curso/entrega de Classroom
const vistaPrevia = (texto) =>
  texto
    .replace(/\*\*(Curso|Profesor|Entrega):\*\*[^\n]*\n*/g, '')
    .replace(/[*`#]/g, '')
    .trim()

export default function Tablero({ proyectos, busqueda, onBusqueda, buscadorMovil, onMover, onAbrir, onNuevo, onEditar, onBorrar }) {
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [orden, setOrden] = useState('prioridad')
  // 'todas' | SIN_ASIGNATURA | nombre de la asignatura (se recuerda entre visitas)
  const [asignaturaElegida, setFiltroAsignatura] = useLocalStorage('filtro_asignatura', 'todas')
  const asignaturas = useMemo(() => listarAsignaturas(proyectos), [proyectos])
  const sinAsignatura = useMemo(() => proyectos.filter((p) => !asignaturaDe(p)).length, [proyectos])
  // Si la asignatura guardada ya no existe (se renombró o se borraron sus tareas), volver a todas
  const filtroAsignatura =
    asignaturaElegida === SIN_ASIGNATURA || asignaturas.some((a) => a.nombre === asignaturaElegida)
      ? asignaturaElegida
      : 'todas'
  const [arrastrando, setArrastrando] = useState(null) // null | { id, estado }
  const [columnaSobre, setColumnaSobre] = useState(null)
  const scrollRef = useRef(null)
  const [ventana, setVentana] = useState({ inicio: 0, ancho: 1 }) // parte visible del tablero (0 a 1)

  const medir = () => {
    const el = scrollRef.current
    if (el) setVentana({ inicio: el.scrollLeft / el.scrollWidth, ancho: el.clientWidth / el.scrollWidth })
  }

  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  const visibles = useMemo(() => {
    const q = busqueda.toLowerCase()
    return proyectos
      .filter((p) => filtroPrioridad === 'todas' || p.prioridad === filtroPrioridad)
      .filter(
        (p) =>
          filtroAsignatura === 'todas' ||
          (filtroAsignatura === SIN_ASIGNATURA ? !asignaturaDe(p) : asignaturaDe(p) === filtroAsignatura),
      )
      .filter(
        (p) =>
          !q ||
          p.titulo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          asignaturaDe(p).toLowerCase().includes(q) ||
          clave(p).toLowerCase().includes(q),
      )
      .sort((a, b) =>
        orden === 'prioridad'
          ? ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.fecha.localeCompare(b.fecha)
          : orden === 'titulo'
            ? a.titulo.localeCompare(b.titulo)
            : a.fecha.localeCompare(b.fecha),
      )
  }, [proyectos, busqueda, filtroPrioridad, filtroAsignatura, orden])

  // ---------- Arrastrar con eventos de puntero ----------
  // No usa el drag & drop nativo del navegador (falla con pantallas táctiles, algunos trackpads y navegadores
  // integrados). Ratón: se empieza a arrastrar al moverlo unos píxeles. Dedo: manteniendo pulsado un momento.
  const arrastre = useRef(null) // { id, estado, titulo, x0, y0, tipo, activo, temporizador }
  const [fantasma, setFantasma] = useState(null) // { x, y, titulo } tarjeta que sigue al puntero
  const ignorarClick = useRef(false)
  const onMoverRef = useRef(onMover)
  useEffect(() => {
    onMoverRef.current = onMover
  })

  const terminarArrastre = () => {
    const a = arrastre.current
    if (a?.temporizador) clearTimeout(a.temporizador)
    arrastre.current = null
    setArrastrando(null)
    setColumnaSobre(null)
    setFantasma(null)
  }

  const empezarArrastre = (a) => {
    a.activo = true
    setArrastrando({ id: a.id, estado: a.estado })
    setFantasma({ x: a.x, y: a.y, titulo: a.titulo })
    navigator.vibrate?.(15)
  }

  const alPulsarTarjeta = (e, p) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.target.closest('.dropdown')) return // el menú ⋯ no arrastra
    const a = { id: p.id, estado: p.estado, titulo: p.titulo, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, tipo: e.pointerType, activo: false }
    if (e.pointerType !== 'mouse') a.temporizador = setTimeout(() => empezarArrastre(a), 250)
    arrastre.current = a
  }

  useEffect(() => {
    const columnaEn = (x, y) => document.elementFromPoint(x, y)?.closest('[data-estado]')?.dataset.estado ?? null

    const mover = (e) => {
      const a = arrastre.current
      if (!a) return
      a.x = e.clientX
      a.y = e.clientY
      const distancia = Math.hypot(a.x - a.x0, a.y - a.y0)
      if (!a.activo) {
        if (distancia < 6) return
        if (a.tipo === 'mouse') empezarArrastre(a)
        else terminarArrastre() // con el dedo, moverse antes de tiempo es desplazar la página
        return
      }
      setFantasma((f) => (f ? { ...f, x: a.x, y: a.y } : f))
      setColumnaSobre(columnaEn(a.x, a.y))
      // Desplazar el tablero si el puntero llega a un borde
      const el = scrollRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        if (a.x > r.right - 60) el.scrollLeft += 18
        else if (a.x < r.left + 60) el.scrollLeft -= 18
      }
    }

    const soltar = (e) => {
      const a = arrastre.current
      if (!a) return
      if (a.activo) {
        const destino = columnaEn(e.clientX, e.clientY)
        if (destino && destino !== a.estado) onMoverRef.current(a.id, destino)
        // Que soltar no abra la tarea (el click llega justo después del pointerup, antes del setTimeout)
        ignorarClick.current = true
        setTimeout(() => (ignorarClick.current = false), 0)
      }
      terminarArrastre()
    }

    // Mientras se arrastra con el dedo, que la página no se desplace
    const bloquearScroll = (e) => {
      if (arrastre.current?.activo) e.preventDefault()
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', terminarArrastre)
    window.addEventListener('touchmove', bloquearScroll, { passive: false })
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', terminarArrastre)
      window.removeEventListener('touchmove', bloquearScroll)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-8 pt-6 pb-4">
        <label className="input input-sm w-full md:hidden">
          <IconoBuscar className="size-4 opacity-50" />
          <input ref={buscadorMovil} placeholder="Buscar proyectos..." value={busqueda} onChange={(e) => onBusqueda(e.target.value)} />
        </label>

        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-sm bg-base-100 border-base-300 font-normal">
            <IconoFiltro className="size-4" />
            Filtro
            {filtroPrioridad !== 'todas' && <span className="badge badge-xs badge-primary">1</span>}
          </div>
          <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-48 z-30 mt-1">
            <li className="menu-title">Prioridad</li>
            {[{ value: 'todas', label: 'Todas' }, ...PRIORIDADES].map((o) => (
              <li key={o.value}>
                <button
                  className={filtroPrioridad === o.value ? 'menu-active' : ''}
                  onClick={() => {
                    setFiltroPrioridad(o.value)
                    cerrarMenu()
                  }}
                >
                  {o.value !== 'todas' && <IconoPrioridad prioridad={o.value} />}
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {asignaturas.length > 0 && (
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className={`btn btn-sm font-normal max-w-64 ${
                filtroAsignatura !== 'todas' ? 'bg-primary/10 border-primary/30' : 'bg-base-100 border-base-300'
              }`}
            >
              <span
                className="size-2.5 shrink-0 rounded-full border border-base-content/30"
                style={filtroAsignatura !== 'todas' && filtroAsignatura !== SIN_ASIGNATURA ? colorAsignatura(filtroAsignatura).punto : undefined}
              />
              <span className="truncate">
                {filtroAsignatura === 'todas'
                  ? 'Asignatura'
                  : filtroAsignatura === SIN_ASIGNATURA
                    ? 'Sin asignatura'
                    : filtroAsignatura}
              </span>
            </div>
            <ul tabIndex={0} className="dropdown-content menu menu-sm flex-nowrap bg-base-100 border border-base-300 rounded-box shadow-lg w-72 max-h-80 overflow-y-auto z-30 mt-1">
              <li className="menu-title">Asignatura</li>
              {[
                { valor: 'todas', nombre: 'Todas', total: proyectos.length },
                ...asignaturas.map((a) => ({ valor: a.nombre, ...a })),
                ...(sinAsignatura ? [{ valor: SIN_ASIGNATURA, nombre: 'Sin asignatura', total: sinAsignatura }] : []),
              ].map((o) => (
                <li key={o.valor}>
                  <button
                    className={filtroAsignatura === o.valor ? 'menu-active' : ''}
                    onClick={() => {
                      setFiltroAsignatura(o.valor)
                      cerrarMenu()
                    }}
                  >
                    {o.valor === 'todas' || o.valor === SIN_ASIGNATURA ? (
                      <span className="size-2.5 shrink-0 rounded-full border border-dashed border-base-content/40" />
                    ) : (
                      <span className="size-2.5 shrink-0 rounded-full" style={colorAsignatura(o.nombre).punto} />
                    )}
                    <span className="flex-1 truncate" title={o.nombre}>{o.nombre}</span>
                    <span className="text-xs opacity-50">{o.total}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-sm bg-base-100 border-base-300 font-normal">
            <IconoOrden className="size-4" />
            Ordenar: {ORDENES.find((o) => o.value === orden).label}
          </div>
          <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-40 z-30 mt-1">
            {ORDENES.map((o) => (
              <li key={o.value}>
                <button
                  className={orden === o.value ? 'menu-active' : ''}
                  onClick={() => {
                    setOrden(o.value)
                    cerrarMenu()
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {busqueda && (
          <button className="btn btn-sm btn-ghost font-normal" onClick={() => onBusqueda('')}>
            Limpiar búsqueda “{busqueda}”
          </button>
        )}
      </div>

      {/* Columnas */}
      <div
        ref={scrollRef}
        onScroll={medir}
        className="flex-1 overflow-x-auto px-4 md:px-8 pb-28 md:pb-8 snap-x snap-mandatory md:snap-none scroll-px-4"
      >
        <div className={`flex gap-4 min-h-full ${arrastrando ? 'items-stretch' : 'items-start'}`}>
          {ESTADOS.map((col) => {
            const tarjetas = visibles.filter((p) => p.estado === col.value)
            const activa = columnaSobre === col.value
            const origen = arrastrando && ESTADOS.find((e) => e.value === arrastrando.estado)
            const esDestino = arrastrando && arrastrando.estado !== col.value
            return (
              <section
                key={col.value}
                data-estado={col.value}
                className={`group/col relative flex flex-col w-[78vw] max-w-[290px] shrink-0 snap-start rounded-xl border border-base-300 bg-base-100/60 p-2 ${
                  arrastrando ? 'min-h-[calc(100vh-190px)]' : ''
                }`}
              >
                <h2 className="flex items-center gap-2 px-2 pt-1 pb-3 text-sm font-medium truncate">
                  <span className={`size-2 rounded-full shrink-0 ${PUNTO[col.value]}`} />
                  {esDestino ? (
                    <span className="truncate">
                      <span className="text-base-content/50">{origen.label} →</span> {col.label}
                    </span>
                  ) : (
                    <>
                      {col.label}
                      <span className="font-normal text-base-content/50">{tarjetas.length}</span>
                    </>
                  )}
                </h2>

                {/* Zona de soltar que ocupa toda la columna mientras se arrastra */}
                {esDestino && (
                  <div
                    className={`absolute inset-x-2 top-10 bottom-2 z-10 grid place-items-center rounded-lg border-2 border-dashed text-sm font-medium transition-all ${
                      activa
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-base-300 bg-base-200/70 text-base-content/40'
                    }`}
                  >
                    {activa ? `Soltar en ${col.label}` : 'Arrastra aquí'}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {tarjetas.map((p) => (
                    <article
                      key={p.id}
                      onPointerDown={(e) => alPulsarTarjeta(e, p)}
                      onContextMenu={(e) => arrastre.current && e.preventDefault()}
                      onClick={() => {
                        if (ignorarClick.current) {
                          ignorarClick.current = false
                          return
                        }
                        onAbrir(p.id)
                      }}
                      className={`group/card relative select-none [-webkit-touch-callout:none] rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-grab active:cursor-grabbing hover:border-base-content/20 hover:shadow-sm transition ${
                        arrastrando?.id === p.id ? 'opacity-40 border-dashed' : ''
                      }`}
                    >
                      {/* Menú de acciones */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="dropdown dropdown-end absolute top-2 right-2 md:opacity-0 md:group-hover/card:opacity-100 focus-within:opacity-100"
                      >
                        {/* div con tabIndex (no <button>) para que el menú también se abra en Safari de iPhone */}
                        <div tabIndex={0} role="button" className="btn btn-xs btn-square btn-ghost bg-base-100" title="Acciones" aria-label="Acciones">
                          <IconoPuntos className="size-4" />
                        </div>
                        <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-44 z-30">
                          <li className="menu-title">Mover a</li>
                          {ESTADOS.filter((e) => e.value !== p.estado).map((e) => (
                            <li key={e.value}>
                              <button onClick={() => { cerrarMenu(); onMover(p.id, e.value) }}>
                                <span className={`size-2 rounded-full ${PUNTO[e.value]}`} />
                                {e.label}
                              </button>
                            </li>
                          ))}
                          <li className="mt-1 border-t border-base-300 pt-1">
                            <button onClick={() => { cerrarMenu(); onEditar(p) }}>Abrir</button>
                          </li>
                          <li>
                            <button className="text-error" onClick={() => { cerrarMenu(); onBorrar(p) }}>Eliminar</button>
                          </li>
                        </ul>
                      </div>

                      <h3 className={`text-sm font-medium leading-5 pr-6 ${p.estado === 'hecho' ? 'text-base-content/60' : ''}`}>
                        {p.titulo}
                      </h3>
                      {p.descripcion && (
                        <p className="mt-1 text-xs text-base-content/60 line-clamp-2">{vistaPrevia(p.descripcion)}</p>
                      )}

                      <EtiquetaOrigen proyecto={p} />

                      <div className="mt-3 flex items-center gap-3 text-xs text-base-content/60">
                        <span className={p.estado === 'hecho' ? 'line-through' : ''}>{clave(p)}</span>
                        <span className="flex items-center gap-1">
                          <IconoCalendario className="size-3.5" />
                          {formatearFecha(p.fecha)}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {p.comentarios?.length > 0 && (
                            <span className="flex items-center gap-0.5" title="Comentarios">
                              <IconoComentario className="size-3.5" />
                              {p.comentarios.length}
                            </span>
                          )}
                          {p.estado === 'hecho' && <IconoCheck className="size-4 text-success" />}
                          <span title={`Prioridad ${p.prioridad}`}>
                            <IconoPrioridad prioridad={p.prioridad} />
                          </span>
                          {p.asignado && (
                            <span
                              title={`Asignada a ${p.asignadoNombre}`}
                              className="grid place-items-center size-5 rounded-full bg-primary text-primary-content text-[9px] font-medium"
                            >
                              {iniciales(p.asignadoNombre)}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}

                  <button
                    onClick={() => onNuevo(col.value)}
                    title={`Crear en ${col.label}`}
                    className={`flex h-9 items-center justify-center gap-1 rounded-lg border border-dashed border-base-300 text-sm text-base-content/50 hover:bg-base-200/60 hover:text-base-content transition ${
                      tarjetas.length ? 'md:opacity-0 md:group-hover/col:opacity-100' : ''
                    }`}
                  >
                    <IconoMas className="size-4" /> Añadir
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {fantasma && (
        <div
          className="fixed z-[60] pointer-events-none w-64 rounded-lg border border-primary/40 bg-base-100 px-3.5 py-3 text-sm font-medium shadow-xl rotate-2"
          style={{ left: fantasma.x + 12, top: fantasma.y + 12 }}
        >
          {fantasma.titulo}
        </div>
      )}

      <Minimapa
        columnas={ESTADOS.map((col) => visibles.filter((p) => p.estado === col.value).length)}
        ventana={ventana}
        scrollRef={scrollRef}
      />
    </div>
  )
}

// Minimapa flotante (solo móvil): muestra las columnas y qué parte del tablero estás viendo.
// Se puede tocar o arrastrar para desplazarse.
function Minimapa({ columnas, ventana, scrollRef }) {
  const mapaRef = useRef(null)
  if (ventana.ancho >= 0.99) return null

  const irA = (e, suave) => {
    const el = scrollRef.current
    const rect = mapaRef.current.getBoundingClientRect()
    const fraccion = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    el.scrollTo({ left: fraccion * el.scrollWidth - el.clientWidth / 2, behavior: suave ? 'smooth' : 'auto' })
  }

  return (
    <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-base-300 bg-base-100/90 backdrop-blur p-1.5 shadow-lg">
      <div
        ref={mapaRef}
        className="relative flex gap-1 touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          irA(e, true)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) irA(e, false)
        }}
        aria-label="Minimapa del tablero"
      >
        {columnas.map((n, i) => (
          <div key={i} className="flex flex-col gap-0.5 w-6 h-10 rounded-md bg-base-200 p-1">
            {Array.from({ length: Math.min(n, 5) }).map((_, j) => (
              <span key={j} className="h-1 rounded-sm bg-base-content/25" />
            ))}
          </div>
        ))}
        <div
          className="absolute -inset-y-0.5 rounded-md border-2 border-primary bg-primary/5 pointer-events-none transition-[left] duration-75"
          style={{ left: `${ventana.inicio * 100}%`, width: `${ventana.ancho * 100}%` }}
        />
      </div>
    </div>
  )
}

// Etiqueta con la asignatura (cada una con su color) y el icono de Classroom/Moodle si viene de ahí
function EtiquetaOrigen({ proyecto }) {
  const origen = integracionDe(proyecto)
  const asignatura = asignaturaDe(proyecto)
  if (!asignatura && !origen) return null
  const Icono = origen?.Icono
  if (!asignatura)
    return (
      <span className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${origen.color}`}>
        <Icono className="size-3.5 shrink-0" />
        <span className="truncate">{origen.corto}</span>
      </span>
    )
  return (
    <span
      className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={colorAsignatura(asignatura).etiqueta}
      title={origen ? `${asignatura} · ${origen.nombre}` : asignatura}
    >
      {Icono ? <Icono className="size-3.5 shrink-0" /> : <span className="size-1.5 shrink-0 rounded-full bg-current" />}
      <span className="truncate">{asignatura}</span>
    </span>
  )
}
