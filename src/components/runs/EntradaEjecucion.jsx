// Entrada de la ejecución: un cuadro de texto si el primer paso recibe texto,
// o un selector de archivo para los demás tipos.
// Nota: el selector se cambia por <FileUpload> de Franklin en la integración (12–14 oct).
const ACEPTA = {
  pdf: '.pdf',
  imagen: '.png,.jpg,.jpeg',
  audio: '.mp3,.wav',
  datos: '.csv,.json,.txt',
};

export default function EntradaEjecucion({ tipo, texto, archivo, onTexto, onArchivo, deshabilitado }) {
  if (tipo === 'texto') {
    return (
      <textarea
        value={texto}
        onChange={(e) => onTexto(e.target.value)}
        disabled={deshabilitado}
        rows={6}
        placeholder="Escribe o pega aquí el texto de entrada..."
        className="w-full p-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition resize-none disabled:bg-slate-50"
      />
    );
  }

  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed text-center transition-colors ${
        archivo ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50 hover:border-[#1a56db] hover:bg-blue-50/40'
      } ${deshabilitado ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
    >
      <input
        type="file"
        accept={ACEPTA[tipo]}
        className="sr-only"
        onChange={(e) => onArchivo(e.target.files[0] || null)}
      />
      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-[#1a56db] flex items-center justify-center shadow-xs">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      {archivo ? (
        <>
          <p className="text-sm font-semibold text-slate-800">{archivo.name}</p>
          <p className="text-xs text-slate-500">Haz clic para cambiar el archivo</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-800">Sube tu archivo</p>
          <p className="text-xs text-slate-500">Formatos: {ACEPTA[tipo]}</p>
        </>
      )}
    </label>
  );
}
