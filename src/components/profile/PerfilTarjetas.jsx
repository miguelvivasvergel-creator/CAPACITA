// Las 4 tarjetas de contadores del perfil.
const TARJETAS = [
  {
    clave: 'public_capabilities',
    titulo: 'Capacidades públicas',
    color: 'bg-blue-50 text-[#1a56db]',
    icono: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    clave: 'public_workflows',
    titulo: 'Workflows públicos',
    color: 'bg-indigo-50 text-indigo-600',
    icono: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    clave: 'runs',
    titulo: 'Ejecuciones',
    color: 'bg-emerald-50 text-emerald-600',
    icono: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    clave: 'clones',
    titulo: 'Veces clonado',
    color: 'bg-amber-50 text-amber-600',
    icono: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
  },
];

export default function PerfilTarjetas({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {TARJETAS.map(({ clave, titulo, color, icono }) => (
        <div
          key={clave}
          className="pillar-card bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center gap-3.5"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icono} />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-extrabold text-slate-900 leading-none">{stats?.[clave] ?? 0}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate">{titulo}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
