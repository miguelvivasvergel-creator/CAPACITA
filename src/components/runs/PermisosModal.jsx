// Modal de Permisos: el usuario acepta lo que pedirá el workflow antes de ejecutarlo.
// Se monta solo cuando está abierto, así la casilla siempre empieza sin marcar.
import { useState, useEffect } from 'react';

export default function PermisosModal({ permisos, onCancelar, onConfirmar }) {
  const [acepto, setAcepto] = useState(false);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onCancelar();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCancelar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-permisos"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-card border border-slate-100 p-6 sm:p-7"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1a56db] flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h2 id="titulo-permisos" className="text-lg font-bold text-slate-900">
          Este workflow pedirá permiso para:
        </h2>

        <ul className="mt-4 space-y-2.5">
          {permisos.map((permiso) => (
            <li key={permiso} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {permiso}
            </li>
          ))}
        </ul>

        <label className="mt-5 flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#1a56db] focus:ring-blue-500/30"
          />
          <span className="text-sm font-medium text-slate-700">Entiendo y acepto</span>
        </label>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={!acepto}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Permitir y ejecutar
          </button>
        </div>
      </div>
    </div>
  );
}
