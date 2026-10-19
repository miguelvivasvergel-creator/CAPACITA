// src/components/capabilities/CapacidadesSubNav.jsx

export default function CapacidadesSubNav({
  seccion,
  onCambiar,
  totalMis = 0,
  totalComunidad = 6,
}) {
  return (
    <div className="w-full flex items-center justify-between border-b border-slate-200 mt-6 mb-6">
      {/* Las 2 únicas pestañas acordadas */}
      <div className="flex items-center gap-8">
        {/* Pestaña 1: Mis capacidades */}
        <button
          type="button"
          onClick={() => onCambiar('mis')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
            seccion === 'mis'
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Mis capacidades</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              seccion === 'mis'
                ? 'bg-blue-100/70 text-blue-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {totalMis}
          </span>
          {seccion === 'mis' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        {/* Pestaña 2: Comunidad */}
        <button
          type="button"
          onClick={() => onCambiar('comunidad')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
            seccion === 'comunidad'
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Comunidad</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              seccion === 'comunidad'
                ? 'bg-blue-100/70 text-blue-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {totalComunidad}
          </span>
          {seccion === 'comunidad' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Indicador a la derecha */}
      <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
        {seccion === 'comunidad'
          ? `Mostrando ${totalComunidad} disponibles`
          : totalMis === 0
          ? 'Sin capacidades personales'
          : `${totalMis} creadas`}
      </span>
    </div>
  );
}