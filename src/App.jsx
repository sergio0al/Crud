import { useEffect, useRef, useState } from 'react'
import { cerrarSesion, usuarioActual } from './auth'
import { clave, useProyectos } from './hooks/useProyectos'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import BarraMovil from './components/BarraMovil'
import Resumen from './components/Resumen'
import Tablero from './components/Tablero'
import ProyectoPanel from './components/ProyectoPanel'
import Modal from './components/Modal'
import { IconoBuscar, IconoMas } from './components/Iconos'

export default function App() {
  const [usuario, setUsuario] = useState(usuarioActual)
  if (!usuario) return <Login onEntrar={setUsuario} />
  return (
    <Escritorio
      usuario={usuario}
      onSalir={() => {
        cerrarSesion()
        setUsuario(null)
      }}
    />
  )
}

function Escritorio({ usuario, onSalir }) {
  const { proyectos, guardar, editar, moverA, borrar, comentar, borrarComentario } = useProyectos(usuario)
  const [vista, setVista] = useState('resumen')
  const [busqueda, setBusqueda] = useState('')
  const [panel, setPanel] = useState(null) // null | { id } | { nuevo: true, estado? }
  const [aBorrar, setABorrar] = useState(null)
  const buscador = useRef(null)
  const buscadorMovil = useRef(null)
  const abierto = panel?.id ? proyectos.find((p) => p.id === panel.id) : null
  const cerrarPanel = () => setPanel(null)

  // Ctrl/⌘ + K enfoca el buscador
  useEffect(() => {
    const atajo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        buscador.current?.focus()
      }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  }, [])

  const nombreCorto = usuario.nombre.split(' ')[0]

  return (
    <div className="flex h-screen bg-base-200 text-base-content">
      <Sidebar vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir} totalProyectos={proyectos.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 h-16 px-4 md:px-6 border-b border-base-300 bg-base-100 shrink-0">
          <h1 className="text-lg font-semibold flex-1 truncate">
            {vista === 'resumen' ? `Hola, ${nombreCorto}` : 'Tablero de proyectos'}
          </h1>
          <button className="btn btn-primary hidden md:inline-flex h-10" onClick={() => setPanel({ nuevo: true })}>
            <IconoMas className="size-4" />
            <span className="hidden sm:inline">Nuevo proyecto</span>
          </button>
          <label className="input hidden md:flex w-72 bg-base-100">
            <IconoBuscar className="size-4 opacity-50" />
            <input
              ref={buscador}
              placeholder="Buscar proyectos..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                if (vista !== 'tablero') setVista('tablero')
              }}
            />
            <kbd className="kbd kbd-xs">Ctrl K</kbd>
          </label>
        </header>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {vista === 'resumen' ? (
            <Resumen proyectos={proyectos} onAbrir={(id) => setPanel({ id })} onIrTablero={() => setVista('tablero')} />
          ) : (
            <Tablero
              proyectos={proyectos}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              buscadorMovil={buscadorMovil}
              onMover={moverA}
              onAbrir={(id) => setPanel({ id })}
              onNuevo={(estado) => setPanel({ nuevo: true, estado })}
              onEditar={(p) => setPanel({ id: p.id })}
              onBorrar={setABorrar}
            />
          )}
        </main>
      </div>

      <BarraMovil
        vista={vista}
        onVista={setVista}
        onNuevo={() => setPanel({ nuevo: true })}
        onBuscar={() => {
          setVista('tablero')
          setTimeout(() => buscadorMovil.current?.focus(), 50)
        }}
        usuario={usuario}
        onSalir={onSalir}
      />

      {(abierto || panel?.nuevo) && (
        <Modal ancho="max-w-6xl" clase="h-[90vh] max-h-[90vh] overflow-hidden" onCerrar={cerrarPanel}>
          <ProyectoPanel
            key={abierto?.id ?? 'nuevo'}
            proyecto={abierto}
            estadoInicial={panel.estado}
            clave={abierto && clave(abierto)}
            usuario={usuario}
            onCrear={(datos) => {
              guardar(datos)
              cerrarPanel()
            }}
            onActualizar={(campos) => editar(abierto.id, campos)}
            onBorrar={() => setABorrar(abierto)}
            onComentar={(texto) => comentar(abierto.id, texto)}
            onBorrarComentario={(cid) => borrarComentario(abierto.id, cid)}
            onCerrar={cerrarPanel}
          />
        </Modal>
      )}

      {aBorrar && (
        <Modal ancho="max-w-md" onCerrar={() => setABorrar(null)}>
          <div className="p-6">
            <h3 className="text-base font-semibold">Eliminar proyecto</h3>
            <p className="mt-2 text-sm text-base-content/70">
              ¿Seguro que quieres eliminar <strong className="text-base-content">{aBorrar.titulo}</strong>? Esta acción no
              se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-base-300 bg-base-200/50">
            <button className="btn btn-sm btn-ghost" onClick={() => setABorrar(null)}>Cancelar</button>
            <button
              className="btn btn-sm btn-error"
              onClick={() => {
                borrar(aBorrar.id)
                if (panel?.id === aBorrar.id) cerrarPanel()
                setABorrar(null)
              }}
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
