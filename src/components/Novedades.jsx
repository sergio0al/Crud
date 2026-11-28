import { NOVEDADES } from '../novedades'

const TIPOS = {
  nuevo: { texto: 'Nuevo', clase: 'badge-success' },
  mejora: { texto: 'Mejora', clase: 'badge-info' },
  cambio: { texto: 'Cambio', clase: 'badge-warning' },
  quitado: { texto: 'Retirado', clase: 'badge-neutral' },
}

const fechaLarga = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Historial de actualizaciones de la app, agrupado por día
export default function Novedades({ vistaAntes = 0 }) {
  const dias = []
  for (const n of NOVEDADES) {
    const dia = dias.at(-1)
    if (dia?.fecha === n.fecha) dia.items.push(n)
    else dias.push({ fecha: n.fecha, items: [n] })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <p className="text-sm text-base-content/60">Todo lo que ha ido cambiando en Sarflow, de lo más reciente a lo más antiguo.</p>

      {dias.map((d) => (
        <section key={d.fecha}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50 first-letter:uppercase">
            {fechaLarga(d.fecha)}
          </h2>
          <ul className="rounded-xl border border-base-300 bg-base-100 divide-y divide-base-300">
            {d.items.map((n) => {
              const tipo = TIPOS[n.tipo] ?? TIPOS.nuevo
              const sinVer = n.id > vistaAntes
              return (
                <li key={n.id} className="flex gap-3 p-4">
                  <span className={`badge badge-sm badge-soft ${tipo.clase} shrink-0 mt-0.5 w-16`}>{tipo.texto}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {n.titulo}
                      {sinVer && <span className="size-1.5 rounded-full bg-info" title="No lo habías visto" />}
                    </p>
                    <p className="mt-0.5 text-sm text-base-content/70">{n.texto}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
