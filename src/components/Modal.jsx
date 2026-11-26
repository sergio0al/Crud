import { useEffect, useRef } from 'react'

// Pila de modales abiertos: Escape solo cierra el que está encima
const pila = []

export default function Modal({ ancho = 'max-w-2xl', clase = '', onCerrar, children }) {
  const cerrar = useRef(onCerrar)
  useEffect(() => {
    cerrar.current = onCerrar
  })

  useEffect(() => {
    const id = Symbol('modal')
    pila.push(id)
    const esc = (e) => e.key === 'Escape' && pila.at(-1) === id && cerrar.current()
    window.addEventListener('keydown', esc)
    return () => {
      pila.splice(pila.indexOf(id), 1)
      window.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <div className="modal modal-open">
      <div className={`modal-box p-0 rounded-xl border border-base-300 shadow-xl w-11/12 ${ancho} ${clase}`}>
        {children}
      </div>
      <div className="modal-backdrop bg-black/25" onClick={onCerrar} />
    </div>
  )
}
