import { useCallback, useState } from 'react';
import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import MiniCadena from '../components/common/MiniCadena';
import MisAsistentes from '../components/taller/MisAsistentes';
import HerramientasGuiadas from './HerramientasGuiadas';
import SolucionesGuiadas from './SolucionesGuiadas';

// Herramientas (una pieza) y soluciones (varias piezas conectadas) son, para la persona, lo mismo:
// algo que guardó y puede volver a usar. Por dentro siguen separadas (capacidades y workflows).
const FILTROS = [
  { id: 'todas', texto: 'Todas', pasos: 2 },
  { id: 'simples', texto: 'Simples', pasos: 1 },
  { id: 'combinadas', texto: 'Combinadas', pasos: 3 },
  { id: 'asistentes', texto: 'Asistentes', icono: 'actualizar' },
];
// Estado de una herramienta: las combinadas guardadas cuentan como «Lista» (ya se pueden usar).
const ESTADOS = [
  { id: 'todos', texto: 'Cualquier estado' },
  { id: 'lista', texto: 'Listas para usar' },
  { id: 'probada', texto: 'Probadas, sin tu visto bueno' },
  { id: 'sin', texto: 'Sin terminar' },
];
const ORDENES = [{ id: 'recientes', texto: 'Más recientes' }, { id: 'az', texto: 'Nombre (A-Z)' }];

function Seccion({ titulo, ayuda, pasos, children }) {
  return <section className="biblioteca-seccion" aria-label={titulo}>
    <h2><span className="biblioteca-seccion-icono"><MiniCadena pasos={pasos} /></span><span><strong>{titulo}</strong><span>{ayuda}</span></span></h2>
    {children}
  </section>;
}

export default function BibliotecaGuiada({ onCambiarSeccion, filtroInicial = 'todas' }) {
  const [filtro, setFiltro] = useState(FILTROS.some((item) => item.id === filtroInicial) ? filtroInicial : 'todas');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [orden, setOrden] = useState('recientes');
  const ver = (id) => filtro === 'todas' || filtro === id;
  // Ids de tus herramientas: una solución de 1 paso con una de ellas no se repite en la lista.
  const [propias, setPropias] = useState(null);
  const alCargarPropias = useCallback((ids) => setPropias(ids), []);
  // Cuántas encontró cada lista (undefined mientras carga) para el contador y el «no encontré nada».
  const [conteos, setConteos] = useState({});
  const alContar = useCallback((clave, n) => setConteos((old) => (old[clave] === n ? old : { ...old, [clave]: n })), []);
  const buscando = busqueda.trim() !== '' || estado !== 'todos';
  const visibles = [ver('simples') && 'simples', ver('simples') && 'uno', ver('combinadas') && 'varios'].filter(Boolean);
  const listo = visibles.length > 0 && visibles.every((clave) => conteos[clave] !== undefined);
  const total = visibles.reduce((suma, clave) => suma + (conteos[clave] || 0), 0);
  const props = { busqueda, estado, orden, onContar: alContar, onCambiarSeccion };
  return <div className="vista-contenedor guiado-pagina space-y-6">
    <EncabezadoVista icono="herramientas" etiqueta="Todo lo que guardaste" titulo="Mi biblioteca"
      descripcion="Tus herramientas simples, las combinadas (varias conectadas en un proceso) y tus asistentes con horario. Úsalas otra vez con datos nuevos, sin esperar a la IA." />
    <div className="biblioteca-barra">
      <div className="biblioteca-filtros" role="group" aria-label="Filtrar Mi biblioteca">
        {FILTROS.map((item) => <button key={item.id} type="button" aria-pressed={filtro === item.id} onClick={() => setFiltro(item.id)}>
          {item.icono ? <Icono nombre={item.icono} className="h-4 w-4" /> : <MiniCadena pasos={item.pasos} />}{item.texto}
        </button>)}
      </div>
      <button type="button" className="vista-boton-primario" onClick={() => onCambiarSeccion?.('inicio')}><Icono nombre="mas" className="h-4 w-4" />Crear algo nuevo</button>
    </div>
    {filtro !== 'asistentes' && <div className="biblioteca-busqueda" role="search">
      <label className="biblioteca-buscador">
        <Icono nombre="buscar" className="h-4 w-4" />
        <span className="sr-only">Buscar en Mi biblioteca</span>
        <input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o por lo que hace: «clima», «compara documentos»…" />
        {busqueda && <button type="button" aria-label="Borrar la búsqueda" onClick={() => setBusqueda('')}><Icono nombre="x" className="h-4 w-4" /></button>}
      </label>
      <label className="biblioteca-selector"><span className="sr-only">Filtrar por estado</span>
        <select value={estado} onChange={(event) => setEstado(event.target.value)}>{ESTADOS.map((item) => <option key={item.id} value={item.id}>{item.texto}</option>)}</select>
      </label>
      <label className="biblioteca-selector"><span className="sr-only">Ordenar</span>
        <select value={orden} onChange={(event) => setOrden(event.target.value)}>{ORDENES.map((item) => <option key={item.id} value={item.id}>{item.texto}</option>)}</select>
      </label>
    </div>}
    {buscando && filtro !== 'asistentes' && listo && <div className="biblioteca-resultado" role="status">
      {total ? <p><strong>{total}</strong> {total === 1 ? 'resultado' : 'resultados'}{busqueda.trim() ? <> para «{busqueda.trim()}»</> : ''}</p>
        : <div className="guiado-vacio"><p>No encontré nada{busqueda.trim() ? <> con «{busqueda.trim()}»</> : ' con ese filtro'}.</p>
          {busqueda.trim() && <button type="button" className="vista-boton-primario mt-3" onClick={() => onCambiarSeccion?.(`inicio/usar/${encodeURIComponent(busqueda.trim().slice(0, 1500))}`)}>
            <Icono nombre="chispa" className="h-4 w-4" />Pedírselo al chat</button>}</div>}
    </div>}
    {ver('asistentes') && !buscando && <MisAsistentes onCambiarSeccion={onCambiarSeccion} mostrarVacio={filtro === 'asistentes'} />}
    {ver('combinadas') && <Seccion titulo="Combinadas" ayuda="Varias herramientas conectadas en un proceso, como en el taller." pasos={3}>
      <SolucionesGuiadas incrustada pasos="varios" {...props} />
    </Seccion>}
    {ver('simples') && <Seccion titulo="Simples" ayuda="Una sola herramienta que hace una cosa: las tuyas y las de la comunidad que ya usaste." pasos={1}>
      <HerramientasGuiadas incrustada onPropias={alCargarPropias} {...props} />
      <SolucionesGuiadas incrustada pasos="uno" propias={propias} {...props} />
    </Seccion>}
  </div>;
}
