// Asignaturas: cada tarea puede pertenecer a una. Las que vienen de Classroom o Moodle la toman del curso.

/** Nombre de la asignatura de una tarea ('' si no tiene) */
export const asignaturaDe = (p) => (p.asignatura ?? p.origen?.curso ?? '').trim()

/** Lista ordenada de asignaturas distintas con cuántas tareas tiene cada una */
export function listarAsignaturas(proyectos) {
  const cuenta = new Map()
  for (const p of proyectos) {
    const a = asignaturaDe(p)
    if (a) cuenta.set(a, (cuenta.get(a) ?? 0) + 1)
  }
  return [...cuenta].map(([nombre, total]) => ({ nombre, total })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// Tono estable para cada nombre: la misma asignatura siempre tiene el mismo color
const tono = (nombre) => {
  let h = 0
  for (const c of nombre.toLowerCase()) h = (h * 31 + c.codePointAt(0)) >>> 0
  return (h % 24) * 15 // 24 tonos separados 15°
}

/** Estilos en línea para la etiqueta de una asignatura (se leen bien en tema claro y oscuro) */
export function colorAsignatura(nombre) {
  const h = tono(nombre)
  return {
    etiqueta: {
      backgroundColor: `oklch(0.7 0.13 ${h} / 0.16)`,
      color: `color-mix(in oklch, oklch(0.6 0.16 ${h}) 75%, var(--color-base-content))`,
    },
    punto: { backgroundColor: `oklch(0.65 0.16 ${h})` },
  }
}
