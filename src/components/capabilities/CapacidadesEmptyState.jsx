// src/components/capabilities/CapacidadesEmptyState.jsx

export default function CapacidadesEmptyState({ onCrearClick, onSeleccionarPlantilla }) {
  const plantillas = [
    {
      id: 'facturas',
      titulo: 'Extraer datos de facturas',
      icon: (
        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'traducir',
      titulo: 'Traducir documentos',
      icon: (
        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
    },
    {
      id: 'audios',
      titulo: 'Limpiar audios',
      icon: (
        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-8 bg-white border border-slate-200/90 rounded-3xl p-12 sm:p-16 text-center shadow-sm">
      {/* Icono de herramientas */}
      <div className="w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-sm">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      </div>

      {/* Título y descripción */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-6 tracking-tight">
        Aún no tienes capacidades creadas
      </h2>
      <p className="text-slate-500 text-xs sm:text-sm max-w-lg mx-auto mt-2.5 leading-relaxed font-normal">
        Crea tu primera capacidad para automatizar tareas repetitivas o encadenarla en workflows personalizados con otros nodos.
      </p>

      {/* Botón Crear mi primera capacidad */}
      <div className="mt-7">
        <button
          type="button"
          onClick={onCrearClick}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-full transition shadow-md shadow-blue-500/25 active:scale-[0.99] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Crear mi primera capacidad</span>
        </button>
      </div>

      {/* Sección de plantillas */}
      <div className="mt-14 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 font-medium mb-3">
          O empieza con una plantilla predefinida:
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs">
          {plantillas.map((pl, idx) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => onSeleccionarPlantilla && onSeleccionarPlantilla(pl)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white hover:bg-blue-50/50 hover:border-blue-200 text-slate-700 hover:text-blue-600 font-medium transition shadow-xs cursor-pointer"
            >
              {pl.icon}
              <span>{pl.titulo}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
