// Panel de resultado: muestra texto, imagen o un enlace de descarga según el tipo de salida.
import { useState } from 'react';

export default function ResultadoEjecucion({ tipo, resultado }) {
  const [copiado, setCopiado] = useState(false);

  const copiarTexto = async () => {
    await navigator.clipboard.writeText(resultado.output_text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (tipo === 'texto') {
    return (
      <div className="relative">
        <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-xl p-4 pr-24">
          {resultado.output_text}
        </p>
        <button
          onClick={copiarTexto}
          className="absolute top-3 right-3 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
        >
          {copiado ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
    );
  }

  if (tipo === 'imagen') {
    return (
      <div className="space-y-3">
        <img
          src={resultado.output_url}
          alt="Resultado de la ejecución"
          className="w-full max-h-80 object-contain rounded-xl border border-slate-200/80 bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:20px_20px]"
        />
        <a
          href={resultado.output_url}
          download
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a56db] hover:text-blue-800"
        >
          Descargar imagen ↓
        </a>
      </div>
    );
  }

  // pdf, audio o datos: se ofrece la descarga
  return (
    <a
      href={resultado.output_url}
      download
      className="flex items-center gap-3 p-4 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors"
    >
      <span className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-[#1a56db] flex items-center justify-center">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </span>
      <span className="text-sm font-semibold text-slate-800">Descargar resultado ({tipo})</span>
    </a>
  );
}
