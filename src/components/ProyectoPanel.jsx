import { useMemo, useState } from 'react'
import { ESTADOS, PRIORIDADES, findOption } from '../constants'
import { iniciales, obtenerUsuarios } from '../auth'
import Markdown from './Markdown'
import { IconoCerrar, IconoPrioridad, IconoPuntos, IconoTarea } from './Iconos'

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
  asignadoId: '',
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
  const usuarios = useMemo(() => obtenerUsuarios(), [])
  const datos = creando ? borrador : proyecto

  const cambiar = (campos) => (creando ? setBorrador((b) => ({ ...b, ...campos })) : onActualizar(campos))
  const nombreDe = (id) => usuarios.find((u) => u.id === id)?.nombre

  const crear = () => {
    if (!borrador.titulo.trim()) return setError('El título es obligatorio')
    if (!borrador.fecha) return setError('La fecha es obligatoria')
    onCrear({ ...borrador, titulo: borrador.titulo.trim(), descripcion: borrador.descripcion.trim(), creadorId: usuario.id })
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
              <button tabIndex={0} className="btn btn-sm btn-square btn-outline border-base-300" aria-label="Más acciones">
                <IconoPuntos className="size-4" />
              </button>
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
                <Fila etiqueta="Persona asignada">
                  <label className="flex items-center gap-2 -ml-2 px-2 py-1 rounded-md hover:bg-base-200 cursor-pointer">
                    {datos.asignadoId ? <Avatar nombre={nombreDe(datos.asignadoId)} pequeno /> : <AvatarVacio />}
                    <select
                      className="flex-1 bg-transparent outline-none cursor-pointer appearance-none"
                      value={datos.asignadoId ?? ''}
                      onChange={(e) => cambiar({ asignadoId: e.target.value })}
                    >
                      <option value="">Sin asignar</option>
                      {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </label>
                  {datos.asignadoId !== usuario.id && (
                    <button className="text-xs text-info hover:underline mt-0.5" onClick={() => cambiar({ asignadoId: usuario.id })}>
                      Asignármelo
                    </button>
                  )}
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
                    <Avatar nombre={creando ? usuario.nombre : nombreDe(datos.creadorId) ?? '—'} pequeno />
                    {creando ? usuario.nombre : nombreDe(datos.creadorId) ?? 'Desconocido'}
                  </span>
                </Fila>
              </dl>
            )}
          </div>

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

function SelectorEstado({ estado, onCambiar }) {
  const actual = findOption(ESTADOS, estado)
  return (
    <div className="dropdown">
      <button tabIndex={0} className={`btn btn-sm border font-medium ${ESTILO_ESTADO[actual.value]}`}>
        {actual.label}
        <Flecha abierta className="size-3.5" />
      </button>
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
            placeholder="Añade un comentario..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar(e)
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
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
              {c.autorId === usuario.id && (
                <button className="text-xs text-base-content/40 hover:text-error mt-1" onClick={() => onBorrar(c.id)}>
                  Eliminar
                </button>
              )}
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

function AvatarVacio() {
  return <span className="size-6 shrink-0 rounded-full border border-dashed border-base-content/30" />
}
