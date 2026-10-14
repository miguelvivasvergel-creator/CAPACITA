// Píldora de estado para ejecuciones y pasos.
// Acepta los estados del backend: queued, pending, running, completed, failed.
const ESTADOS = {
  queued: { texto: 'Pendiente', estilo: 'bg-slate-100 text-slate-600', punto: 'bg-slate-400' },
  pending: { texto: 'Pendiente', estilo: 'bg-slate-100 text-slate-600', punto: 'bg-slate-400' },
  running: { texto: 'En proceso', estilo: 'bg-blue-50 text-blue-700', punto: 'bg-blue-500 animate-pulse' },
  completed: { texto: 'Completada', estilo: 'bg-emerald-50 text-emerald-700', punto: 'bg-emerald-500' },
  failed: { texto: 'Error', estilo: 'bg-red-50 text-red-700', punto: 'bg-red-500' },
};

export default function EstadoBadge({ estado }) {
  const { texto, estilo, punto } = ESTADOS[estado] || ESTADOS.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estilo}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${punto}`} />
      {texto}
    </span>
  );
}
