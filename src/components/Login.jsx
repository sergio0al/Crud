import { useState } from 'react'
import { iniciarSesion, registrar } from '../auth'
import { IconoLogo } from './Iconos'

export default function Login({ onEntrar }) {
  const [modo, setModo] = useState('login') // 'login' | 'registro'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [error, setError] = useState('')

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const enviar = (e) => {
    e.preventDefault()
    try {
      onEntrar(modo === 'login' ? iniciarSesion(form.email, form.password) : registrar(form))
    } catch (err) {
      setError(err.message)
    }
  }

  const alternar = () => {
    setModo(modo === 'login' ? 'registro' : 'login')
    setError('')
  }

  return (
    <div className="min-h-screen bg-base-200 grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <IconoLogo className="w-9" />
          <h1 className="text-2xl font-semibold">Proyectos</h1>
        </div>

        <form onSubmit={enviar} className="card bg-base-100 border border-base-300">
          <div className="card-body gap-3">
            <h2 className="text-lg font-semibold text-center">
              {modo === 'login' ? 'Inicia sesión para continuar' : 'Crear una cuenta'}
            </h2>

            {error && <div role="alert" className="alert alert-error alert-soft py-2 text-sm">{error}</div>}

            {modo === 'registro' && (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Nombre</legend>
                <input name="nombre" value={form.nombre} onChange={cambiar} className="input w-full" placeholder="Tu nombre" />
              </fieldset>
            )}

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

            <button type="submit" className="btn btn-primary w-full mt-2">
              {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>

            <p className="text-sm text-center text-base-content/70">
              {modo === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button type="button" className="link link-accent" onClick={alternar}>
                {modo === 'login' ? 'Crear una' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
