// Pestaña Actividad: workflows públicos ejecutados recientemente.
// Solo muestra nombre, pasos, estado, fecha y duración. Nunca entradas ni salidas.
import EstadoBadge from '../runs/EstadoBadge';
import { EstadoVacio } from './PerfilListas';
import { formatearFecha, formatearDuracion } from '../../utils/formato';

export default function PerfilActividad({ actividad, onVerWorkflow }) {
  return (
    <div className="space-y-4">
      {/* Aviso de privacidad */}
      <div className="flex items-center gap-2.5 text-sm text-blue-800 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Las entradas y resultados son privados.</span>
      </div>

      {actividad.length === 0 ? (
        <EstadoVacio
          icono="🕒"
          titulo="Sin actividad reciente"
          texto="Aquí aparecerán los workflows públicos que esta persona ejecute."
        />
      ) : (
        <ul className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100">
          {actividad.map((run) => (
            <li key={run.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{run.workflow_name}</p>
                <p className="mt-0.5 text-xs text-slate-500 truncate">{run.steps.join(' → ')}</p>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                <EstadoBadge estado={run.status} />
                <span>{formatearFecha(run.started_at)}</span>
                <span className="w-14">{formatearDuracion(run.duration_ms)}</span>
                <button
                  onClick={() => onVerWorkflow?.(run.workflow_id)}
                  className="font-semibold text-[#1a56db] hover:text-blue-800 cursor-pointer"
                >
                  Ver workflow →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
