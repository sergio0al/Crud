import { iniciales } from '../auth'
import { IconoCasa, IconoClassroom, IconoLogo, IconoSalir, IconoTablero } from './Iconos'

const SECCIONES = [
  { titulo: 'General', items: [{ id: 'resumen', label: 'Resumen', Icono: IconoCasa }] },
  { titulo: 'Proyectos', items: [{ id: 'tablero', label: 'Tablero', Icono: IconoTablero }] },
]

export default function Sidebar({ vista, onVista, usuario, onSalir, totalProyectos, onClassroom, estadoClassroom }) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-base-300 bg-base-100">
      <div className="flex items-center gap-3 h-16 px-5">
        <IconoLogo className="w-7 shrink-0" />
        <div className="hidden md:block leading-tight">
          <p className="text-sm font-semibold">Proyectos</p>
          <p className="text-xs text-base-content/60">Gestión</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-4 space-y-6">
        {SECCIONES.map((s) => (
          <div key={s.titulo}>
            <p className="hidden md:block px-3 mb-1.5 text-xs text-base-content/60">{s.titulo}</p>
            <ul className="space-y-0.5">
              {s.items.map(({ id, label, Icono }) => {
                const activo = vista === id
                return (
                  <li key={id}>
                    <button
                      onClick={() => onVista(id)}
                      title={label}
                      className={`w-full flex items-center justify-center md:justify-start gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        activo ? 'bg-base-200 font-medium' : 'text-base-content/80 hover:bg-base-200/60'
                      }`}
                    >
                      <Icono className="size-[18px] shrink-0" />
                      <span className="hidden md:inline flex-1 text-left">{label}</span>
                      {id === 'tablero' && (
                        <span className="hidden md:inline text-xs text-base-content/50">{totalProyectos}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div>
          <p className="px-3 mb-1.5 text-xs text-base-content/60">Integraciones</p>
          <button
            onClick={onClassroom}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-base-content/80 hover:bg-base-200/60 transition"
          >
            <IconoClassroom className="size-[18px] shrink-0" />
            <span className="flex-1 text-left">Classroom</span>
            <span
              title={estadoClassroom}
              className={`size-2 rounded-full ${
                estadoClassroom === 'conectado' ? 'bg-success' : estadoClassroom === 'error' ? 'bg-error' : 'bg-base-content/20'
              }`}
            />
          </button>
        </div>
      </nav>

      <div className="border-t border-base-300 p-3 md:px-4 flex items-center gap-3">
        <div className="grid place-items-center size-9 shrink-0 rounded-full bg-base-200 text-sm font-medium">
          {iniciales(usuario.nombre)}
        </div>
        <div className="hidden md:block flex-1 min-w-0 leading-tight">
          <p className="text-sm truncate">{usuario.nombre}</p>
          <p className="text-xs text-base-content/60 truncate">{usuario.email}</p>
        </div>
        <button
          onClick={onSalir}
          className="hidden md:grid btn btn-ghost btn-sm btn-square"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <IconoSalir className="size-[18px]" />
        </button>
      </div>
    </aside>
  )
}
