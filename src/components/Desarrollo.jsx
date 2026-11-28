import { useCallback, useEffect, useState } from 'react'
import { crearRama, leerDesarrollo } from '../integraciones'

// Panel "Desarrollo" de una tarea (como el de Jira): ramas, commits y pull requests de su repositorio de GitHub

const ESTADO_PR = {
  merged: { texto: 'MERGED', clase: 'bg-success/15 text-success' },
  open: { texto: 'OPEN', clase: 'bg-info/15 text-info' },
  draft: { texto: 'DRAFT', clase: 'bg-base-200 text-base-content/60' },
  closed: { texto: 'CLOSED', clase: 'bg-error/10 text-error' },
}

// "PRJ-12" + "Login con Google" → "prj-12-login-con-google"
const ramaSugerida = (clave, titulo) =>
  `${clave} ${titulo}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')

function haceCuanto(iso) {
  if (!iso) return ''
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000)
  if (min < 60) return `hace ${Math.max(min, 1)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export default function Desarrollo({ proyecto, clave, disponible, onConectar }) {
  const [abierto, setAbierto] = useState(true)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [seccion, setSeccion] = useState(null) // 'ramas' | 'commits' | 'pulls'

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setDatos(await leerDesarrollo(proyecto.repositorio))
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [proyecto.repositorio])

  useEffect(() => {
    if (disponible) cargar()
  }, [disponible, cargar])

  const alternar = (s) => setSeccion((actual) => (actual === s ? null : s))
  const ultimoPr = datos?.pulls[0]

  return (
    <div className="rounded-lg border border-base-300">
      <div className="flex items-center gap-2 px-4 py-3">
        <button className="flex flex-1 items-center gap-2 text-sm font-semibold" onClick={() => setAbierto((a) => !a)}>
          <Chevron abierto={abierto} />
          Desarrollo
        </button>
        {disponible && abierto && (
          <button className="btn btn-ghost btn-xs btn-square" title="Actualizar" disabled={cargando} onClick={cargar}>
            {cargando ? <span className="loading loading-spinner loading-xs" /> : <IconoRecargar />}
          </button>
        )}
      </div>

      {abierto && (
        <div className="px-2 pb-3 text-sm">
          {!disponible ? (
            <Accion icono={<IconoEngranaje />} onClick={onConectar}>
              Conectar herramientas de desarrollo
            </Accion>
          ) : error ? (
            <p className="px-2 text-xs text-error">{error}</p>
          ) : !datos ? (
            <p className="px-2 py-1 text-xs text-base-content/50">Cargando datos de GitHub…</p>
          ) : (
            <>
              <Accion icono={<IconoRama />} abierta={seccion === 'ramas'} onClick={() => alternar('ramas')}
                extra={<Contador n={datos.ramas.length} texto="ramas" />}>
                Crear rama
              </Accion>
              {seccion === 'ramas' && <Ramas datos={datos} sugerida={ramaSugerida(clave, proyecto.titulo)} onCreada={cargar} />}

              <Accion icono={<IconoCommit />} abierta={seccion === 'commits'} onClick={() => alternar('commits')}
                extra={<Contador n={datos.commits.length} texto="commits recientes" />}>
                Crear confirmación
              </Accion>
              {seccion === 'commits' && <Commits datos={datos} clave={clave} rama={ramaSugerida(clave, proyecto.titulo)} />}

              <Accion icono={<IconoPr />} abierta={seccion === 'pulls'} onClick={() => alternar('pulls')}
                extra={ultimoPr && <Insignia estado={ultimoPr.estado} />}>
                {datos.pulls.length === 1 ? '1 solicitud de incorporación de cambios' : `${datos.pulls.length} solicitudes de incorporación de cambios`}
              </Accion>
              {seccion === 'pulls' && <Pulls datos={datos} />}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Secciones ----------

function Ramas({ datos, sugerida, onCreada }) {
  const [nombre, setNombre] = useState(sugerida)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const existe = datos.ramas.some((r) => r.nombre === nombre.trim())

  const crear = async (e) => {
    e.preventDefault()
    setCreando(true)
    setError('')
    try {
      await crearRama(datos.repo.nombre, nombre.trim())
      await onCreada()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <Desplegable>
      <form onSubmit={crear} className="flex gap-2">
        <input className="input input-sm flex-1 min-w-0 font-mono text-xs" value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="nombre-de-la-rama" aria-label="Nombre de la rama" />
        <button className="btn btn-sm btn-primary" disabled={creando || !nombre.trim() || existe}>
          {creando ? <span className="loading loading-spinner loading-xs" /> : 'Crear'}
        </button>
      </form>
      <p className="text-[11px] text-base-content/50">
        Se crea desde <span className="font-mono">{datos.repo.principal}</span>.{existe && ' Ya existe una rama con ese nombre.'}
      </p>
      {error && <p className="text-xs text-error">{error}</p>}
      <ul className="space-y-0.5">
        {datos.ramas.map((r) => (
          <li key={r.nombre}>
            <a href={`${datos.repo.url}/tree/${r.nombre}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-base-200">
              <IconoRama className="size-3.5 text-base-content/50" />
              <span className="flex-1 truncate font-mono text-xs">{r.nombre}</span>
              {r.nombre === datos.repo.principal && <span className="text-[10px] text-base-content/50">principal</span>}
            </a>
          </li>
        ))}
      </ul>
    </Desplegable>
  )
}

function Commits({ datos, clave, rama }) {
  const comandos = [
    { titulo: 'Clonar', texto: `git clone ${datos.repo.url}.git` },
    { titulo: 'Trabajar en una rama', texto: `git checkout -b ${rama}` },
    { titulo: 'Confirmar cambios', texto: `git commit -m "${clave}: "` },
  ]
  return (
    <Desplegable>
      <ul className="space-y-1.5">
        {comandos.map((c) => (
          <li key={c.titulo}>
            <p className="text-[11px] text-base-content/50 mb-0.5">{c.titulo}</p>
            <Copiable texto={c.texto} />
          </li>
        ))}
      </ul>
      <p className="pt-1 text-[11px] font-medium text-base-content/60">Últimos commits en {datos.repo.principal}</p>
      {datos.commits.length === 0 ? (
        <p className="text-xs text-base-content/50">Todavía no hay commits.</p>
      ) : (
        <ul className="space-y-0.5">
          {datos.commits.map((c) => (
            <li key={c.sha}>
              <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-base-200">
                <span className="font-mono text-[11px] text-info shrink-0">{c.sha.slice(0, 7)}</span>
                <span className="flex-1 truncate text-xs">{c.mensaje}</span>
                <span className="text-[11px] text-base-content/50 shrink-0">{haceCuanto(c.fecha)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Desplegable>
  )
}

function Pulls({ datos }) {
  return (
    <Desplegable>
      {datos.pulls.length === 0 ? (
        <p className="text-xs text-base-content/50">Todavía no hay ninguna.</p>
      ) : (
        <ul className="space-y-0.5">
          {datos.pulls.map((p) => (
            <li key={p.numero}>
              <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-base-200">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">#{p.numero} {p.titulo}</span>
                  <span className="block truncate text-[11px] text-base-content/50">
                    <span className="font-mono">{p.rama}</span> · {p.autor} · {haceCuanto(p.fecha)}
                  </span>
                </span>
                <Insignia estado={p.estado} />
              </a>
            </li>
          ))}
        </ul>
      )}
      <a href={`${datos.repo.url}/compare`} target="_blank" rel="noreferrer" className="inline-block px-2 text-xs text-info hover:underline">
        Abrir una nueva en GitHub →
      </a>
    </Desplegable>
  )
}

// ---------- Piezas ----------

function Accion({ icono, abierta, onClick, extra, children }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-info hover:bg-base-200">
      <span className="shrink-0">{icono}</span>
      <span className="flex-1 truncate">{children}</span>
      {extra}
      {abierta !== undefined && <Chevron abierto={abierta} className="size-3.5 text-base-content/40" />}
    </button>
  )
}

const Desplegable = ({ children }) => <div className="ml-8 mr-2 mb-2 mt-1 space-y-2">{children}</div>

const Contador = ({ n, texto }) => (
  <span className="text-[11px] text-base-content/50 shrink-0" title={`${n} ${texto}`}>{n}</span>
)

function Insignia({ estado }) {
  const e = ESTADO_PR[estado] ?? ESTADO_PR.open
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.clase}`}>{e.texto}</span>
}

function Copiable({ texto }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }
  return (
    <button onClick={copiar} title="Copiar"
      className="flex w-full items-center gap-2 rounded-md bg-base-200 px-2 py-1.5 text-left font-mono text-[11px] hover:bg-base-300">
      <span className="flex-1 truncate">{texto}</span>
      <span className="shrink-0 font-sans text-[10px] text-base-content/50">{copiado ? '¡Copiado!' : 'Copiar'}</span>
    </button>
  )
}

// ---------- Iconos ----------

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const Chevron = ({ abierto, className = 'size-4' }) => (
  <svg {...base} strokeWidth={2} className={`${className} transition-transform ${abierto ? '' : '-rotate-90'}`}><path d="m6 9 6 6 6-6" /></svg>
)
const IconoRama = ({ className = 'size-4' }) => (
  <svg {...base} className={className}><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="7" r="2" /><path d="M6 7v10M18 9c0 5-12 3-12 8" /></svg>
)
const IconoCommit = ({ className = 'size-4' }) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6" /></svg>
)
const IconoPr = ({ className = 'size-4' }) => (
  <svg {...base} className={className}><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v10M18 17V9a3 3 0 0 0-3-3h-4m2-2-2 2 2 2" /></svg>
)
const IconoEngranaje = ({ className = 'size-4' }) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
)
const IconoRecargar = ({ className = 'size-3.5' }) => (
  <svg {...base} className={className}><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
)
