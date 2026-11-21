import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { pasosEnOrden } from '../../utils/formularioDatos';
import { ESTADOS_NODO } from './estadosNodo';
import { conexiones, distribuir, tipoDePaso } from './distribucion';

// Cada tipo de paso tiene su ícono, su color (franja y burbuja) y una etiqueta que se entiende sola.
const TIPOS = {
  consulta: { icono: 'globo', etiqueta: 'Consulta datos', ayuda: 'Consulta un servicio externo' },
  ia: { icono: 'chispa', etiqueta: 'Inteligencia artificial', ayuda: 'Usa una IA externa' },
  accion: { icono: 'enviar', etiqueta: 'Envía o guarda', ayuda: 'Hace una acción externa (con tu aprobación)' },
  propia: { icono: 'herramienta', etiqueta: 'Tu herramienta', ayuda: 'Herramienta creada y probada en Capacita' },
  inicio: { icono: 'perfil', etiqueta: '' },
  final: { icono: 'ok', etiqueta: '' },
};

// Tarjeta del paso: franja y burbuja del color de su tipo, título, proveedor y píldora de estado.
function Nodo({ data }) {
  const estado = ESTADOS_NODO[data.estado] || ESTADOS_NODO.espera;
  const tipo = TIPOS[data.clase] || TIPOS.propia;
  const clases = ['nodo-taller', `nodo-taller--${estado.tono}`, `nodo-taller--${data.clase || 'propia'}`,
    data.extremo ? `nodo-taller--${data.extremo}` : '', estado.pulso ? 'taller-pulso' : '', data.seleccionado ? 'is-seleccionado' : ''];
  return <div className={clases.filter(Boolean).join(' ')} title={tipo.ayuda}>
    {data.entrada && <Handle type="target" position={Position.Left} isConnectable={false} />}
    <div className="nodo-taller-cabeza">
      <span className="nodo-taller-burbuja" aria-hidden="true"><Icono nombre={tipo.icono} className="h-4 w-4" /></span>
      <span className="nodo-taller-tipo">{data.tipo}{tipo.etiqueta && <span>{tipo.etiqueta}</span>}</span>
    </div>
    <p className="nodo-taller-titulo">{data.label}</p>
    {data.conector?.proveedor && <p className="nodo-taller-conector">{data.conector.ia ? 'IA · ' : ''}{data.conector.proveedor}</p>}
    <p className="nodo-taller-estado"><Icono nombre={estado.icono} className="h-3.5 w-3.5" />{estado.texto}</p>
    {data.salida && <Handle type="source" position={Position.Right} isConnectable={false} />}
  </div>;
}
const nodeTypes = { paso: Nodo };

// Conexión: punteada mientras espera, animada al trabajar, verde al terminar; siempre con flecha.
function estiloConexion(estadoOrigen, estadoDestino) {
  if (estadoDestino === 'running') return { stroke: '#06b6d4', strokeWidth: 2.6 };
  if (estadoDestino === 'failed' || estadoDestino === 'interrupted') return { stroke: '#f87171', strokeWidth: 2.2 };
  if (estadoOrigen === 'completed' && estadoDestino === 'completed') return { stroke: '#10b981', strokeWidth: 2.4 };
  if (estadoOrigen === 'completed') return { stroke: '#3b82f6', strokeWidth: 2.3 };
  return { stroke: '#9fb3e3', strokeWidth: 1.9, strokeDasharray: '6 6' };
}

// Mini constelación para el taller vacío: tres nodos unidos por curvas punteadas.
function ConstelacionVacia() {
  return <svg className="taller-vacio-red" viewBox="0 0 220 110" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="taller-vacio-a" x1="0" x2="1"><stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#06b6d4" /></linearGradient>
      <linearGradient id="taller-vacio-b" x1="0" x2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
    </defs>
    <path d="M30 70 C 70 70, 80 30, 110 32" stroke="url(#taller-vacio-a)" strokeWidth="1.6" strokeDasharray="4 4" className="taller-vacio-linea" />
    <path d="M110 32 C 145 34, 150 78, 190 76" stroke="url(#taller-vacio-b)" strokeWidth="1.6" strokeDasharray="4 4" className="taller-vacio-linea" />
    <circle cx="30" cy="70" r="9" className="taller-vacio-nodo" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
    <circle cx="110" cy="32" r="11" className="taller-vacio-nodo taller-vacio-nodo--2" fill="#fff" stroke="#6366f1" strokeWidth="2" />
    <circle cx="190" cy="76" r="9" className="taller-vacio-nodo taller-vacio-nodo--3" fill="#fff" stroke="#06b6d4" strokeWidth="2" />
    <circle cx="30" cy="70" r="3.5" fill="#3b82f6" /><circle cx="110" cy="32" r="4" fill="#6366f1" /><circle cx="190" cy="76" r="3.5" fill="#06b6d4" />
  </svg>;
}

/**
 * Taller visual: dibuja el plan de izquierda a derecha (datos → pasos → resultado)
 * con el estado real de cada paso, o una herramienta nueva mientras se crea.
 */
// version_id → proveedor («Open-Meteo») de los pasos que consultan un servicio externo.
const SIN_CONECTORES = new Map();

