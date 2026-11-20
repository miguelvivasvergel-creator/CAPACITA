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

function Seccion({ titulo, ayuda, pasos, children }) {
  return <section className="biblioteca-seccion" aria-label={titulo}>
    <h2><span className="biblioteca-seccion-icono"><MiniCadena pasos={pasos} /></span><span><strong>{titulo}</strong><span>{ayuda}</span></span></h2>
    {children}
  </section>;
}

export default function BibliotecaGuiada({ onCambiarSeccion, filtroInicial = 'todas' }) {
  const [filtro, setFiltro] = useState(FILTROS.some((item) => item.id === filtroInicial) ? filtroInicial : 'todas');
  const ver = (id) => filtro === 'todas' || filtro === id;
  // Ids de tus herramientas: una solución de 1 paso con una de ellas no se repite en la lista.
  const [propias, setPropias] = useState(null);
  const alCargarPropias = useCallback((ids) => setPropias(ids), []);
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
    {ver('asistentes') && <MisAsistentes onCambiarSeccion={onCambiarSeccion} mostrarVacio={filtro === 'asistentes'} />}
    {ver('combinadas') && <Seccion titulo="Combinadas" ayuda="Varias herramientas conectadas en un proceso, como en el taller." pasos={3}>
      <SolucionesGuiadas incrustada pasos="varios" onCambiarSeccion={onCambiarSeccion} />
    </Seccion>}
    {ver('simples') && <Seccion titulo="Simples" ayuda="Una sola herramienta que hace una cosa: las tuyas y las de la comunidad que ya usaste." pasos={1}>
      <HerramientasGuiadas incrustada onCambiarSeccion={onCambiarSeccion} onPropias={alCargarPropias} />
      <SolucionesGuiadas incrustada pasos="uno" propias={propias} onCambiarSeccion={onCambiarSeccion} />
    </Seccion>}
  </div>;
}
