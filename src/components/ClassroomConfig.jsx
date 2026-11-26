import { useState } from 'react'
import { guardarUrl } from '../classroom'
import { IconoCerrar } from './Iconos'

const formatear = (ms) =>
  new Date(ms).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function ClassroomConfig({ classroom, onCerrar }) {
  const { url, setUrl, cargando, error, ultima, sincronizarAhora } = classroom
  const [texto, setTexto] = useState(url)
  const [aviso, setAviso] = useState('')

  const guardar = (e) => {
    e.preventDefault()
    const limpio = texto.trim()
    if (limpio && !/^https:\/\/script\.google(usercontent)?\.com\//.test(limpio)) {
      return setAviso('La URL debe ser la de la aplicación web de Google Apps Script (https://script.google.com/...).')
    }
    if (limpio && !/[?&]token=/.test(limpio)) {
      return setAviso('Falta el token al final de la URL: ...?token=TU_CLAVE')
    }
    setAviso('')
    guardarUrl(limpio)
    setUrl(limpio)
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-base-300">
        <div>
          <h3 className="text-base font-semibold">Google Classroom</h3>
          <p className="text-xs text-base-content/60 mt-0.5">
            Cada correo de “Nueva tarea” se convierte en un proyecto en <strong>Por hacer</strong>.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm btn-square" onClick={onCerrar} aria-label="Cerrar">
          <IconoCerrar className="size-4" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 text-sm">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${url ? (error ? 'bg-error' : 'bg-success') : 'bg-base-content/30'}`} />
          {url ? (error ? 'Conectado con errores' : 'Conectado') : 'Sin conectar'}
          {ultima && url && <span className="text-base-content/50">· Última comprobación {formatear(ultima)}</span>}
        </div>

        {error && url && <div className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

        <form onSubmit={guardar} className="space-y-2">
          <label className="text-xs font-medium text-base-content/70" htmlFor="url-classroom">
            URL del script (aplicación web)
          </label>
          <input
            id="url-classroom"
            className="input w-full font-mono text-xs"
            placeholder="https://script.google.com/macros/s/.../exec?token=TU_CLAVE"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {aviso && <p className="text-xs text-error">{aviso}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn btn-sm btn-primary">Guardar</button>
            {url && (
              <button type="button" className="btn btn-sm" onClick={() => sincronizarAhora()} disabled={cargando}>
                {cargando && <span className="loading loading-spinner loading-xs" />}
                Comprobar ahora
              </button>
            )}
            {url && (
              <button
                type="button"
                className="btn btn-sm btn-ghost text-error"
                onClick={() => {
                  guardarUrl('')
                  setUrl('')
                  setTexto('')
                }}
              >
                Desconectar
              </button>
            )}
          </div>
        </form>

        <details className="rounded-lg border border-base-300 px-4 py-3">
          <summary className="cursor-pointer font-medium">¿Cómo lo conecto?</summary>
          <ol className="list-decimal pl-5 mt-3 space-y-1.5 text-base-content/80">
            <li>Abre <strong>script.google.com</strong> con la cuenta donde te llegan los correos de Classroom.</li>
            <li>Crea un proyecto nuevo y pega el contenido de <code>google-apps-script/Classroom.gs</code>.</li>
            <li>Cambia <code>TOKEN</code> por una clave tuya.</li>
            <li>Ejecuta la función <code>probar</code> y acepta los permisos de Gmail.</li>
            <li>
              <strong>Implementar → Nueva implementación → Aplicación web</strong>. Ejecutar como: <em>Yo</em>. Acceso:{' '}
              <em>Cualquier persona</em>.
            </li>
            <li>Copia la URL, añade <code>?token=TU_CLAVE</code> al final y pégala aquí.</li>
          </ol>
          <p className="mt-3 text-xs text-base-content/60">Tienes la guía completa en CLASSROOM.md.</p>
        </details>
      </div>
    </>
  )
}
