// Renderizador sencillo de formato para descripciones (sin HTML, seguro).
// Admite: # / ## / ### títulos, listas con - * o 1. (anidadas con 2 espacios), **negrita** y `código`.

const ES_LISTA = /^(\s*)([-*]|\d+\.)\s+(.*)$/
const ES_TITULO = /^(#{1,3})\s+(.*)$/

function analizar(texto) {
  const lineas = texto.replace(/\t/g, '  ').split('\n')
  const bloques = []
  let i = 0
  while (i < lineas.length) {
    const linea = lineas[i]
    if (!linea.trim()) {
      i++
      continue
    }
    const titulo = linea.match(ES_TITULO)
    if (titulo) {
      bloques.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] })
      i++
      continue
    }
    if (ES_LISTA.test(linea)) {
      const items = []
      while (i < lineas.length && ES_LISTA.test(lineas[i])) {
        const [, sangria, marca, contenido] = lineas[i].match(ES_LISTA)
        items.push({ nivel: Math.floor(sangria.length / 2), ordenada: /\d/.test(marca), texto: contenido })
        i++
      }
      bloques.push({ tipo: 'lista', nodos: construirArbol(items) })
      continue
    }
    const parrafo = []
    while (i < lineas.length && lineas[i].trim() && !ES_TITULO.test(lineas[i]) && !ES_LISTA.test(lineas[i])) {
      parrafo.push(lineas[i])
      i++
    }
    bloques.push({ tipo: 'parrafo', texto: parrafo.join('\n') })
  }
  return bloques
}

function construirArbol(items) {
  const raiz = { hijos: [] }
  const pila = [{ nivel: -1, nodo: raiz }]
  for (const item of items) {
    while (pila.at(-1).nivel >= item.nivel) pila.pop()
    const nodo = { ...item, hijos: [] }
    pila.at(-1).nodo.hijos.push(nodo)
    pila.push({ nivel: item.nivel, nodo })
  }
  return raiz.hijos
}

function EnLinea({ texto }) {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((trozo, i) => {
    if (trozo.startsWith('**') && trozo.endsWith('**') && trozo.length > 4)
      return <strong key={i} className="font-semibold">{trozo.slice(2, -2)}</strong>
    if (trozo.startsWith('`') && trozo.endsWith('`') && trozo.length > 2)
      return (
        <code key={i} className="rounded bg-base-200 px-1.5 py-0.5 text-[0.85em] font-mono">
          {trozo.slice(1, -1)}
        </code>
      )
    return trozo
  })
}

function Lista({ nodos, profundidad = 0 }) {
  const Etiqueta = nodos[0]?.ordenada ? 'ol' : 'ul'
  const estilo = Etiqueta === 'ol' ? 'list-decimal' : profundidad % 2 ? 'list-[circle]' : 'list-disc'
  return (
    <Etiqueta className={`${estilo} pl-6 space-y-1.5 marker:text-base-content/50`}>
      {nodos.map((n, i) => (
        <li key={i}>
          <EnLinea texto={n.texto} />
          {n.hijos.length > 0 && (
            <div className="mt-1.5">
              <Lista nodos={n.hijos} profundidad={profundidad + 1} />
            </div>
          )}
        </li>
      ))}
    </Etiqueta>
  )
}

const TAMANO_TITULO = { 1: 'text-xl', 2: 'text-lg', 3: 'text-base' }

export default function Markdown({ texto }) {
  return (
    <div className="space-y-3 text-sm leading-6 break-words">
      {analizar(texto).map((b, i) => {
        if (b.tipo === 'titulo') {
          const Etiqueta = `h${b.nivel + 1}`
          return (
            <Etiqueta key={i} className={`${TAMANO_TITULO[b.nivel]} font-semibold pt-2 first:pt-0`}>
              <EnLinea texto={b.texto} />
            </Etiqueta>
          )
        }
        if (b.tipo === 'lista') return <Lista key={i} nodos={b.nodos} />
        return (
          <p key={i} className="whitespace-pre-wrap">
            <EnLinea texto={b.texto} />
          </p>
        )
      })}
    </div>
  )
}
