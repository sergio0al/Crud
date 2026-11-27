import { useEffect, useState } from 'react'
import { iniciales } from '../auth'
import { colorAsignatura } from '../asignaturas'
import Modal from './Modal'
import { IconoCerrar, IconoPuntos, IconoUsuarios } from './Iconos'

const cerrarMenu = () => document.activeElement?.blur()

/** Cuadradito de color con la inicial de la tabla (cada tabla tiene siempre el mismo color) */
export function IconoTabla({ nombre, className = 'size-[18px] text-[10px]' }) {
  return (
    <span
      className={`grid place-items-center shrink-0 rounded-md font-bold text-white ${className}`}
      style={colorAsignatura(nombre).punto}
    >
      {nombre.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

/** Barra encima del tablero cuando se está viendo una tabla compartida */
export function CabeceraTabla({ tablero, onCompartir, onRenombrar, onEliminar, onSalir }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 md:px-8 pt-5">
      <IconoTabla nombre={tablero.nombre} className="size-9 text-base rounded-lg" />
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold truncate">{tablero.nombre}</h2>
        <p className="text-xs text-base-content/60">
          Tabla compartida · {tablero.miembros} {tablero.miembros === 1 ? 'miembro' : 'miembros'}
          {tablero.soyPropietario ? ' · eres el propietario' : ''}
        </p>
      </div>
      <button className="btn btn-sm bg-base-100 border-base-300 font-normal" onClick={onCompartir}>
        <IconoUsuarios className="size-4" />
        {tablero.soyPropietario ? 'Compartir' : 'Miembros'}
      </button>
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-sm btn-square bg-base-100 border-base-300" aria-label="Más opciones de la tabla">
          <IconoPuntos className="size-4" />
        </div>
        <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg w-48 z-30 mt-1">
          {tablero.soyPropietario ? (
            <>
              <li><button onClick={() => { cerrarMenu(); onRenombrar() }}>Cambiar nombre</button></li>
              <li><button className="text-error" onClick={() => { cerrarMenu(); onEliminar() }}>Eliminar tabla</button></li>
            </>
          ) : (
            <li><button className="text-error" onClick={() => { cerrarMenu(); onSalir() }}>Salir de la tabla</button></li>
          )}
        </ul>
      </div>
    </div>
  )
}

/** Crear una tabla nueva o cambiarle el nombre */
export function ModalNombreTabla({ titulo, inicial = '', boton, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState(inicial)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return setError('Ponle un nombre a la tabla')
    setGuardando(true)
    try {
      await onGuardar(nombre.trim())
      onCerrar()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal ancho="max-w-md" onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <div className="p-6 space-y-4">
          <h3 className="text-base font-semibold">{titulo}</h3>
          <div className="flex items-center gap-3">
            <IconoTabla nombre={nombre || '?'} className="size-10 text-lg rounded-lg" />
            <input
              autoFocus
              className="input w-full"
              placeholder="Ej.: Proyecto final DAW, Grupo de M0612..."
              value={nombre}
              maxLength={80}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300 bg-base-200/50">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-sm btn-primary" disabled={guardando}>
            {guardando && <span className="loading loading-spinner loading-xs" />}
            {boton}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Miembros de la tabla: el propietario añade por correo y puede quitar a otros */
export function ModalCompartir({ tablero, usuarioId, api, onCerrar }) {
  const [miembros, setMiembros] = useState(null)
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = () =>
    api
      .miembros(tablero.id)
      .then(setMiembros)
      .catch((err) => setError(err.message))

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablero.id])

  const invitar = async (e) => {
    e.preventDefault()
    if (!correo.trim()) return
    setError('')
    setEnviando(true)
    try {
      await api.invitar(tablero.id, correo)
      setCorreo('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const quitar = async (m) => {
    setError('')
    try {
      await api.quitar(tablero.id, m.user_id)
      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal ancho="max-w-lg" onCerrar={onCerrar}>
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-base-300">
        <IconoTabla nombre={tablero.nombre} className="size-8 text-sm rounded-lg" />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate">{tablero.soyPropietario ? 'Compartir' : 'Miembros'} · {tablero.nombre}</h3>
          <p className="text-xs text-base-content/60">Todos los miembros ven y editan las tareas de esta tabla.</p>
        </div>
        <button className="btn btn-sm btn-square btn-ghost" onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-4" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {tablero.soyPropietario && (
          <form onSubmit={invitar} className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="correo-invitar">Añadir persona</label>
            <div className="flex gap-2">
              <input
                id="correo-invitar"
                type="email"
                className="input flex-1"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
              <button className="btn btn-primary" disabled={enviando || !correo.trim()}>
                {enviando && <span className="loading loading-spinner loading-xs" />}
                Añadir
              </button>
            </div>
            <p className="text-xs text-base-content/50">Tiene que tener ya una cuenta en la app.</p>
          </form>
        )}

        {error && <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

        <div>
          <p className="text-sm font-medium mb-2">
            Miembros {miembros && <span className="font-normal text-base-content/50">{miembros.length}</span>}
          </p>
          {!miembros ? (
            <span className="loading loading-spinner loading-sm text-base-content/40" />
          ) : (
            <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
              {miembros.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="grid place-items-center size-8 shrink-0 rounded-full bg-primary text-primary-content text-xs font-medium">
                    {iniciales(m.nombre) || '?'}
                  </span>
                  <div className="flex-1 min-w-0 leading-tight">
                    <p className="text-sm truncate">
                      {m.nombre}
                      {m.user_id === usuarioId && <span className="text-base-content/50"> (tú)</span>}
                    </p>
                    <p className="text-xs text-base-content/60 truncate">{m.email}</p>
                  </div>
                  {m.rol === 'propietario' ? (
                    <span className="badge badge-sm badge-ghost">Propietario</span>
                  ) : (
                    tablero.soyPropietario && (
                      <button className="btn btn-xs btn-ghost text-error" onClick={() => quitar(m)}>Quitar</button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

/** Confirmar eliminar la tabla (propietario) o salir de ella (miembro) */
export function ModalConfirmarTabla({ tablero, tipo, onConfirmar, onCerrar }) {
  const [error, setError] = useState('')
  const eliminar = tipo === 'eliminar'
  return (
    <Modal ancho="max-w-md" onCerrar={onCerrar}>
      <div className="p-6">
        <h3 className="text-base font-semibold">{eliminar ? 'Eliminar tabla' : 'Salir de la tabla'}</h3>
        <p className="mt-2 text-sm text-base-content/70">
          {eliminar ? (
            <>Se eliminará <strong className="text-base-content">{tablero.nombre}</strong> con todas sus tareas para todos los miembros. No se puede deshacer.</>
          ) : (
            <>Dejarás de ver <strong className="text-base-content">{tablero.nombre}</strong>. El propietario puede volver a añadirte.</>
          )}
        </p>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300 bg-base-200/50">
        <button className="btn btn-sm btn-ghost" onClick={onCerrar}>Cancelar</button>
        <button
          className="btn btn-sm btn-error"
          onClick={async () => {
            try {
              await onConfirmar()
              onCerrar()
            } catch (err) {
              setError(err.message)
            }
          }}
        >
          {eliminar ? 'Eliminar' : 'Salir'}
        </button>
      </div>
    </Modal>
  )
}
