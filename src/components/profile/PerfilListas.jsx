// Listas de capacidades y workflows que se muestran en las pestañas del perfil.
import TipoDato from '../common/TipoDato';

export function EstadoVacio({ icono, titulo, texto }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center bg-slate-50/50">
      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 text-xl">
        {icono}
      </div>
      <h3 className="text-base font-bold text-slate-800">{titulo}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{texto}</p>
    </div>
  );
}

function EtiquetaPrivada() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Privada
    </span>
  );
}

export function ListaCapacidades({ capacidades }) {
  if (capacidades.length === 0) {
    return (
      <EstadoVacio
        icono="🧩"
        titulo="Sin capacidades públicas"
        texto="Cuando esta persona publique una capacidad, aparecerá aquí."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {capacidades.map((cap) => (
        <article key={cap.id} className="pillar-card bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-slate-900">{cap.name}</h3>
            {cap.visibility === 'private' && <EtiquetaPrivada />}
          </div>
          <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{cap.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TipoDato tipo={cap.input_type} />
              <span className="text-slate-400 text-xs">→</span>
              <TipoDato tipo={cap.output_type} />
            </div>
            <span className="text-xs font-medium text-slate-400">{cap.uses_count} usos</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ListaWorkflows({ workflows, onEjecutar }) {
  if (workflows.length === 0) {
    return (
      <EstadoVacio
        icono="⚡"
        titulo="Sin workflows públicos"
        texto="Cuando esta persona publique un workflow, aparecerá aquí."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {workflows.map((wf) => (
        <article key={wf.id} className="pillar-card bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-slate-900">{wf.name}</h3>
            {wf.visibility === 'private' && <EtiquetaPrivada />}
          </div>
          <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{wf.description}</p>

          {/* Pasos encadenados */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {wf.steps.map((paso, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-300 text-xs">→</span>}
                <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{paso}</span>
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{wf.uses_count} ejecuciones</span>
            <button
              onClick={() => onEjecutar?.(wf.id)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#1a56db] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
              </svg>
              Ejecutar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
