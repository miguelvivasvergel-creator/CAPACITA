import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { pasosEnOrden } from '../../utils/formularioDatos';
import { ESTADOS_NODO } from './estadosNodo';


function Nodo({ data }) {
  const estado = ESTADOS_NODO[data.estado] || ESTADOS_NODO.espera;
  return <div className={`w-52 rounded-2xl border-2 p-3 shadow-sm transition-colors ${estado.clase} ${data.seleccionado ? 'ring-4 ring-blue-200' : ''}`}>
    {data.entrada && <Handle type="target" position={Position.Left} isConnectable={false} />}
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{data.tipo}</p>
    <p className="mt-1 break-words font-semibold leading-snug text-slate-900">{data.label}</p>
    <p className="mt-2 text-xs text-slate-600"><span aria-hidden="true">{estado.icono}</span> {estado.texto}</p>
    {data.salida && <Handle type="source" position={Position.Right} isConnectable={false} />}
  </div>;
}
const nodeTypes = { paso: Nodo };

/**
 * Taller visual: dibuja el plan de izquierda a derecha (datos → pasos → resultado)
 * con el estado real de cada paso, o una herramienta nueva mientras se crea.
 */
export default function LienzoTaller({ definicion, creando, estadoCreacion, estados = {}, seleccionado, onSeleccionar }) {
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
      { id: '$input', type: 'paso', position: { x: 0, y: 40 }, data: { tipo: 'Inicio', label: 'Tus datos', estado: estados.$input || 'espera', salida: true } },
      ...pasos.map((node, index) => ({ id: node.id, type: 'paso', position: { x: (index + 1) * 270, y: index % 2 ? 90 : 0 },
        data: { tipo: `Paso ${index + 1}`, label: node.label, estado: estados[node.id] || 'espera', entrada: true, salida: true, seleccionado: seleccionado === node.id } })),
      { id: '$output', type: 'paso', position: { x: (pasos.length + 1) * 270, y: 40 }, data: { tipo: 'Final', label: 'Resultado', estado: estados.$output || 'espera', entrada: true } },
    ];
    const conexiones = new Map();
    for (const node of definicion.nodes) {
      const bindings = Object.values(node.bindings || {});
      for (const binding of bindings) conexiones.set(`${binding.source}>${node.id}`, { source: binding.source, target: node.id });
      if (!bindings.length) conexiones.set(`$input>${node.id}`, { source: '$input', target: node.id });
    }
    for (const binding of Object.values(definicion.outputs || {})) conexiones.set(`${binding.source}>$output`, { source: binding.source, target: '$output' });
    const activa = (edge) => estados[edge.target] === 'running';
    return { nodes: nodos, edges: [...conexiones.entries()].map(([id, edge]) => ({ id, ...edge, type: 'smoothstep', animated: activa(edge), style: { strokeWidth: 2 } })) };
  }, [definicion, creando, estadoCreacion, estados, seleccionado]);
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
    return <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-center">
      <p className="text-4xl" aria-hidden="true">🧩</p>
      <p className="font-semibold text-slate-800">Aquí verás tu proceso armándose</p>
      <p className="max-w-xs text-sm text-slate-600">Cuéntale a Capacita lo que necesitas. Las herramientas aparecerán conectadas y se iluminarán mientras trabajan.</p>
    </div>;
  }
  return <div ref={contenedor} className="h-full min-h-[200px] rounded-2xl border border-slate-200 bg-slate-50" aria-label="Taller: mapa del proceso">
    {/* El nodo en creación cambia de estado sin cambiar de tamaño: remontar evita que quede sin medir (oculto). */}
    <ReactFlow key={definicion?.name || `${creando}:${estadoCreacion || ''}`}nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.08 }} minZoom={0.2} maxZoom={1.4}
      nodesConnectable={false} onNodesChange={onNodesChange} onInit={(instance) => { flujo.current = instance; }} onNodeClick={(_, node) => onSeleccionar?.(node.id)} proOptions={{ hideAttribution: true }}>
      <Background /><Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
