import { useState } from 'react'
import { ESTADOS, PRIORIDADES, findOption } from '../constants'
import { iniciales } from '../auth'
import Markdown from './Markdown'
import { IconoCerrar, IconoMas, IconoPrioridad, IconoPuntos, IconoTarea } from './Iconos'
import { crearDocumento, integracionDe } from '../integraciones'
import { asignaturaDe, colorAsignatura } from '../asignaturas'

const ESTILO_ESTADO = {
  por_hacer: 'bg-base-200 text-base-content border-base-300 hover:bg-base-300',
  en_curso: 'bg-info/15 text-info border-info/30 hover:bg-info/25',
  en_revision: 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/25',
  pruebas: 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/25',
  hecho: 'bg-success/15 text-success border-success/30 hover:bg-success/25',
}

const hoy = () => new Date().toISOString().slice(0, 10)
const vacio = (estado) => ({
  titulo: '',
  descripcion: '',
  fecha: hoy(),
  estado: estado ?? 'por_hacer',
  prioridad: 'media',
  asignatura: '',
})

const formatearMomento = (ms) =>
  new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const cerrarMenu = () => document.activeElement?.blur()

/**
 * Panel único para crear, ver y editar un proyecto.
 * - Sin `proyecto`: modo creación (borrador local + botón Crear).
 * - Con `proyecto`: cada cambio se guarda al momento (edición en línea).
 */
