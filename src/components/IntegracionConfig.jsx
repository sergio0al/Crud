import { useState } from 'react'
import { IconoCerrar } from './Iconos'

const formatear = (ms) =>
  new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Ventana para conectar una integración (Classroom o Moodle). El enlace solo lo guarda el servidor. */
export default function IntegracionConfig({ integracion, onCerrar }) {
  const { info, conectado, conectar, quitar, cargando, error, ultima, sincronizarAhora } = integracion
  const { Icono } = info
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    const limpio = texto.trim()
    const problema = info.validar(limpio)
    if (problema) return setAviso(problema)
    setAviso('')
    setGuardando(true)
    try {
      await conectar(limpio)
      setTexto('') // no se queda en pantalla: solo lo conoce el servidor
    } catch (err) {
      setAviso(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-base-300">
        <div className="flex gap-3">
          <span className={`grid place-items-center size-10 shrink-0 rounded-lg ${info.color}`}>
            <Icono className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">{info.nombre}</h3>
            <p className="text-xs text-base-content/60 mt-0.5">{info.descripcion}</p>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-square" onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-4" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`size-2 rounded-full ${conectado ? (error ? 'bg-error' : 'bg-success') : 'bg-base-content/30'}`} />
          {conectado ? (error ? 'Conectado con errores' : 'Conectado') : 'Sin conectar'}
          {ultima && conectado && <span className="text-base-content/50">· Última comprobación {formatear(ultima)}</span>}
        </div>

        {error && conectado && <div className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

        {conectado && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={() => sincronizarAhora()} disabled={cargando}>
              {cargando && <span className="loading loading-spinner loading-xs" />}
              Comprobar ahora
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost text-error"
              onClick={() => quitar().catch((err) => setAviso(err.message))}
            >
              Desconectar
            </button>
          </div>
        )}

        <form onSubmit={guardar} className="space-y-2">
          <label className="text-xs font-medium text-base-content/70" htmlFor={`url-${info.clave}`}>
            {conectado ? `Cambiar: ${info.etiquetaUrl.toLowerCase()}` : info.etiquetaUrl}
          </label>
          <input
            id={`url-${info.clave}`}
            className="input w-full font-mono text-xs"
            placeholder={info.placeholder}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
          />
          <p className="text-xs text-base-content/50">
            🔒 Se guarda solo en el servidor. Nadie (ni tú desde aquí) puede volver a verlo; si lo cambias, pega el nuevo.
          </p>
          {aviso && <p className="text-xs text-error">{aviso}</p>}
          <button type="submit" className="btn btn-sm btn-primary" disabled={guardando || !texto.trim()}>
            {guardando && <span className="loading loading-spinner loading-xs" />}
            {conectado ? 'Guardar nuevo enlace' : 'Conectar'}
          </button>
        </form>

        <details className="rounded-lg border border-base-300 px-4 py-3">
          <summary className="cursor-pointer font-medium">¿Cómo lo conecto?</summary>
          <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-base-content/80">
            {info.guia.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        </details>
      </div>
    </>
  )
}
