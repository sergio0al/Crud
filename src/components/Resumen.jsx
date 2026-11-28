import { useState } from 'react'
import { ESTADOS, findOption } from '../constants'
import { clave } from '../hooks/useProyectos'
import { integracionDe } from '../integraciones'
import {
  IconoCarpeta,
  IconoCheck,
  IconoComentario,
  IconoFlecha,
  IconoGrafico,
  IconoMas,
  IconoPorcentaje,
  IconoPrioridad,
  IconoReloj,
  IconoTablero,
  IconoUsuarios,
} from './Iconos'

const COLOR_BARRA = {
  por_hacer: 'bg-base-content/40',
  en_curso: 'bg-info',
  en_revision: 'bg-warning',
  pruebas: 'bg-secondary',
  hecho: 'bg-success',
}

// Icono de las notificaciones de cambio de estado
const COLOR_AVISO = {
  por_hacer: 'bg-base-200 text-base-content/70',
  en_curso: 'bg-info/10 text-info',
  en_revision: 'bg-warning/10 text-warning',
  pruebas: 'bg-secondary/10 text-secondary',
  hecho: 'bg-success/10 text-success',
}

const DIA = 86400000
const hoyISO = () => new Date().toISOString().slice(0, 10)
const diasHasta = (iso, hoy) => Math.round((new Date(iso + 'T00:00:00') - new Date(hoy + 'T00:00:00')) / DIA)
const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')