export default function LienzoTaller({ definicion, creando, estadoCreacion, estados = {}, seleccionado, onSeleccionar, conectores = SIN_CONECTORES }) {
  const contenedor = useRef(null), flujo = useRef(null);
  // React Flow oculta un nodo hasta medirlo. Cada cambio de estado crea nodos nuevos sin
  // medidas y, si el tamaño no cambia, no se vuelven a medir: quedaban invisibles al ejecutar.
  // Se conservan las últimas medidas recibidas y se devuelven en cada nodo.
  const [medidas, setMedidas] = useState({});
  const onNodesChange = useCallback((cambios) => {
    setMedidas((old) => {
      let next = old;
      for (const { type, id, dimensions } of cambios) {
        const previa = old[id];
        if (type !== 'dimensions' || !dimensions || (previa?.width === dimensions.width && previa?.height === dimensions.height)) continue;
        if (next === old) next = { ...old };
        next[id] = { width: dimensions.width, height: dimensions.height };
      }
      return next;
    });
  }, []);
  const { nodes: nodosBase, edges } = useMemo(() => {
    if (creando) {
      return { nodes: [{ id: 'creando', type: 'paso', position: { x: 0, y: 0 }, data: { tipo: 'Herramienta nueva', label: creando, estado: estadoCreacion || 'creando', clase: 'propia' } }], edges: [] };
    }
    if (!definicion) return { nodes: [], edges: [] };
    const pasos = pasosEnOrden(definicion.nodes);
    // Por capas según las conexiones: lo que va en paralelo queda apilado y se ve qué alimenta a qué.
    const posiciones = distribuir(definicion);
    const nodos = [
      { id: '$input', type: 'paso', position: posiciones.get('$input'), data: { tipo: 'Inicio', label: 'Tus datos', estado: estados.$input || 'espera', salida: true, extremo: 'inicio', clase: 'inicio' } },
      ...pasos.map((node, index) => ({ id: node.id, type: 'paso', position: posiciones.get(node.id),
        data: { tipo: `Paso ${index + 1}`, label: node.label, estado: estados[node.id] || 'espera', entrada: true, salida: true, seleccionado: seleccionado === node.id,
          conector: conectores.get(node.version_id), clase: tipoDePaso(conectores.get(node.version_id)) } })),
      { id: '$output', type: 'paso', position: posiciones.get('$output'), data: { tipo: 'Final', label: 'Resultado', estado: estados.$output || 'espera', entrada: true, extremo: 'final', clase: 'final' } },
    ];
    const activa = (edge) => estados[edge.target] === 'running';
    return { nodes: nodos, edges: [...conexiones(definicion).entries()].map(([id, edge]) => {
      const style = estiloConexion(estados[edge.source], estados[edge.target]);
      return { id, ...edge, type: 'default', animated: activa(edge), style,
        markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 } };
    }) };
  }, [definicion, creando, estadoCreacion, estados, seleccionado, conectores]);
  const nodes = useMemo(() => nodosBase.map((node) => (medidas[node.id] ? { ...node, measured: medidas[node.id] } : node)), [nodosBase, medidas]);

  const cantidad = nodes.length;
  // Reencuadra al cambiar de tamaño (pestañas en móvil, panel de detalle) o al crecer el plan.
  useEffect(() => {
    const node = contenedor.current;
    if (!node) return;
    const ajustar = () => flujo.current?.fitView({ padding: 0.12 });
    const observer = new ResizeObserver(() => requestAnimationFrame(ajustar));
    observer.observe(node); ajustar();
    return () => observer.disconnect();
  }, [cantidad]);

  if (!nodes.length) {
    return <div className="taller-vacio">
      <ConstelacionVacia />
      <p className="taller-vacio-titulo">Aquí verás tu proceso armándose</p>
      <p className="taller-vacio-texto">Cuéntale a Capacita lo que necesitas. Cada herramienta aparecerá como un nodo, se conectará con la siguiente y se iluminará mientras trabaja.</p>
      <ul className="taller-vacio-leyenda" aria-label="Qué significa cada color">
        <li><span className="nodo-leyenda nodo-leyenda--activo" />Trabajando</li>
        <li><span className="nodo-leyenda nodo-leyenda--listo" />Listo</li>
        <li><span className="nodo-leyenda nodo-leyenda--creando" />Creándose</li>
        <li><span className="nodo-leyenda nodo-leyenda--aprobar" />Pide tu aprobación</li>
      </ul>
    </div>;
  }
  return <div ref={contenedor} className="taller-mapa" aria-label="Taller: mapa del proceso">
    {/* El nodo en creación cambia de estado sin cambiar de tamaño: remontar evita que quede sin medir (oculto). */}
    <ReactFlow key={definicion?.name || `${creando}:${estadoCreacion || ''}`}nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.2} maxZoom={1.4}
      nodesConnectable={false} onNodesChange={onNodesChange} onInit={(instance) => { flujo.current = instance; }} onNodeClick={(_, node) => onSeleccionar?.(node.id)} proOptions={{ hideAttribution: true }}>
      <Background color="#d3def5" gap={24} size={1.6} /><Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
