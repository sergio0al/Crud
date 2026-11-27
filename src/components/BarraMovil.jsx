import { useState } from 'react'
import { iniciales } from '../auth'
import { IconoAjustes, IconoBuscar, IconoCasa, IconoMas, IconoSalir, IconoTablero, IconoUsuarios } from './Iconos'

// Barra de navegación inferior, solo visible en móvil.
// El menú "Cuenta" se abre con estado (no con foco), para que funcione también en Safari de iPhone.
export default function BarraMovil({ vista, onVista, onNuevo, onBuscar, usuario, onSalir, integraciones, onIntegracion, owner }) {
  const [cuentaAbierta, setCuentaAbierta] = useState(false)
  const cerrarY = (accion) => () => {
    setCuentaAbierta(false)
    accion()
  }

  return (
    <>
      {cuentaAbierta && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setCuentaAbierta(false)}>
          <div className="absolute inset-0 bg-black/25" />
          <div
            className="absolute inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] rounded-box border border-base-300 bg-base-100 shadow-xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-base-300 mb-1">
              <span className="grid place-items-center size-9 rounded-full bg-base-200 text-sm font-medium">
                {iniciales(usuario.nombre)}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-medium truncate">{usuario.nombre}</p>
                <p className="text-xs text-base-content/60 truncate">{usuario.email}</p>
              </div>
            </div>
            {integraciones.map(({ clave, info, estadoTexto }) => (
              <Opcion key={clave} Icono={info.Icono} texto={info.nombre} onClick={cerrarY(() => onIntegracion(clave))}>
                <PuntoEstado estado={estadoTexto} />
              </Opcion>
            ))}
            {owner && <Opcion Icono={IconoUsuarios} texto="Usuarios" onClick={cerrarY(() => onVista('usuarios'))} />}
            <Opcion Icono={IconoAjustes} texto="Configuración" onClick={cerrarY(() => onVista('configuracion'))} />
            <Opcion Icono={IconoSalir} texto="Cerrar sesión" onClick={cerrarY(onSalir)} peligro />
          </div>
        </div>
      )}

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 h-16 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]">
        <Boton activo={vista === 'resumen'} onClick={cerrarY(() => onVista('resumen'))} Icono={IconoCasa} texto="Resumen" />
        <Boton activo={vista === 'tablero'} onClick={cerrarY(() => onVista('tablero'))} Icono={IconoTablero} texto="Tablero" />
        <Boton onClick={cerrarY(onNuevo)} Icono={IconoMas} texto="Nuevo" />
        <Boton onClick={cerrarY(onBuscar)} Icono={IconoBuscar} texto="Buscar" />
        <button
          onClick={() => setCuentaAbierta(!cuentaAbierta)}
          aria-expanded={cuentaAbierta}
          className={`relative flex flex-col items-center justify-center gap-1 text-xs transition ${
            cuentaAbierta || vista === 'configuracion' || vista === 'usuarios' ? 'font-semibold text-base-content' : 'text-base-content/70'
          }`}
        >
          {(cuentaAbierta || vista === 'configuracion' || vista === 'usuarios') && <span className="absolute top-0 inset-x-0 h-0.5 bg-base-content" />}
          <span className="relative grid place-items-center size-5 rounded-full bg-base-200 text-[9px] font-semibold">
            {iniciales(usuario.nombre)}
            {integraciones.some((i) => i.estadoTexto === 'error') && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-error" />}
          </span>
          Cuenta
        </button>
      </nav>
    </>
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

function Opcion({ Icono, texto, onClick, peligro, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-left hover:bg-base-200 active:bg-base-200 ${
        peligro ? 'text-error' : ''
      }`}
    >
      <Icono className="size-5 shrink-0" />
      <span className="flex-1">{texto}</span>
      {children}
    </button>
  )
}

function PuntoEstado({ estado }) {
  const estilos = { conectado: 'bg-success', error: 'bg-error', desconectado: 'bg-base-content/20' }
  const textos = { conectado: 'Conectado', error: 'Error', desconectado: 'Sin conectar' }
  return (
    <span className="flex items-center gap-1.5 text-xs text-base-content/60">
      <span className={`size-2 rounded-full ${estilos[estado] ?? estilos.desconectado}`} />
      {textos[estado] ?? textos.desconectado}
    </span>
  )
}
