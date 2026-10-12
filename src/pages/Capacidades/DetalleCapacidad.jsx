// src/pages/Capacidades/DetalleCapacidad.jsx

export default function DetalleCapacidad({
  capacidad,
  onCerrar,
  onUsar,
  onClonar,
  onEditar,
  onEliminar,
  esDuenio = false,
}) {
  if (!capacidad) return null;

  const isPublic = capacidad.visibility === 'public';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        
        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isPublic
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {isPublic ? 'Pública' : 'Privada'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {capacidad.version || 'v1.0.0'} • {capacidad.engine || 'Adaptador Python'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {capacidad.name}
            </h2>
            <p className="text-xs text-slate-500">
              Creado por{' '}
              <a
                href={`#u/${capacidad.owner_username || 'franklin_dev'}`}
                className="text-blue-600 font-semibold hover:underline"
              >
                @{capacidad.owner_username || capacidad.owner_name || 'franklin_dev'}
              </a>
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Descripción
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            {capacidad.description}
          </p>
        </div>

        {/* Contrato de Entrada y Salida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Tipo de Entrada
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-slate-900 uppercase">
                {capacidad.input_type}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Tipo de Salida
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-slate-900 uppercase">
                {capacidad.output_type}
              </span>
            </div>
          </div>
        </div>

        {/* Permisos requeridos */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Permisos requeridos para ejecución
          </h4>
          <div className="flex flex-wrap gap-2">
            {capacidad.permissions && capacidad.permissions.length > 0 ? (
              capacidad.permissions.map((perm, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No requiere permisos especiales</span>
            )}
          </div>
        </div>

        {/* Estadísticas de uso */}
        <div className="flex items-center gap-6 py-2 border-y border-slate-100 text-xs text-slate-500">
          <div>
            <strong className="text-slate-800 font-bold">{capacidad.uses_count || 0}</strong> ejecuciones realizadas
          </div>
          <div>
            <strong className="text-slate-800 font-bold">{capacidad.clones_count || 0}</strong> veces clonado
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {esDuenio ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onEditar && onEditar(capacidad)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition cursor-pointer"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onEliminar && onEliminar(capacidad)}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onClonar && onClonar(capacidad)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Clonar a mi cuenta
            </button>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCerrar}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => onUsar && onUsar(capacidad)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-md shadow-blue-500/25 transition active:scale-[0.99] cursor-pointer"
            >
              <span>Usar capacidad →</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
