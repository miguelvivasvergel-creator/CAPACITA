import { useMemo } from 'react';
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
export default function LienzoTaller({ definicion, creando, estados = {}, seleccionado, onSeleccionar }) {
  const { nodes, edges } = useMemo(() => {
    if (creando) {
      return { nodes: [{ id: 'creando', type: 'paso', position: { x: 0, y: 0 }, data: { tipo: 'Herramienta nueva', label: creando, estado: 'creando' } }], edges: [] };
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
  }, [definicion, creando, estados, seleccionado]);

  if (!nodes.length) {
    return <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-center">
      <p className="text-4xl" aria-hidden="true">🧩</p>
      <p className="font-semibold text-slate-800">Aquí verás tu proceso armándose</p>
      <p className="max-w-xs text-sm text-slate-600">Cuéntale a Capacita lo que necesitas. Las herramientas aparecerán conectadas y se iluminarán mientras trabajan.</p>
    </div>;
  }
  return <div className="h-full min-h-72 rounded-2xl border border-slate-200 bg-slate-50" aria-label="Taller: mapa del proceso">
    <ReactFlow key={definicion?.name || creando} nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} maxZoom={1.4}
      nodesConnectable={false} onNodeClick={(_, node) => onSeleccionar?.(node.id)} proOptions={{ hideAttribution: true }}>
      <Background /><Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
