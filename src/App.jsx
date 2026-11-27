import { useEffect, useRef, useState } from 'react'
import { cerrarSesion, esOwner, usuarioActual } from './auth'
import { clave, useProyectos } from './hooks/useProyectos'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import BarraMovil from './components/BarraMovil'
import Resumen from './components/Resumen'
import Tablero from './components/Tablero'
import Configuracion from './components/Configuracion'
import Usuarios from './components/Usuarios'
import ProyectoPanel from './components/ProyectoPanel'
import Modal from './components/Modal'
import IntegracionConfig from './components/IntegracionConfig'
import { useIntegracion } from './hooks/useIntegracion'
import { IconoBuscar, IconoMas } from './components/Iconos'
import { supabase } from './supabase'
import { aplicarTema } from './tema'
import { listarAsignaturas } from './asignaturas'
import { useTableros } from './hooks/useTableros'
import { CabeceraTabla, ModalCompartir, ModalConfirmarTabla, ModalNombreTabla } from './components/TablasCompartidas'

export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = comprobando sesión

  useEffect(() => {
    usuarioActual().then(setUsuario)
    // Si la sesión caduca o se cierra en otra pestaña, volver al login
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setUsuario(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // El tema guardado en el perfil sigue al usuario en cualquier dispositivo
  useEffect(() => {
    if (usuario?.tema) {
      localStorage.setItem('tema', JSON.stringify(usuario.tema))
      aplicarTema(usuario.tema)
    }
  }, [usuario])

  if (usuario === undefined)
    return (
      <div className="min-h-screen grid place-items-center bg-base-200">
        <span className="loading loading-spinner loading-md text-base-content/50" />
      </div>
    )
  if (!usuario) return <Login onEntrar={setUsuario} />
  return (
    <Escritorio
      key={usuario.id}
      usuario={usuario}
      onActualizarUsuario={(campos) => setUsuario((u) => ({ ...u, ...campos }))}
      onSalir={async () => {
        await cerrarSesion()
        setUsuario(null)
      }}
    />
  )
}

function Escritorio({ usuario, onSalir, onActualizarUsuario }) {
  const {
    proyectos,
    cargando,
    error,
    limpiarError,
    guardar,
    importar,
    actualizarFechas,
    editar,
    moverA,
    borrar,
    comentar,
    borrarComentario,
    proyectosLocales,
    migrarLocales,
    descartarLocales,
  } = useProyectos(usuario)
  const [migrando, setMigrando] = useState(false)
  const [vistaElegida, setVista] = useState('resumen')
  const owner = esOwner(usuario)
  // Tablas compartidas: la vista 't:<id>' muestra el tablero de esa tabla
  const tablas = useTableros(usuario.id)
  const [modalTabla, setModalTabla] = useState(null) // null | { tipo: 'nueva' | 'renombrar' | 'compartir' | 'eliminar' | 'salir', tablero? }
  const tableroActual = vistaElegida.startsWith('t:') ? tablas.tableros.find((t) => `t:${t.id}` === vistaElegida) : null
  const vista =
    vistaElegida === 'usuarios' && !owner
      ? 'resumen' // solo el owner ve Usuarios
      : vistaElegida.startsWith('t:') && !tableroActual
        ? 'tablero' // la tabla ya no existe o te han quitado de ella
        : vistaElegida
  const enTablero = vista === 'tablero' || Boolean(tableroActual)
  const personales = proyectos.filter((p) => p.tablero_id === null)
  const delTablero = tableroActual ? proyectos.filter((p) => p.tablero_id === tableroActual.id) : personales
  const conteos = Object.fromEntries(tablas.tableros.map((t) => [t.id, proyectos.filter((p) => p.tablero_id === t.id).length]))
  const nuevo = (estado) => setPanel({ nuevo: true, estado, tablero_id: tableroActual?.id ?? null })
  const [busqueda, setBusqueda] = useState('')
  const [panel, setPanel] = useState(null) // null | { id } | { nuevo: true, estado? }
  const [aBorrar, setABorrar] = useState(null)
  // Integraciones: crean proyectos solos a partir de Classroom y Moodle
  const listo = !cargando && proyectosLocales === 0
  const classroom = useIntegracion('classroom', importar, listo, actualizarFechas)
  const moodle = useIntegracion('moodle', importar, listo, actualizarFechas)
  const github = useIntegracion('github', importar, listo, actualizarFechas) // solo para crear repositorios
  const integraciones = [classroom, moodle, github]
  const [configIntegracion, setConfigIntegracion] = useState(null) // null | 'classroom' | 'moodle'
  const integracionAbierta = integraciones.find((i) => i.clave === configIntegracion)
  const aviso = integraciones.find((i) => i.aviso)?.aviso
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
      <Sidebar vista={vista} onVista={setVista} usuario={usuario} onSalir={onSalir} totalProyectos={personales.length}
        integraciones={integraciones}
        onIntegracion={setConfigIntegracion}
        owner={owner}
        tablas={tablas}
        conteos={conteos}
        onNuevaTabla={() => setModalTabla({ tipo: 'nueva' })}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 h-16 px-4 md:px-6 border-b border-base-300 bg-base-100 shrink-0">
          <h1 className="text-lg font-semibold flex-1 truncate">
            {vista === 'resumen' ? `Hola, ${nombreCorto}` : vista === 'configuracion' ? 'Configuración' : vista === 'usuarios' ? 'Usuarios' : tableroActual ? tableroActual.nombre : 'Tablero de proyectos'}
          </h1>
          <button className="btn btn-primary hidden md:inline-flex h-10" onClick={() => nuevo()}>
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
                if (!enTablero) setVista('tablero')
              }}
            />
            <kbd className="kbd kbd-xs">Ctrl K</kbd>
          </label>
        </header>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {error && (
            <div role="alert" className="alert alert-error alert-soft m-4 md:mx-8 text-sm">
              <span className="flex-1">{error}</span>
              <button className="btn btn-xs btn-ghost" onClick={limpiarError}>Cerrar</button>
            </div>
          )}

          {!cargando && proyectosLocales > 0 && (
            <div className="alert m-4 md:mx-8 bg-base-100 border-base-300 text-sm flex flex-wrap">
              <span className="flex-1 min-w-60">
                Hay <strong>{proyectosLocales} proyectos</strong> guardados solo en este navegador (de la versión
                anterior). ¿Quieres subirlos a tu cuenta para verlos en cualquier dispositivo?
              </span>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-ghost" disabled={migrando} onClick={descartarLocales}>
                  No, ignorar
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={migrando}
                  onClick={async () => {
                    setMigrando(true)
                    await migrarLocales()
                    setMigrando(false)
                  }}
                >
                  {migrando && <span className="loading loading-spinner loading-xs" />}
                  Subir a mi cuenta
                </button>
              </div>
            </div>
          )}

          {cargando ? (
            <div className="grid place-items-center py-24">
              <span className="loading loading-spinner loading-md text-base-content/50" />
            </div>
          ) : vista === 'usuarios' ? (
            <Usuarios usuario={usuario} />
          ) : vista === 'configuracion' ? (
            <Configuracion usuario={usuario} onActualizarUsuario={onActualizarUsuario} integraciones={integraciones} onIntegracion={setConfigIntegracion} />
          ) : vista === 'resumen' ? (
            <Resumen proyectos={personales} onAbrir={(id) => setPanel({ id })} onIrTablero={() => setVista('tablero')} />
          ) : (
            <>
              {tableroActual && (
                <CabeceraTabla
                  tablero={tableroActual}
                  onCompartir={() => setModalTabla({ tipo: 'compartir', tablero: tableroActual })}
                  onRenombrar={() => setModalTabla({ tipo: 'renombrar', tablero: tableroActual })}
                  onEliminar={() => setModalTabla({ tipo: 'eliminar', tablero: tableroActual })}
                  onSalir={() => setModalTabla({ tipo: 'salir', tablero: tableroActual })}
                />
              )}
              <Tablero
                key={vista}
                proyectos={delTablero}
                busqueda={busqueda}
                onBusqueda={setBusqueda}
                buscadorMovil={buscadorMovil}
                onMover={moverA}
                onAbrir={(id) => setPanel({ id })}
                onNuevo={nuevo}
                onEditar={(p) => setPanel({ id: p.id })}
                onBorrar={setABorrar}
              />
            </>
          )}
        </main>
      </div>

      <BarraMovil
        vista={vista}
        onVista={setVista}
        onNuevo={() => nuevo()}
        onBuscar={() => {
          if (!enTablero) setVista('tablero')
          setTimeout(() => buscadorMovil.current?.focus(), 50)
        }}
        usuario={usuario}
        onSalir={onSalir}
        integraciones={integraciones}
        onIntegracion={setConfigIntegracion}
        owner={owner}
        tablas={tablas}
        conteos={conteos}
        onNuevaTabla={() => setModalTabla({ tipo: 'nueva' })}
      />

      {(modalTabla?.tipo === 'nueva' || modalTabla?.tipo === 'renombrar') && (
        <ModalNombreTabla
          titulo={modalTabla.tipo === 'nueva' ? 'Nueva tabla compartida' : 'Cambiar nombre de la tabla'}
          boton={modalTabla.tipo === 'nueva' ? 'Crear tabla' : 'Guardar'}
          inicial={modalTabla.tablero?.nombre}
          onGuardar={async (nombre) => {
            if (modalTabla.tipo === 'renombrar') return tablas.renombrar(modalTabla.tablero.id, nombre)
            const id = await tablas.crear(nombre)
            setVista(`t:${id}`)
          }}
          onCerrar={() => setModalTabla(null)}
        />
      )}
      {modalTabla?.tipo === 'compartir' && (
        <ModalCompartir
          tablero={tablas.tableros.find((t) => t.id === modalTabla.tablero.id) ?? modalTabla.tablero}
          usuarioId={usuario.id}
          api={tablas}
          onCerrar={() => setModalTabla(null)}
        />
      )}
      {(modalTabla?.tipo === 'eliminar' || modalTabla?.tipo === 'salir') && (
        <ModalConfirmarTabla
          tablero={modalTabla.tablero}
          tipo={modalTabla.tipo}
          onConfirmar={async () => {
            await (modalTabla.tipo === 'eliminar' ? tablas.eliminar : tablas.salir)(modalTabla.tablero.id)
            setVista('tablero')
          }}
          onCerrar={() => setModalTabla(null)}
        />
      )}

      {(abierto || panel?.nuevo) && (
        <Modal ancho="max-w-6xl" clase="h-[90vh] max-h-[90vh] overflow-hidden" onCerrar={cerrarPanel}>
          <ProyectoPanel
            key={abierto?.id ?? 'nuevo'}
            proyecto={abierto}
            estadoInicial={panel.estado}
            clave={abierto && clave(abierto)}
            usuario={usuario}
            asignaturas={listarAsignaturas(proyectos).map((a) => a.nombre)}
            classroomConectado={classroom.conectado}
            githubConectado={github.conectado}
            onConectarGithub={() => setConfigIntegracion('github')}
            onCrear={(datos) => {
              guardar({ ...datos, tablero_id: panel.tablero_id ?? null })
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

      {integracionAbierta && (
        <Modal ancho="max-w-xl" onCerrar={() => setConfigIntegracion(null)}>
          <IntegracionConfig
            key={integracionAbierta.clave}
            integracion={integracionAbierta}
            onCerrar={() => setConfigIntegracion(null)}
          />
        </Modal>
      )}

      {aviso && (
        <div className="toast toast-center md:toast-end bottom-20 md:bottom-4 z-[1000]">
          <div className="alert bg-neutral text-neutral-content border-0 text-sm shadow-lg">{aviso}</div>
        </div>
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
