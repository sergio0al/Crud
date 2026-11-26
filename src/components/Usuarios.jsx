import { useEffect, useState } from 'react'
import { cambiarPassword, crearUsuario, eliminarUsuario, iniciales, listarUsuarios } from '../auth'
import Modal from './Modal'

const VACIO = { nombre: '', email: '', password: '' }

// Contraseña aleatoria fácil de dictar (sin caracteres que se confundan)
const generarPassword = () => {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => letras[n % letras.length]).join('')
}

/** Gestión de usuarios: solo la ve y la usa el owner (la Edge Function lo comprueba en el servidor). */
export default function Usuarios({ usuario }) {
  const [usuarios, setUsuarios] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aBorrar, setABorrar] = useState(null)
  const [cambiandoClave, setCambiandoClave] = useState(null) // { usuario, password, error }

  const recargar = () =>
    listarUsuarios()
      .then(setUsuarios)
      .catch((err) => setError(err.message))

  useEffect(() => {
    recargar()
  }, [])

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const ejecutar = async (accion, exito) => {
    setOcupado(true)
    setError('')
    setAviso('')
    try {
      await accion()
      setAviso(exito)
      await recargar()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  const crear = async (e) => {
    e.preventDefault()
    const ok = await ejecutar(
      () => crearUsuario(form),
      `Usuario creado: ${form.email.trim().toLowerCase()}. Dale su correo y contraseña para que entre.`,
    )
    if (ok) setForm(VACIO)
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-4">
      <div>
        <h2 className="text-base font-semibold">Usuarios</h2>
        <p className="text-sm text-base-content/60">
          Solo tú, como owner, puedes crear y eliminar cuentas. Cada usuario tiene su propio tablero privado.
        </p>
      </div>

      {/* Crear */}
      <form onSubmit={crear} className="rounded-xl border border-base-300 bg-base-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold">Nuevo usuario</h3>
        {error && <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{error}</div>}
        {aviso && <div role="status" className="alert alert-success alert-soft py-2 text-sm">{aviso}</div>}

        <div className="grid gap-3 md:grid-cols-3">
          <Campo etiqueta="Nombre">
            <input name="nombre" value={form.nombre} onChange={cambiar} className="input w-full" placeholder="Nombre y apellido" />
          </Campo>
          <Campo etiqueta="Correo electrónico">
            <input name="email" type="email" value={form.email} onChange={cambiar} className="input w-full" placeholder="correo@ejemplo.com" />
          </Campo>
          <Campo etiqueta="Contraseña">
            <div className="join w-full">
              <input
                name="password"
                value={form.password}
                onChange={cambiar}
                className="input join-item w-full font-mono"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                className="btn join-item border-base-300"
                title="Generar contraseña"
                onClick={() => setForm({ ...form, password: generarPassword() })}
              >
                Generar
              </button>
            </div>
          </Campo>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-sm btn-primary" disabled={ocupado}>
            {ocupado && <span className="loading loading-spinner loading-xs" />}
            Crear usuario
          </button>
        </div>
      </form>

      {/* Lista */}
      <section className="rounded-xl border border-base-300 bg-base-100">
        <h3 className="text-sm font-semibold px-5 pt-4 pb-2">
          Cuentas <span className="font-normal text-base-content/50">{usuarios?.length ?? ''}</span>
        </h3>
        {usuarios === null ? (
          <div className="px-5 pb-5">
            <span className="loading loading-spinner loading-sm text-base-content/50" />
          </div>
        ) : (
          <ul className="divide-y divide-base-300">
            {usuarios.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="grid place-items-center size-9 shrink-0 rounded-full bg-primary text-primary-content text-xs font-medium">
                  {iniciales(u.nombre)}
                </span>
                <div className="flex-1 min-w-40 leading-tight">
                  <p className="text-sm font-medium">
                    {u.nombre} {u.id === usuario.id && <span className="text-base-content/50 font-normal">(tú)</span>}
                  </p>
                  <p className="text-xs text-base-content/60 truncate">{u.email}</p>
                </div>
                <span className={`badge badge-sm ${u.rol === 'owner' ? 'badge-primary' : 'badge-ghost'}`}>
                  {u.rol === 'owner' ? 'Owner' : 'Usuario'}
                </span>
                <div className="flex gap-1">
                  <button className="btn btn-xs btn-ghost" onClick={() => setCambiandoClave({ usuario: u, password: '', error: '' })}>
                    Cambiar contraseña
                  </button>
                  {u.rol !== 'owner' && (
                    <button className="btn btn-xs btn-ghost text-error" onClick={() => setABorrar(u)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {aBorrar && (
        <Modal ancho="max-w-md" onCerrar={() => setABorrar(null)}>
          <div className="p-6">
            <h3 className="text-base font-semibold">Eliminar usuario</h3>
            <p className="mt-2 text-sm text-base-content/70">
              ¿Eliminar la cuenta de <strong className="text-base-content">{aBorrar.nombre}</strong> ({aBorrar.email})? Ya no
              podrá entrar y <strong className="text-base-content">se borrará su tablero con todos sus proyectos</strong>. No se
              puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300 bg-base-200/50">
            <button className="btn btn-sm btn-ghost" onClick={() => setABorrar(null)}>Cancelar</button>
            <button
              className="btn btn-sm btn-error"
              disabled={ocupado}
              onClick={async () => {
                const u = aBorrar
                setABorrar(null)
                await ejecutar(() => eliminarUsuario(u.id), `Se ha eliminado la cuenta de ${u.email}.`)
              }}
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}

      {cambiandoClave && (
        <Modal ancho="max-w-md" onCerrar={() => setCambiandoClave(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const { usuario: u, password } = cambiandoClave
              try {
                await cambiarPassword(u.id, password)
                setAviso(`Contraseña cambiada para ${u.email}.`)
                setCambiandoClave(null)
              } catch (err) {
                setCambiandoClave({ ...cambiandoClave, error: err.message })
              }
            }}
          >
            <div className="p-6 space-y-3">
              <h3 className="text-base font-semibold">Cambiar contraseña</h3>
              <p className="text-sm text-base-content/70">{cambiandoClave.usuario.nombre} · {cambiandoClave.usuario.email}</p>
              {cambiandoClave.error && <p className="text-sm text-error">{cambiandoClave.error}</p>}
              <div className="join w-full">
                <input
                  autoFocus
                  className="input join-item w-full font-mono"
                  placeholder="Nueva contraseña (mínimo 6)"
                  value={cambiandoClave.password}
                  onChange={(e) => setCambiandoClave({ ...cambiandoClave, password: e.target.value })}
                />
                <button
                  type="button"
                  className="btn join-item border-base-300"
                  onClick={() => setCambiandoClave({ ...cambiandoClave, password: generarPassword() })}
                >
                  Generar
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300 bg-base-200/50">
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCambiandoClave(null)}>Cancelar</button>
              <button type="submit" className="btn btn-sm btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Campo({ etiqueta, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-base-content/70">{etiqueta}</span>
      {children}
    </div>
  )
}
