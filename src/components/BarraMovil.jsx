import { iniciales } from '../auth'
import { IconoBuscar, IconoCasa, IconoMas, IconoSalir, IconoTablero } from './Iconos'

// Barra de navegación inferior, solo visible en móvil
export default function BarraMovil({ vista, onVista, onNuevo, onBuscar, usuario, onSalir }) {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 h-16 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]">
      <Boton activo={vista === 'resumen'} onClick={() => onVista('resumen')} Icono={IconoCasa} texto="Resumen" />
      <Boton activo={vista === 'tablero'} onClick={() => onVista('tablero')} Icono={IconoTablero} texto="Tablero" />
      <Boton onClick={onNuevo} Icono={IconoMas} texto="Nuevo" />
      <Boton onClick={onBuscar} Icono={IconoBuscar} texto="Buscar" />

      <div className="dropdown dropdown-top dropdown-end">
        <button tabIndex={0} className="w-full h-16 flex flex-col items-center justify-center gap-1 text-xs text-base-content/70">
          <span className="grid place-items-center size-5 rounded-full bg-base-200 text-[9px] font-semibold">
            {iniciales(usuario.nombre)}
          </span>
          Cuenta
        </button>
        <ul tabIndex={0} className="dropdown-content menu bg-base-100 border border-base-300 rounded-box shadow-lg w-56 mb-2 mr-2 z-50">
          <li className="menu-title">
            <span className="text-base-content">{usuario.nombre}</span>
            <span className="font-normal truncate">{usuario.email}</span>
          </li>
          <li>
            <button onClick={onSalir}>
              <IconoSalir className="size-4" /> Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

function Boton({ activo, onClick, Icono, texto }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 text-xs transition ${
        activo ? 'font-semibold text-base-content' : 'text-base-content/70'
      }`}
    >
      {activo && <span className="absolute top-0 inset-x-0 h-0.5 bg-base-content" />}
      <Icono className="size-5" />
      {texto}
    </button>
  )
}
