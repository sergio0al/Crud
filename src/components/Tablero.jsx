import { useEffect, useMemo, useRef, useState } from 'react'
import { ESTADOS, PRIORIDADES } from '../constants'
import { clave } from '../hooks/useProyectos'
import { iniciales, obtenerUsuarios } from '../auth'
import {
  IconoBuscar,
  IconoCalendario,
  IconoCheck,
  IconoComentario,
  IconoFiltro,
  IconoMas,
  IconoOrden,
  IconoPrioridad,
  IconoClassroom,
  IconoPuntos,
} from './Iconos'

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 }
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
  const nombres = useMemo(() => Object.fromEntries(obtenerUsuarios().map((u) => [u.id, u.nombre])), [])
  const [filtroPrioridad, setFiltroPrioridad] = useState('todas')
  const [orden, setOrden] = useState('prioridad')
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
          !q ||
          p.titulo.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          clave(p).toLowerCase().includes(q),
      )
      .sort((a, b) =>
        orden === 'prioridad'
          ? ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.fecha.localeCompare(b.fecha)
          : orden === 'titulo'
            ? a.titulo.localeCompare(b.titulo)
            : a.fecha.localeCompare(b.fecha),
      )
  }, [proyectos, busqueda, filtroPrioridad, orden])

  const terminarArrastre = () => {
    setArrastrando(null)
    setColumnaSobre(null)
  }

  const soltar = (e, estado) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onMover(id, estado)
    terminarArrastre()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-8 pt-6 pb-4">
        <label className="input input-sm w-full md:hidden">
          <IconoBuscar className="size-4 opacity-50" />
          <input ref={buscadorMovil} placeholder="Buscar proyectos..." value={busqueda} onChange={(e) => onBusqueda(e.target.value)} />
        </label>

        <div className="dropdown">
          <button tabIndex={0} className="btn btn-sm bg-base-100 border-base-300 font-normal">
            <IconoFiltro className="size-4" />
            Filtro
            {filtroPrioridad !== 'todas' && <span className="badge badge-xs badge-primary">1</span>}
          </button>
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

        <div className="dropdown">
          <button tabIndex={0} className="btn btn-sm bg-base-100 border-base-300 font-normal">
            <IconoOrden className="size-4" />
            Ordenar: {ORDENES.find((o) => o.value === orden).label}
          </button>
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
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (columnaSobre !== col.value) setColumnaSobre(col.value)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setColumnaSobre(null)
                }}
                onDrop={(e) => soltar(e, col.value)}
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
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', p.id)
                        e.dataTransfer.effectAllowed = 'move'
                        // Se retrasa para no cambiar el DOM durante dragstart (cancelaría el arrastre)
                        setTimeout(() => setArrastrando({ id: p.id, estado: p.estado }), 0)
                      }}
                      onDragEnd={terminarArrastre}
                      onClick={() => onAbrir(p.id)}
                      className={`group/card relative rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-grab active:cursor-grabbing hover:border-base-content/20 hover:shadow-sm transition ${
                        arrastrando?.id === p.id ? 'opacity-40 border-dashed' : ''
                      }`}
                    >
                      {/* Menú de acciones */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="dropdown dropdown-end absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100"
                      >
                        <button tabIndex={0} className="btn btn-xs btn-square btn-ghost bg-base-100" title="Acciones">
                          <IconoPuntos className="size-4" />
                        </button>
                        <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-36 z-30">
                          <li>
                            <button onClick={() => { cerrarMenu(); onEditar(p) }}>Editar</button>
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

                      {p.origen?.tipo === 'classroom' && (
                        <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                          <IconoClassroom className="size-3.5 shrink-0" />
                          <span className="truncate">{p.origen.curso || 'Classroom'}</span>
                        </span>
                      )}

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
                          {nombres[p.asignadoId] && (
                            <span
                              title={`Asignado a ${nombres[p.asignadoId]}`}
                              className="grid place-items-center size-6 rounded-full bg-primary text-primary-content text-[10px] font-medium"
                            >
                              {iniciales(nombres[p.asignadoId])}
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
