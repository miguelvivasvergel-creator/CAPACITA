import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { pasosEnOrden } from '../../utils/formularioDatos';
import { ESTADOS_NODO } from './estadosNodo';


// Nodo con la estética del login: tarjeta de vidrio, punto de estado con anillo y conectores redondos.
function Nodo({ data }) {
  const estado = ESTADOS_NODO[data.estado] || ESTADOS_NODO.espera;
  const extremo = data.extremo ? `nodo-taller--${data.extremo}` : '';
  return <div className={`nodo-taller nodo-taller--${estado.tono} ${extremo} ${estado.pulso ? 'taller-pulso' : ''} ${data.seleccionado ? 'is-seleccionado' : ''}`}>
    {data.entrada && <Handle type="target" position={Position.Left} isConnectable={false} />}
    <p className="nodo-taller-tipo"><span className="nodo-taller-punto" aria-hidden="true" />{data.tipo}</p>
    <p className="nodo-taller-titulo">{data.label}</p>
    {data.conector && <p className={`nodo-taller-conector ${data.conector.ia ? 'is-ia' : data.conector.accion ? 'is-accion' : ''}`} title={data.conector.ia ? 'Usa una IA externa' : data.conector.accion ? 'Hace una acción externa (con tu aprobación)' : 'Consulta un servicio externo'}><Icono nombre={data.conector.ia ? 'chispa' : data.conector.accion ? 'candado' : 'globo'} className="h-3 w-3" />{data.conector.ia ? 'IA · ' : ''}{data.conector.proveedor}</p>}
    <p className="nodo-taller-estado"><Icono nombre={estado.icono} className="h-3.5 w-3.5" />{estado.texto}</p>
    {data.salida && <Handle type="source" position={Position.Right} isConnectable={false} />}
  </div>;
}
const nodeTypes = { paso: Nodo };

// Conexión: punteada mientras espera (como las curvas del login), animada al trabajar y sólida al terminar.
function estiloConexion(estadoOrigen, estadoDestino) {
  if (estadoDestino === 'running') return { stroke: '#06b6d4', strokeWidth: 2.5 };
  if (estadoDestino === 'failed' || estadoDestino === 'interrupted') return { stroke: '#f87171', strokeWidth: 2 };
  if (estadoOrigen === 'completed') return { stroke: '#3b82f6', strokeWidth: 2.25 };
  return { stroke: '#a5b8e8', strokeWidth: 1.75, strokeDasharray: '5 5' };
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
      return { nodes: [{ id: 'creando', type: 'paso', position: { x: 0, y: 0 }, data: { tipo: 'Herramienta nueva', label: creando, estado: estadoCreacion || 'creando' } }], edges: [] };
    }
    if (!definicion) return { nodes: [], edges: [] };
    const pasos = pasosEnOrden(definicion.nodes);
    const nodos = [
      { id: '$input', type: 'paso', position: { x: 0, y: 40 }, data: { tipo: 'Inicio', label: 'Tus datos', estado: estados.$input || 'espera', salida: true, extremo: 'inicio' } },
      ...pasos.map((node, index) => ({ id: node.id, type: 'paso', position: { x: (index + 1) * 270, y: index % 2 ? 90 : 0 },
        data: { tipo: `Paso ${index + 1}`, label: node.label, estado: estados[node.id] || 'espera', entrada: true, salida: true, seleccionado: seleccionado === node.id, conector: conectores.get(node.version_id) } })),
      { id: '$output', type: 'paso', position: { x: (pasos.length + 1) * 270, y: 40 }, data: { tipo: 'Final', label: 'Resultado', estado: estados.$output || 'espera', entrada: true, extremo: 'final' } },
    ];
    const conexiones = new Map();
    for (const node of definicion.nodes) {
      const bindings = Object.values(node.bindings || {});
      for (const binding of bindings) conexiones.set(`${binding.source}>${node.id}`, { source: binding.source, target: node.id });
      if (!bindings.length) conexiones.set(`$input>${node.id}`, { source: '$input', target: node.id });
    }
    for (const binding of Object.values(definicion.outputs || {})) conexiones.set(`${binding.source}>$output`, { source: binding.source, target: '$output' });
    const activa = (edge) => estados[edge.target] === 'running';
    return { nodes: nodos, edges: [...conexiones.entries()].map(([id, edge]) => ({ id, ...edge, type: 'smoothstep', animated: activa(edge), style: estiloConexion(estados[edge.source], estados[edge.target]) })) };
  }, [definicion, creando, estadoCreacion, estados, seleccionado, conectores]);
  const nodes = useMemo(() => nodosBase.map((node) => (medidas[node.id] ? { ...node, measured: medidas[node.id] } : node)), [nodosBase, medidas]);

  const cantidad = nodes.length;
  // Reencuadra al cambiar de tamaño (pestañas en móvil, panel de detalle) o al crecer el plan.
  useEffect(() => {
    const node = contenedor.current;
    if (!node) return;
    const ajustar = () => flujo.current?.fitView({ padding: 0.08 });
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
    <ReactFlow key={definicion?.name || `${creando}:${estadoCreacion || ''}`}nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.2} maxZoom={1.4}
      nodesConnectable={false} onNodesChange={onNodesChange} onInit={(instance) => { flujo.current = instance; }} onNodeClick={(_, node) => onSeleccionar?.(node.id)} proOptions={{ hideAttribution: true }}>
      <Background color="#c3d2f2" gap={22} size={1.4} /><Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
