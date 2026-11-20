import Icono from '../common/Icono';
import { ETAPAS } from './estadosNodo';

// Recorrido de toda solución en Capacita, dibujado como nodos conectados (estética del login).
export default function RutaTaller({ etapa, terminado = false, trabajando = false }) {
  const actual = Math.max(0, ETAPAS.findIndex((item) => item.id === etapa));
  return <div className="ruta">
    <ol className="ruta-taller" aria-label="Recorrido de tu solución">
      {ETAPAS.map((item, index) => {
        const estado = index < actual || (terminado && index === actual) ? 'hecho' : index === actual ? 'actual' : 'pendiente';
        return <li key={item.id} className={`ruta-paso ruta-paso--${estado} ${estado === 'actual' && trabajando ? 'ruta-paso--trabajando' : ''}`}
          aria-current={estado === 'actual' ? 'step' : undefined} title={item.ayuda}>
          <span className="ruta-nodo"><Icono nombre={estado === 'hecho' ? 'check' : item.icono} className="h-3.5 w-3.5" /></span>
          <strong className="ruta-titulo">{item.titulo}</strong>
          <span className="sr-only">{estado === 'hecho' ? ' (hecho)' : estado === 'actual' ? ' (en curso)' : ' (pendiente)'}</span>
        </li>;
      })}
    </ol>
    <p className="ruta-ayuda">{ETAPAS[actual].ayuda}</p>
  </div>;
}
