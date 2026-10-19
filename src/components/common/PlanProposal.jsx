/**
 * <PlanProposal> — Muestra el plan propuesto por la IA debajo del buscador del Inicio.
 * Mientras Luis Miguel entrega POST /planner/propose, se usa un plan de ejemplo.
 */

export default function PlanProposal({ plan, onAbrir, onEjecutar, onDescartar }) {
  if (!plan) return null;

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/90 border border-blue-100 px-3 py-1 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            PLAN PROPUESTO
          </span>
          <p className="mt-2 text-sm text-slate-600 font-body">{plan.explanation}</p>
        </div>
        <button
          onClick={onDescartar}
          className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer font-body"
          title="Descartar"
        >
          ✕
        </button>
      </div>

      {/* Pasos con flechas */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {plan.steps.map((paso, idx) => (
          <div key={paso.capability_id} className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
              <span className="text-xs font-semibold text-blue-700 font-body">{paso.name}</span>
              <span className="ml-1 text-[10px] text-blue-500 font-body">
                ({paso.input_type} → {paso.output_type})
              </span>
            </div>
            {idx < plan.steps.length - 1 && (
              <span className="text-slate-400 text-sm">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Botones */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAbrir}
          className="boton-primario px-4 py-2 text-white text-xs font-semibold rounded-full cursor-pointer font-body"
        >
          Abrir en el constructor
        </button>
        <button
          onClick={onEjecutar}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full cursor-pointer transition-colors font-body"
        >
          Ejecutar
        </button>
      </div>
    </div>
  );
}