export default function ProyectoPanel({
  proyecto,
  estadoInicial,
  clave,
  usuario,
  asignaturas = [],
  classroomConectado,
  onCrear,
  onActualizar,
  onBorrar,
  onComentar,
  onBorrarComentario,
  onCerrar,
}) {
  const creando = !proyecto
  const [borrador, setBorrador] = useState(() => vacio(estadoInicial))
  const [error, setError] = useState('')
  const [detallesAbiertos, setDetallesAbiertos] = useState(true)
  const datos = creando ? borrador : proyecto
  const origen = integracionDe(datos) // Classroom, Moodle o nada (creado a mano)

  const cambiar = (campos) => (creando ? setBorrador((b) => ({ ...b, ...campos })) : onActualizar(campos))

  const crear = () => {
    if (!borrador.titulo.trim()) return setError('El título es obligatorio')
    if (!borrador.fecha) return setError('La fecha es obligatoria')
    onCrear({
      ...borrador,
      titulo: borrador.titulo.trim(),
      descripcion: borrador.descripcion.trim(),
      asignatura: borrador.asignatura.trim(),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 px-5 md:px-8 h-14 shrink-0">
        <div className="flex items-center gap-1.5 text-sm text-base-content/70">
          <IconoTarea className="size-4 text-info" />
          {creando ? 'Nuevo proyecto' : clave}
        </div>
        <div className="flex items-center gap-1.5">
          {!creando && (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-sm btn-square btn-outline border-base-300" aria-label="Más acciones">
                <IconoPuntos className="size-4" />
              </div>
              <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-40 z-30 mt-1">
                <li>
                  <button className="text-error" onClick={() => { cerrarMenu(); onBorrar() }}>Eliminar proyecto</button>
                </li>
              </ul>
            </div>
          )}
          <button className="btn btn-sm btn-square btn-outline border-base-300" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[1fr_380px]">
        {/* Columna principal */}
        <div className="md:overflow-y-auto px-5 md:pl-8 md:pr-10 pb-8 space-y-6">
          <Titulo creando={creando} valor={datos.titulo} onCambiar={(titulo) => cambiar({ titulo })} />

          {origen && (
            <div className="flex flex-wrap items-center gap-2 -mt-3">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${origen.color}`}>
                <origen.Icono className="size-4" />
                {origen.nombre}
                {datos.origen.curso && ` · ${datos.origen.curso}`}
              </span>
            </div>
          )}

          {error && <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

          <Seccion titulo="Descripción">
            <Descripcion creando={creando} valor={datos.descripcion} onCambiar={(descripcion) => cambiar({ descripcion })} />
          </Seccion>

          {creando ? (
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-sm btn-ghost" onClick={onCerrar}>Cancelar</button>
              <button className="btn btn-sm btn-primary" onClick={crear}>Crear proyecto</button>
            </div>
          ) : (
            <Seccion titulo="Actividad">
              <Comentarios
                comentarios={proyecto.comentarios ?? []}
                usuario={usuario}
                onComentar={onComentar}
                onBorrar={onBorrarComentario}
              />
            </Seccion>
          )}
        </div>

        {/* Columna lateral */}
        <aside className="md:overflow-y-auto px-5 md:pl-0 md:pr-8 pb-8 space-y-4">
          <SelectorEstado estado={datos.estado} onCambiar={(estado) => cambiar({ estado })} />

          <div className="rounded-lg border border-base-300">
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold"
              onClick={() => setDetallesAbiertos(!detallesAbiertos)}
            >
              <Flecha abierta={detallesAbiertos} />
              Detalles
            </button>
            {detallesAbiertos && (
              <dl className="px-4 pb-4 pt-1 space-y-1 text-sm">
                <Fila etiqueta="Asignatura">
                  <CampoAsignatura
                    key={creando ? 'nuevo' : asignaturaDe(datos)}
                    creando={creando}
                    valor={asignaturaDe(datos)}
                    opciones={asignaturas}
                    onCambiar={(asignatura) => cambiar({ asignatura })}
                  />
                </Fila>

                <Fila etiqueta="Prioridad">
                  <label className="flex items-center gap-2 -ml-2 px-2 py-1 rounded-md hover:bg-base-200 cursor-pointer">
                    <IconoPrioridad prioridad={datos.prioridad} />
                    <select
                      className="flex-1 bg-transparent outline-none cursor-pointer appearance-none"
                      value={datos.prioridad}
                      onChange={(e) => cambiar({ prioridad: e.target.value })}
                    >
                      {PRIORIDADES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </Fila>

                <Fila etiqueta="Fecha de vencimiento">
                  <input
                    type="date"
                    className="-ml-2 px-2 py-1 rounded-md bg-transparent hover:bg-base-200 outline-none cursor-pointer w-full"
                    value={datos.fecha}
                    onChange={(e) => e.target.value && cambiar({ fecha: e.target.value })}
                  />
                </Fila>

                <Fila etiqueta="Informador">
                  <span className="flex items-center gap-2 py-1">
                    {origen ? (
                      <>
                        <span className={`grid place-items-center size-6 rounded-full ${origen.color}`}>
                          <origen.Icono className="size-3.5" />
                        </span>
                        {origen.nombre}
                      </>
                    ) : (
                      <>
                        <Avatar nombre={usuario.nombre} pequeno />
                        {usuario.nombre}
                      </>
                    )}
                  </span>
                </Fila>
              </dl>
            )}
          </div>

          {!creando && (
            <div className="space-y-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Enlaces</h3>
              <TarjetaDocumento proyecto={proyecto} disponible={classroomConectado} onGuardar={(documento) => onActualizar({ documento })} />
              {origen && datos.origen.enlace && (
                <TarjetaEnlace
                  href={datos.origen.enlace}
                  icono={<origen.Icono className="size-6" />}
                  colorIcono={origen.color}
                  titulo={`Ver en ${origen.corto}`}
                  subtitulo={datos.origen.curso || origen.nombre}
                />
              )}
            </div>
          )}

          {!creando && (
            <div className="px-1 text-xs text-base-content/50 space-y-1">
              {proyecto.creado && <p>Creado {formatearMomento(proyecto.creado)}</p>}
              {proyecto.actualizado && <p>Actualizado {formatearMomento(proyecto.actualizado)}</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

/* ---------- Piezas ---------- */

function Titulo({ creando, valor, onCambiar }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(valor)

  if (creando)
    return (
      <input
        className="w-full text-2xl font-semibold outline-none placeholder:text-base-content/30 border-b border-transparent focus:border-base-300 pb-1"
        placeholder="Título del proyecto"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        autoFocus
      />
    )

  const guardar = () => {
    if (texto.trim() && texto.trim() !== valor) onCambiar(texto.trim())
    else setTexto(valor)
    setEditando(false)
  }

  if (editando)
    return (
      <input
        className="w-full text-2xl font-semibold rounded-md border border-base-300 px-2 -mx-2 py-1 outline-none focus:border-info"
        value={texto}
        autoFocus
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') guardar()
          if (e.key === 'Escape') {
            e.stopPropagation()
            setTexto(valor)
            setEditando(false)
          }
        }}
      />
    )

  return (
    <h2
      className="text-2xl font-semibold rounded-md px-2 -mx-2 py-1 hover:bg-base-200 cursor-text break-words"
      title="Haz clic para editar"
      onClick={() => {
        setTexto(valor)
        setEditando(true)
      }}
    >
      {valor}
    </h2>
  )
}

function Descripcion({ creando, valor, onCambiar }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(valor)

  const editor = (valorEditor, setValor, extra) => (
    <div className="rounded-lg border border-base-300 focus-within:border-info transition">
      <textarea
        className="w-full min-h-48 resize-y bg-transparent px-3 py-2.5 text-sm leading-6 outline-none font-mono"
        placeholder="Describe el proyecto..."
        value={valorEditor}
        onChange={(e) => setValor(e.target.value)}
        autoFocus={!creando}
        {...extra}
      />
      <p className="px-3 pb-2 text-[11px] text-base-content/40">
        Formato: <code># Título</code> · <code>- lista</code> · <code>**negrita**</code> · <code>`código`</code>
      </p>
    </div>
  )

  if (creando) return editor(valor, onCambiar)

  if (editando) {
    const cancelar = () => {
      setTexto(valor)
      setEditando(false)
    }
    return (
      <div className="space-y-2">
        {editor(texto, setTexto, {
          onKeyDown: (e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              cancelar()
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              onCambiar(texto.trim())
              setEditando(false)
            }
          },
        })}
        <div className="flex gap-2">
          <button className="btn btn-sm btn-primary" onClick={() => { onCambiar(texto.trim()); setEditando(false) }}>
            Guardar
          </button>
          <button className="btn btn-sm btn-ghost" onClick={cancelar}>Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-md px-2 -mx-2 py-1.5 hover:bg-base-200/70 cursor-text"
      title="Haz clic para editar"
      onClick={() => {
        setTexto(valor)
        setEditando(true)
      }}
    >
      {valor ? <Markdown texto={valor} /> : <p className="text-sm text-base-content/40">Añade una descripción...</p>}
    </div>
  )
}

// Icono de Google Docs (hoja azul con líneas)
function IconoDocs({ className = 'size-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M14.5 2H6.5A1.5 1.5 0 0 0 5 3.5v17A1.5 1.5 0 0 0 6.5 22h11a1.5 1.5 0 0 0 1.5-1.5V6.5z" fill="#4285F4" />
      <path d="M14.5 2v3a1.5 1.5 0 0 0 1.5 1.5h3z" fill="#A1C2FA" />
      <path d="M8.5 11h7M8.5 14h7M8.5 17h4.5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

function Flechita() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="size-4 shrink-0 text-base-content/30 group-hover:text-base-content/70 group-hover:translate-x-0.5 transition">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

const CLASE_TARJETA =
  'group flex w-full items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3 text-left transition hover:border-base-content/20 hover:shadow-sm disabled:opacity-60 disabled:hover:shadow-none disabled:cursor-not-allowed'

/** Tarjeta grande con icono, título y subtítulo que abre un enlace externo */
function TarjetaEnlace({ href, icono, colorIcono, titulo, subtitulo }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={CLASE_TARJETA}>
      <span className={`grid place-items-center size-10 shrink-0 rounded-lg ${colorIcono}`}>{icono}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="block truncate text-xs text-base-content/60" title={subtitulo}>{subtitulo}</span>
      </span>
      <Flechita />
    </a>
  )
}

// Google Doc de la tarea: la primera vez se crea (con el script de Classroom) y después siempre abre el mismo
function TarjetaDocumento({ proyecto, disponible, onGuardar }) {
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  if (proyecto.documento)
    return (
      <TarjetaEnlace
        href={proyecto.documento}
        icono={<IconoDocs />}
        colorIcono="bg-[#4285F4]/10"
        titulo="Documento de Google"
        subtitulo="Abrir en Google Docs"
      />
    )

  const crear = async () => {
    setError('')
    setCreando(true)
    // Se abre la pestaña ya (con el clic) para que el navegador no la bloquee, y luego se le pone el enlace
    const ventana = window.open('', '_blank')
    try {
      const url = await crearDocumento({ titulo: proyecto.titulo, asignatura: asignaturaDe(proyecto), fecha: proyecto.fecha })
      onGuardar(url)
      if (ventana) ventana.location.href = url
    } catch (err) {
      ventana?.close()
      setError(err.message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <button
        className={`${CLASE_TARJETA} border-dashed`}
        disabled={!disponible || creando}
        title={disponible ? 'Crea un documento de Google para esta tarea' : 'Conecta Classroom para poder crear documentos'}
        onClick={crear}
      >
        <span className="grid place-items-center size-10 shrink-0 rounded-lg bg-[#4285F4]/10">
          {creando ? <span className="loading loading-spinner loading-sm text-[#4285F4]" /> : <IconoDocs />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">{creando ? 'Creando documento…' : 'Crear documento de Google'}</span>
          <span className="block truncate text-xs text-base-content/60">
            {disponible ? 'Se guarda en tu Drive, carpeta Proyectos' : 'Conecta Classroom para usarlo'}
          </span>
        </span>
        {!creando && <IconoMas className="size-4 shrink-0 text-base-content/30 group-hover:text-base-content/70 transition" />}
      </button>
      {error && <p className="mt-1 px-1 text-xs text-error">{error}</p>}
    </div>
  )
}

// Texto libre con sugerencias de las asignaturas que ya existen.
// Al crear se guarda en el borrador; al editar, cuando se sale del campo o se pulsa Enter.
function CampoAsignatura({ creando, valor, opciones, onCambiar }) {
  const [texto, setTexto] = useState(valor)
  const guardar = () => {
    const limpio = texto.trim()
    if (limpio !== valor) onCambiar(limpio)
  }
  return (
    <label className="flex items-center gap-2 -ml-2 px-2 py-1 rounded-md hover:bg-base-200 focus-within:bg-base-200 cursor-text">
      <span
        className="size-2.5 shrink-0 rounded-full border border-dashed border-base-content/30"
        style={texto.trim() ? colorAsignatura(texto.trim()).punto : undefined}
      />
      <input
        list="asignaturas-existentes"
        className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-base-content/40"
        placeholder="Sin asignatura"
        value={creando ? valor : texto}
        onChange={(e) => (creando ? onCambiar(e.target.value) : setTexto(e.target.value))}
        onBlur={creando ? undefined : guardar}
        onKeyDown={(e) => {
          if (creando) return
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.stopPropagation()
            setTexto(valor)
          }
        }}
      />
      <datalist id="asignaturas-existentes">
        {opciones.map((a) => <option key={a} value={a} />)}
      </datalist>
    </label>
  )
}

function SelectorEstado({ estado, onCambiar }) {
  const actual = findOption(ESTADOS, estado)
  return (
    <div className="dropdown">
      <div tabIndex={0} role="button" className={`btn btn-sm border font-medium ${ESTILO_ESTADO[actual.value]}`}>
        {actual.label}
        <Flecha abierta className="size-3.5" />
      </div>
      <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-48 z-30 mt-1">
        {ESTADOS.map((e) => (
          <li key={e.value}>
            <button
              className={e.value === estado ? 'menu-active' : ''}
              onClick={() => {
                onCambiar(e.value)
                cerrarMenu()
              }}
            >
              <span className={`badge badge-xs border ${ESTILO_ESTADO[e.value]}`} />
              {e.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Comentarios({ comentarios, usuario, onComentar, onBorrar }) {
  const [texto, setTexto] = useState('')
  const enviar = (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    onComentar(texto.trim())
    setTexto('')
  }

  return (
    <div>
      <form onSubmit={enviar} className="flex gap-3 items-start mb-6">
        <Avatar nombre={usuario.nombre} />
        <div className="flex-1 rounded-lg border border-base-300 focus-within:border-info transition">
          <textarea
            className="w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none"
            rows={2}
            placeholder="Añade un comentario o nota..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar(e)
            }}
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="text-[11px] text-base-content/40 pl-1">Ctrl + Enter para enviar</span>
            <button type="submit" className="btn btn-xs btn-primary" disabled={!texto.trim()}>Comentar</button>
          </div>
        </div>
      </form>

      <ul className="space-y-5">
        {[...comentarios].reverse().map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar nombre={c.autorNombre} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{c.autorNombre}</span>
                <span className="text-xs text-base-content/50">{formatearMomento(c.fecha)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words mt-1">{c.texto}</p>
              <button className="text-xs text-base-content/40 hover:text-error mt-1" onClick={() => onBorrar(c.id)}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
        {comentarios.length === 0 && <li className="text-sm text-base-content/50">Todavía no hay comentarios.</li>}
      </ul>
    </div>
  )
}

function Seccion({ titulo, children }) {
  const [abierta, setAbierta] = useState(true)
  return (
    <section>
      <button className="flex items-center gap-1.5 mb-3 text-sm font-semibold" onClick={() => setAbierta(!abierta)}>
        <Flecha abierta={abierta} />
        {titulo}
      </button>
      {abierta && children}
    </section>
  )
}

function Fila({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-start gap-3 py-1.5">
      <dt className="text-base-content/70 pt-1">{etiqueta}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

function Flecha({ abierta, className = 'size-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={`${className} transition-transform ${abierta ? '' : '-rotate-90'}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function Avatar({ nombre = '', pequeno }) {
  return (
    <span
      className={`grid place-items-center shrink-0 rounded-full bg-primary text-primary-content font-medium ${
        pequeno ? 'size-6 text-[10px]' : 'size-8 text-xs'
      }`}
    >
      {iniciales(nombre) || '?'}
    </span>
  )
}


