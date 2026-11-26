import { ESTADOS, findOption } from '../constants'
import { clave } from '../hooks/useProyectos'
import {
  IconoCarpeta,
  IconoCheck,
  IconoFlecha,
  IconoGrafico,
  IconoPorcentaje,
  IconoPrioridad,
  IconoReloj,
  IconoTablero,
} from './Iconos'

const COLOR_BARRA = {
  por_hacer: 'bg-base-content/40',
  en_curso: 'bg-info',
  en_revision: 'bg-warning',
  pruebas: 'bg-secondary',
  hecho: 'bg-success',
}

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

export default function Resumen({ proyectos, onAbrir, onIrTablero }) {
  const total = proyectos.length
  const hechos = proyectos.filter((p) => p.estado === 'hecho')
  const activos = proyectos.filter((p) => p.estado !== 'hecho')
  const enValidacion = proyectos.filter((p) => p.estado === 'en_revision' || p.estado === 'pruebas')
  const altaPendientes = activos.filter((p) => p.prioridad === 'alta').length
  const tasa = total ? Math.round((hechos.length / total) * 100) : 0
  const hoy = hoyISO()
  const vencidos = activos.filter((p) => p.fecha < hoy).length

  const proximos = [...activos].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5)
  const recientes = [...proyectos]
    .sort((a, b) => (b.actualizado ?? b.creado ?? 0) - (a.actualizado ?? a.creado ?? 0))
    .slice(0, 5)

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-[1600px]">
      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Indicador Icono={IconoCarpeta} color="bg-info/10 text-info" titulo="Proyectos activos" valor={activos.length}
          pie={`${total} proyectos en total`} />
        <Indicador Icono={IconoReloj} color="bg-warning/10 text-warning" titulo="Pendientes de validar"
          valor={enValidacion.length} pie="En revisión y pruebas" />
        <Indicador Icono={IconoCheck} color="bg-success/10 text-success" titulo="Completados" valor={hechos.length}
          pie={`${vencidos} con fecha vencida`} progreso={tasa} />
        <Indicador Icono={IconoPorcentaje} color="bg-base-200 text-base-content/70" titulo="Tasa de finalización"
          valor={`${tasa}%`} pie={`${altaPendientes} de prioridad alta pendientes`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por estado */}
        <Tarjeta titulo="Proyectos por estado" subtitulo="Distribución actual">
          {total === 0 ? (
            <Vacio Icono={IconoGrafico} titulo="Aún no hay proyectos"
              texto="Crea el primero para ver su distribución por estado." accion="Ir al tablero" onAccion={onIrTablero} />
          ) : (
            <ul className="space-y-4 pt-2">
              {ESTADOS.map((e) => {
                const n = proyectos.filter((p) => p.estado === e.value).length
                return (
                  <li key={e.value}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span>{e.label}</span>
                      <span className="text-base-content/60">{n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                      <div className={`h-full rounded-full ${COLOR_BARRA[e.value]}`} style={{ width: `${(n / total) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Tarjeta>

        {/* Próximas fechas */}
        <Tarjeta titulo="Próximas fechas" subtitulo="Proyectos sin terminar · Por fecha">
          {proximos.length === 0 ? (
            <Vacio Icono={IconoReloj} titulo="Nada pendiente" texto="Los proyectos sin terminar aparecerán aquí." />
          ) : (
            <ListaProyectos proyectos={proximos} onAbrir={onAbrir} hoy={hoy} />
          )}
        </Tarjeta>
      </div>

      {/* Recientes */}
      <Tarjeta
        titulo="Proyectos recientes"
        subtitulo="Últimos cambios"
        enlace={
          <button className="flex items-center gap-1 text-sm hover:underline" onClick={onIrTablero}>
            Ver tablero <IconoFlecha className="size-3.5" />
          </button>
        }
      >
        {recientes.length === 0 ? (
          <Vacio Icono={IconoTablero} titulo="Sin proyectos todavía" texto="Cuando crees proyectos los verás aquí." />
        ) : (
          <ListaProyectos proyectos={recientes} onAbrir={onAbrir} hoy={hoy} />
        )}
      </Tarjeta>
    </div>
  )
}

function Indicador({ Icono, color, titulo, valor, pie, progreso }) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-1">
      <div className="flex gap-3 rounded-lg border border-base-300 p-3.5">
        <span className={`grid place-items-center size-8 rounded-md shrink-0 ${color}`}>
          <Icono className="size-4" />
        </span>
        <div>
          <p className="text-xs text-base-content/70">{titulo}</p>
          <p className="text-xl font-semibold mt-0.5">{valor}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <p className="text-xs text-base-content/70 flex-1">{pie}</p>
        {progreso !== undefined && (
          <div className="w-16 h-1 rounded-full bg-base-200 overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${progreso}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

function Tarjeta({ titulo, subtitulo, enlace, children }) {
  return (
    <section className="rounded-xl border border-base-300 bg-base-100 p-4 flex flex-col min-h-72">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="text-xs text-base-content/60">{subtitulo}</p>
        </div>
        {enlace}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  )
}

function Vacio({ Icono, titulo, texto, accion, onAccion }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
      <Icono className="size-7 mb-3" />
      <p className="text-sm font-medium">{titulo}</p>
      <p className="text-xs text-base-content/60 mt-1 max-w-64">{texto}</p>
      {accion && (
        <button className="flex items-center gap-1 text-sm mt-4 hover:underline" onClick={onAccion}>
          {accion} <IconoFlecha className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function ListaProyectos({ proyectos, onAbrir, hoy }) {
  return (
    <ul className="divide-y divide-base-300 -mx-2">
      {proyectos.map((p) => {
        const est = findOption(ESTADOS, p.estado)
        const vencido = p.estado !== 'hecho' && p.fecha < hoy
        return (
          <li key={p.id}>
            <button
              onClick={() => onAbrir(p.id)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-base-200/60 transition"
            >
              <IconoPrioridad prioridad={p.prioridad} />
              <span className="text-xs text-base-content/50 w-14 shrink-0">{clave(p)}</span>
              <span className="text-sm flex-1 truncate">{p.titulo}</span>
              <span className={`badge badge-sm badge-soft ${est.badge} hidden sm:inline-flex`}>{est.label}</span>
              <span className={`text-xs w-14 text-right shrink-0 ${vencido ? 'text-error font-medium' : 'text-base-content/60'}`}>
                {fechaCorta(p.fecha)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
