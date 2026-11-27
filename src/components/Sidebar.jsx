import { iniciales } from '../auth'
import { IconoAjustes, IconoCasa, IconoLogo, IconoMas, IconoSalir, IconoTablero, IconoUsuarios } from './Iconos'
import { IconoTabla } from './TablasCompartidas'

const SECCIONES = [
  { titulo: 'General', items: [{ id: 'resumen', label: 'Resumen', Icono: IconoCasa }] },
  { titulo: 'Proyectos', items: [{ id: 'tablero', label: 'Tablero', Icono: IconoTablero }] },
]

export default function Sidebar({ vista, onVista, usuario, onSalir, totalProyectos, integraciones, onIntegracion, owner, tablas, conteos, onNuevaTabla }) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-base-300 bg-base-100">
      <div className="flex items-center gap-3 h-16 px-5">
        <IconoLogo className="size-8 shrink-0" />
        <div className="hidden md:block leading-tight">
          <p className="text-[15px] font-bold tracking-tight">Sarflow</p>
          <p className="text-xs text-base-content/60">by Sergio Alonso</p>
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

        {tablas.disponible && (
          <div>
            <div className="flex items-center justify-between px-3 mb-1.5">
              <p className="text-xs text-base-content/60">Tablas compartidas</p>
              <button
                onClick={onNuevaTabla}
                className="btn btn-ghost btn-xs btn-square -mr-1.5"
                title="Nueva tabla compartida"
                aria-label="Nueva tabla compartida"
              >
                <IconoMas className="size-3.5" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {tablas.tableros.map((t) => {
                const activo = vista === `t:${t.id}`
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => onVista(`t:${t.id}`)}
                      title={t.nombre}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        activo ? 'bg-base-200 font-medium' : 'text-base-content/80 hover:bg-base-200/60'
                      }`}
                    >
                      <IconoTabla nombre={t.nombre} />
                      <span className="flex-1 min-w-0 truncate text-left">{t.nombre}</span>
                      <span className="flex items-center gap-1 text-xs text-base-content/50" title={`${t.miembros} miembros`}>
                        {conteos[t.id] ?? 0}
                      </span>
                    </button>
                  </li>
                )
              })}
              {tablas.tableros.length === 0 && (
                <li>
                  <button
                    onClick={onNuevaTabla}
                    className="w-full flex items-center gap-3 rounded-lg border border-dashed border-base-300 px-3 py-2 text-sm text-base-content/50 hover:bg-base-200/60 hover:text-base-content transition"
                  >
                    <IconoMas className="size-[18px] shrink-0" />
                    <span className="flex-1 text-left">Crear tabla compartida</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}

        <div>
          <p className="px-3 mb-1.5 text-xs text-base-content/60">Integraciones</p>
          {integraciones.map(({ clave, info: { corto, Icono }, estadoTexto }) => (
            <button
              key={clave}
              onClick={() => onIntegracion(clave)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-base-content/80 hover:bg-base-200/60 transition"
            >
              <Icono className="size-[18px] shrink-0" />
              <span className="flex-1 text-left">{corto}</span>
              <span title={estadoTexto} className={`size-2 rounded-full ${estadoTexto === 'conectado' ? 'bg-success' : estadoTexto === 'error' ? 'bg-error' : 'bg-base-content/20'}`} />
            </button>
          ))}
        </div>

        <div>
          <p className="px-3 mb-1.5 text-xs text-base-content/60">Ajustes</p>
          {owner && (
            <button
              onClick={() => onVista('usuarios')}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                vista === 'usuarios' ? 'bg-base-200 font-medium' : 'text-base-content/80 hover:bg-base-200/60'
              }`}
            >
              <IconoUsuarios className="size-[18px] shrink-0" />
              <span className="flex-1 text-left">Usuarios</span>
            </button>
          )}
          <button
            onClick={() => onVista('configuracion')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              vista === 'configuracion' ? 'bg-base-200 font-medium' : 'text-base-content/80 hover:bg-base-200/60'
            }`}
          >
            <IconoAjustes className="size-[18px] shrink-0" />
            <span className="flex-1 text-left">Configuración</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-base-300 p-3 md:px-4 flex items-center gap-3">
        <div className="grid place-items-center size-9 shrink-0 rounded-full bg-base-200 text-sm font-medium">
          {iniciales(usuario.nombre)}
        </div>
        <div className="hidden md:block flex-1 min-w-0 leading-tight">
          <p className="text-sm truncate">{usuario.nombre}</p>
          <p className="text-xs text-base-content/60 truncate">{owner ? 'Owner' : usuario.email}</p>
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
