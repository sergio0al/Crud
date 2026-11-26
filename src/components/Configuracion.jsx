import { useState } from 'react'
import { COLORES, TEMA_INICIAL, cargarTema, esHex, guardarTema } from '../tema'
import { actualizarPerfil } from '../auth'
import { IconoCheck, IconoClassroom, IconoPrioridad } from './Iconos'

const MODOS = [
  { value: 'claro', label: 'Claro' },
  { value: 'oscuro', label: 'Oscuro' },
  { value: 'sistema', label: 'Sistema' },
]

const OPCIONES_ESQUINAS = [
  { value: 'rectas', label: 'Rectas', clase: 'rounded-sm' },
  { value: 'suaves', label: 'Suaves', clase: 'rounded-lg' },
  { value: 'redondas', label: 'Redondas', clase: 'rounded-2xl' },
]

export default function Configuracion({ usuario, onActualizarUsuario, onClassroom, estadoClassroom }) {
  const [tema, setTema] = useState(cargarTema)
  const [hex, setHex] = useState(tema.color ?? '')

  const cambiar = (campos) => {
    const nuevo = { ...tema, ...campos }
    setTema(nuevo)
    guardarTema(nuevo) // se aplica al momento en toda la app
    // y se guarda en el perfil para que te siga en cualquier dispositivo
    onActualizarUsuario({ tema: nuevo })
    actualizarPerfil(usuario.id, { tema: nuevo }).catch(() => {})
  }

  const elegirColor = (color) => {
    setHex(color ?? '')
    cambiar({ color })
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-4">
      <div>
        <h2 className="text-base font-semibold">Apariencia</h2>
        <p className="text-sm text-base-content/60">Los cambios se aplican al momento y se guardan en tu cuenta.</p>
      </div>

      <Tarjeta titulo="Modo" descripcion="Claro, oscuro o el mismo que tu sistema operativo.">
        <div className="join">
          {MODOS.map((m) => (
            <button
              key={m.value}
              className={`btn btn-sm join-item ${tema.modo === m.value ? 'btn-primary' : 'bg-base-100 border-base-300'}`}
              onClick={() => cambiar({ modo: m.value })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Color principal" descripcion="Botones, avatares, elementos activos y resaltados.">
        <div className="flex flex-wrap gap-2.5">
          <Muestra
            titulo="Por defecto"
            activa={!tema.color}
            onClick={() => elegirColor(null)}
            estilo={{ background: 'conic-gradient(var(--color-base-300) 0 50%, var(--color-base-content) 0 100%)' }}
          />
          {COLORES.map((c) => (
            <Muestra
              key={c.valor}
              titulo={c.nombre}
              activa={tema.color?.toLowerCase() === c.valor}
              onClick={() => elegirColor(c.valor)}
              estilo={{ background: c.valor }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="color"
              className="size-9 cursor-pointer rounded-field border border-base-300 bg-transparent p-0.5"
              value={esHex(tema.color ?? '') ? tema.color : '#1f3d2b'}
              onChange={(e) => elegirColor(e.target.value)}
            />
            Personalizado
          </label>
          <label className="input input-sm w-36 font-mono">
            <span className="text-base-content/50">HEX</span>
            <input
              value={hex}
              placeholder="#1f3d2b"
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                setHex(e.target.value)
                if (esHex(v)) cambiar({ color: v.toLowerCase() })
              }}
            />
          </label>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Esquinas" descripcion="Lo redondeados que se ven botones, tarjetas y ventanas.">
        <div className="flex flex-wrap gap-3">
          {OPCIONES_ESQUINAS.map((o) => (
            <button
              key={o.value}
              onClick={() => cambiar({ esquinas: o.value })}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-box border text-sm transition ${
                tema.esquinas === o.value ? 'border-primary bg-primary/5 font-medium' : 'border-base-300 hover:bg-base-200/60'
              }`}
            >
              <span className={`block w-12 h-8 border-2 border-base-content/40 ${o.clase}`} />
              {o.label}
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Vista previa" descripcion="Así se ven los elementos con tu tema.">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary btn-sm">Nuevo proyecto</button>
          <button className="btn btn-sm">Secundario</button>
          <span className="badge badge-primary">Etiqueta</span>
          <input type="checkbox" className="toggle toggle-primary" defaultChecked aria-label="Interruptor de ejemplo" />
          <span className="grid place-items-center size-8 rounded-full bg-primary text-primary-content text-xs font-medium">SA</span>
          <a className="link link-primary text-sm">Un enlace</a>
        </div>
        <div className="mt-4 max-w-xs rounded-lg border border-base-300 bg-base-100 p-3.5">
          <p className="text-sm font-medium">Tarjeta de ejemplo</p>
          <p className="mt-1 text-xs text-base-content/60">Así se verán las tareas en el tablero.</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-base-content/60">
            PRJ-1
            <span className="ml-auto"><IconoPrioridad prioridad="alta" /></span>
            <span className="grid place-items-center size-6 rounded-full bg-primary text-primary-content text-[10px]">SA</span>
          </div>
        </div>
      </Tarjeta>

      <div className="pt-4">
        <h2 className="text-base font-semibold">Integraciones</h2>
        <p className="text-sm text-base-content/60">Conecta servicios externos para crear proyectos automáticamente.</p>
      </div>

      <Tarjeta titulo="Google Classroom" descripcion="Crea un proyecto por cada correo de “Nueva tarea”.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid place-items-center size-10 rounded-lg bg-success/10 text-success">
            <IconoClassroom className="size-5" />
          </span>
          <span className="flex items-center gap-2 text-sm flex-1">
            <span
              className={`size-2 rounded-full ${
                estadoClassroom === 'conectado' ? 'bg-success' : estadoClassroom === 'error' ? 'bg-error' : 'bg-base-content/20'
              }`}
            />
            {estadoClassroom === 'conectado' ? 'Conectado' : estadoClassroom === 'error' ? 'Conectado con errores' : 'Sin conectar'}
          </span>
          <button className="btn btn-sm" onClick={onClassroom}>
            {estadoClassroom === 'desconectado' ? 'Conectar' : 'Gestionar'}
          </button>
        </div>
      </Tarjeta>

      <div className="flex justify-end">
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => {
            setHex('')
            cambiar({ ...TEMA_INICIAL })
          }}
        >
          Restablecer tema
        </button>
      </div>
    </div>
  )
}

function Tarjeta({ titulo, descripcion, children }) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-5 grid gap-4 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="text-xs text-base-content/60 mt-0.5">{descripcion}</p>
      </div>
      <div>{children}</div>
    </section>
  )
}

function Muestra({ titulo, activa, onClick, estilo }) {
  return (
    <button
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      style={estilo}
      className={`relative grid place-items-center size-9 rounded-full border border-base-300 transition hover:scale-110 ${
        activa ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-base-content' : ''
      }`}
    >
      {activa && <IconoCheck className="size-4 text-white drop-shadow" />}
    </button>
  )
}
