export default function Inicio({ usuario, onCambiarSeccion }) {
  const horas = usuario?.horas_balance ?? 0;
  const nombre = usuario?.name || 'Creador';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      
      {/* Encabezado principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-slate-200/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            ¡Hola, {nombre}! 👋
          </h1>
          <p className="mt-2 text-base text-slate-600">
            Bienvenido a tu panel central en Capacita. Automatiza, intercambia habilidades y orquesta tus proyectos.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Botón "+ Nuevo workflow" arreglado */}
          <button
            onClick={() => onCambiarSeccion?.('workflows')}
            className="flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo workflow</span>
          </button>
          
          {/* Botón "Explorar Capacidades" */}
          <button
            onClick={() => onCambiarSeccion?.('capacidades')}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <span>Explorar Capacidades</span>
          </button>
        </div>
      </div>

      

      </div>

   
  );
}
