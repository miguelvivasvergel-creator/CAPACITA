// Etiqueta de color para los 5 tipos de dato de Capacita.
const ESTILOS = {
  pdf: 'bg-rose-50 text-rose-700 border-rose-100',
  texto: 'bg-blue-50 text-blue-700 border-blue-100',
  imagen: 'bg-violet-50 text-violet-700 border-violet-100',
  audio: 'bg-amber-50 text-amber-700 border-amber-100',
  datos: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export default function TipoDato({ tipo }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wide ${
        ESTILOS[tipo] || 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {tipo}
    </span>
  );
}
