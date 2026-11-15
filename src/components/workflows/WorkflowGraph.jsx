import { useMemo } from 'react';
import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

function Step({ data }) {
  return <div className="min-w-48 rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
    <p className="max-w-60 break-words font-semibold text-slate-900">{data.label}</p>
    {data.inputs.map((name) => <div key={`in-${name}`} className="relative mt-3 text-left text-xs text-slate-700">
      <Handle type="target" position={Position.Left} id={name} style={{ left: -20, width: 12, height: 12 }} />{name}
    </div>)}
    {data.outputs.map((name) => <div key={`out-${name}`} className="relative mt-3 text-right text-xs text-slate-700">
      {name}<Handle type="source" position={Position.Right} id={name} style={{ right: -20, width: 12, height: 12 }} />
    </div>)}
  </div>;
}
const nodeTypes = { step: Step };

export default function WorkflowGraph({ definition, versions, onConnect, onMove, onRemoveEdge }) {
  const nodes = useMemo(() => [
    { id: '$input', type: 'step', position: { x: 0, y: 0 }, draggable: false,
      data: { label: 'Datos iniciales', inputs: [], outputs: Object.keys(definition.input_schema.properties || {}) } },
    ...definition.nodes.map((node, index) => ({ id: node.id, type: 'step', position: { x: node.x, y: node.y },
      data: { label: `${index + 1}. ${node.label}`, inputs: Object.keys(versions[node.version_id]?.input_schema.properties || node.bindings),
        outputs: Object.keys(versions[node.version_id]?.output_schema.properties || {}) } })),
    { id: '$output', type: 'step', position: { x: Math.max(0, ...definition.nodes.map((node) => node.x)) + 330, y: 0 }, draggable: false,
      data: { label: 'Resultado final', inputs: Object.keys(definition.outputs), outputs: [] } },
  ], [definition, versions]);
  const edges = useMemo(() => [
    ...definition.nodes.flatMap((node) => Object.entries(node.bindings).map(([field, binding]) => ({
      id: `${node.id}:${field}`, source: binding.source, sourceHandle: binding.field, target: node.id, targetHandle: field,
      label: `${binding.field} → ${field}`, type: 'smoothstep',
    }))),
    ...Object.entries(definition.outputs).map(([field, binding]) => ({ id: `$output:${field}`, source: binding.source,
      sourceHandle: binding.field, target: '$output', targetHandle: field, label: field, type: 'smoothstep' })),
  ], [definition]);
  return <div className="h-96 rounded-xl border border-slate-300 bg-slate-50" aria-label="Mapa del proceso; conexiones también editables en los formularios">
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} maxZoom={1.5}
      onConnect={onConnect} onNodeDragStop={(_, node) => onMove(node.id, node.position)}
      onEdgesDelete={(removed) => removed.forEach(onRemoveEdge)} connectOnClick>
      <Background /><Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