export default function Resumen({ proyectos, todos = proyectos, cambios = [], tableros = [], usuarioId, onAbrir, onIrTablero }) {
  const total = proyectos.length
  const hechos = proyectos.filter((p) => p.estado === 'hecho')
  const activos = proyectos.filter((p) => p.estado !== 'hecho')
  const enValidacion = proyectos.filter((p) => p.estado === 'en_revision' || p.estado === 'pruebas')
  const altaPendientes = activos.filter((p) => p.prioridad === 'alta').length
  const tasa = total ? Math.round((hechos.length / total) * 100) : 0
  const hoy = hoyISO()
  const vencidos = activos.filter((p) => p.fecha < hoy).length

  const proximos = [...activos].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 6)
  const recientes = [...proyectos]
    .sort((a, b) => (b.actualizado ?? b.creado ?? 0) - (a.actualizado ?? a.creado ?? 0))
    .slice(0, 5)

  return (
    <div className="p-4 md:p-8 min-h-full flex flex-col gap-4">
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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

        {/* Notificaciones */}
        <Notificaciones todos={todos} cambios={cambios} tableros={tableros} usuarioId={usuarioId} hoy={hoy} onAbrir={onAbrir} />
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
        bajo
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

function Tarjeta({ titulo, subtitulo, enlace, bajo, children }) {
  return (
    <section className={`rounded-xl border border-base-300 bg-base-100 p-4 flex flex-col min-w-0 ${bajo ? '' : 'min-h-72'}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="text-xs text-base-content/60">{subtitulo}</p>
        </div>
        {enlace}
      </div>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
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

// ---------- Notificaciones: lo nuevo de los últimos 14 días ----------
const VENTANA = 14 * DIA

function haceCuanto(ms) {
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

// Las notificaciones de lo que hago yo salen, pero nunca como "nuevas"
function crearNotificaciones(todos, cambios, tableros, usuarioId, hoy) {
  const desde = Date.now() - VENTANA
  const inicioHoy = new Date(hoy + 'T00:00:00').getTime()
  const nombreTabla = (id) => tableros.find((t) => t.id === id)?.nombre ?? 'una tabla compartida'
  const enTabla = (p) => (p.tablero_id !== null ? ` en ${nombreTabla(p.tablero_id)}` : '')
  const porId = new Map(todos.map((p) => [p.id, p]))
  const lista = []

  // Cambios de estado
  for (const c of cambios) {
    const p = porId.get(c.proyectoId)
    if (!p || c.fecha < desde) continue
    const a = findOption(ESTADOS, c.a).label
    const quien = c.autorId === usuarioId ? 'Moviste' : c.autorNombre ? `${c.autorNombre} movió` : 'Se movió sola'
    lista.push({
      id: `e${c.id}`, p, fecha: c.fecha, mia: c.autorId === usuarioId,
      Icono: c.a === 'hecho' ? IconoCheck : IconoFlecha,
      color: COLOR_AVISO[c.a] ?? COLOR_AVISO.por_hacer,
      texto: `${quien} a ${a}${enTabla(p)}`,
    })
  }

  for (const p of todos) {
    // Tareas que me han asignado
    if (p.asignado === usuarioId && p.asignadoEn >= desde) {
      const mia = p.asignadoPor === usuarioId
      lista.push({ id: `a${p.id}${p.asignadoEn}`, p, fecha: p.asignadoEn, mia, Icono: IconoUsuarios, color: 'bg-primary/10 text-primary', texto: `${mia ? 'Te la asignaste' : `${p.asignadoPorNombre ?? 'Alguien'} te asignó esta tarea`}${enTabla(p)}` })
    }
    // Tareas nuevas: de Classroom/Moodle o de las tablas compartidas (grupos)
    if (p.creado >= desde) {
      const origen = integracionDe(p)
      const mia = p.user_id === usuarioId
      if (p.tablero_id !== null)
        lista.push({ id: `n${p.id}`, p, fecha: p.creado, mia, Icono: IconoMas, color: 'bg-info/10 text-info', texto: `${mia ? 'Creaste' : `${p.autorNombre} creó`} una tarea${enTabla(p)}` })
      else if (origen) lista.push({ id: `n${p.id}`, p, fecha: p.creado, Icono: origen.Icono, color: origen.color, texto: `Nueva tarea de ${origen.corto}` })
    }
    // Comentarios de otras personas
    for (const c of p.comentarios ?? [])
      if (c.fecha >= desde && c.autorId !== usuarioId)
        lista.push({ id: `c${c.id}`, p, fecha: c.fecha, Icono: IconoComentario, color: 'bg-secondary/10 text-secondary', texto: `${c.autorNombre} comentó`, cita: c.texto })
    // Entregas para hoy o mañana
    const dias = diasHasta(p.fecha, hoy)
    if (p.estado !== 'hecho' && (dias === 0 || dias === 1))
      lista.push({ id: `v${p.id}`, p, fecha: inicioHoy, Icono: IconoReloj, color: 'bg-warning/10 text-warning', texto: dias === 0 ? 'Se entrega hoy' : 'Se entrega mañana' })
  }
  return lista.sort((a, b) => b.fecha - a.fecha).slice(0, 30)
}

function Notificaciones({ todos, cambios, tableros, usuarioId, hoy, onAbrir }) {
  const claveVistas = `notificaciones_vistas_${usuarioId}`
  const [vistas, setVistas] = useState(() => Number(localStorage.getItem(claveVistas)) || 0)
  const lista = crearNotificaciones(todos, cambios, tableros, usuarioId, hoy)
  const esNueva = (n) => !n.mia && n.fecha > vistas
  const nuevas = lista.filter(esNueva).length

  const marcarLeidas = () => {
    const ahora = Date.now()
    localStorage.setItem(claveVistas, String(ahora))
    setVistas(ahora)
  }

  return (
    <Tarjeta
      titulo={
        <span className="flex items-center gap-2">
          Notificaciones
          {nuevas > 0 && <span className="badge badge-xs badge-soft badge-info">{nuevas} nuevas</span>}
        </span>
      }
      subtitulo="Lo nuevo de los últimos 14 días"
      enlace={
        nuevas > 0 && (
          <button className="text-sm hover:underline shrink-0" onClick={marcarLeidas}>
            Marcar leídas
          </button>
        )
      }
    >
      {lista.length === 0 ? (
        <Vacio Icono={IconoCheck} titulo="Todo al día" texto="Aquí verás las tareas nuevas, los comentarios y lo que vence pronto." />
      ) : (
        <div className="relative flex-1 min-h-48">
          <ul className="absolute inset-0 overflow-y-auto divide-y divide-base-300 -mx-2">
            {lista.map((n) => {
              const nueva = esNueva(n)
              return (
                <li key={n.id}>
                  <button
                    onClick={() => onAbrir(n.p.id)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left hover:bg-base-200/60 transition"
                  >
                    <span className={`grid place-items-center size-7 rounded-md shrink-0 ${n.color}`}>
                      <n.Icono className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm truncate">{n.p.titulo}</span>
                      <span className="block text-xs text-base-content/60 truncate">
                        {n.texto}
                        {n.cita ? `: «${n.cita}»` : ''}
                      </span>
                    </span>
                    <span className="text-xs text-base-content/50 shrink-0">{haceCuanto(n.fecha)}</span>
                    <span className={`size-1.5 rounded-full shrink-0 ${nueva ? 'bg-info' : 'bg-transparent'}`} title={nueva ? 'Nueva' : undefined} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Tarjeta>
  )
}
