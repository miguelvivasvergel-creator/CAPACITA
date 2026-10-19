// Lista vertical de pasos con su estado: pending, running, completed o failed.
import TipoDato from '../common/TipoDato';
import EstadoBadge from './EstadoBadge';

function IconoPaso({ estado, numero }) {
  if (estado === 'completed') {
    return (
      <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (estado === 'running') {
    return (
      <span className="w-8 h-8 rounded-full bg-blue-50 border-2 border-[#1a56db] flex items-center justify-center">
        <svg className="animate-spin w-4 h-4 text-[#1a56db]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </span>
    );
  }
  if (estado === 'failed') {
    return (
      <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 text-slate-400 text-xs font-bold flex items-center justify-center">
      {numero}
    </span>
  );
}

export default function PasosEjecucion({ pasos }) {
  return (
    <ol>
      {pasos.map((paso, i) => (
        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Línea que une un paso con el siguiente */}
          {i < pasos.length - 1 && (
            <span
              className={`absolute left-4 top-9 -ml-px w-0.5 h-[calc(100%-2.5rem)] ${
                paso.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
              }`}
            />
          )}

          <IconoPaso estado={paso.status} numero={i + 1} />

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{paso.name}</p>
              <EstadoBadge estado={paso.status} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <TipoDato tipo={paso.input_type} />
              <span className="text-slate-400 text-xs">→</span>
              <TipoDato tipo={paso.output_type} />
            </div>
            {paso.error && <p className="mt-2 text-xs text-red-600">{paso.error}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
