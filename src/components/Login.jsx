import { useState } from 'react'
import { iniciarSesion } from '../auth'
import { IconoLogo } from './Iconos'

// Solo inicio de sesión: las cuentas las crea el owner desde "Usuarios"
export default function Login({ onEntrar }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      onEntrar(await iniciarSesion(form.email, form.password))
    } catch (err) {
      setError(err.message)
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <IconoLogo className="size-12" />
          <h1 className="text-2xl font-bold tracking-tight">Sarflow</h1>
          <p className="-mt-1.5 text-sm text-base-content/60">Tus tareas, en orden · by Sergio Alonso Rojals</p>
        </div>

        <form onSubmit={enviar} className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h2 className="text-lg font-semibold text-center">Inicia sesión para continuar</h2>

            {error && <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Correo electrónico</legend>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={cambiar}
                className="input w-full"
                placeholder="tu@correo.com"
                autoFocus
                required
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Contraseña</legend>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={cambiar}
                className="input w-full"
                placeholder="••••"
                required
              />
            </fieldset>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={entrando}>
              {entrando && <span className="loading loading-spinner loading-xs" />}
              Iniciar sesión
            </button>

            <p className="text-sm text-center text-base-content/60">
              ¿No tienes cuenta? Pídesela al administrador.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
