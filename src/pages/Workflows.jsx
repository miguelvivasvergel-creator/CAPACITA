import { useState } from 'react';

export default function Workflows({ _usuario }) {
  const [tabActiva, setTabActiva] = useState('mis');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      
      {/* Encabezado Workflows (idéntico a la foto) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Workflows
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Automatiza y orquesta pipelines modulares encadenando múltiples capacidades digitales.
          </p>
        </div>

        {/* Botón "+ Nuevo workflow" arreglado */}
        <button
          onClick={() => {
            // Acción para nuevo workflow
          }}
          className="flex items-center gap-2 bg-[#1a56db] hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs shrink-0 self-start cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo workflow</span>
        </button>
      </div>

      <div className="border-t border-slate-200/80 my-4"></div>

      {/* Selector de pestañas y contador de workflows activos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 my-4">
        
        {/* Pestañas: Mis workflows / Comunidad */}
        <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setTabActiva('mis')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              tabActiva === 'mis'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mis workflows
          </button>
          <button
            onClick={() => setTabActiva('comunidad')}
            className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              tabActiva === 'comunidad'
                ? 'bg-white text-blue-600 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Comunidad
          </button>
        </div>

        {/* Indicador de 8 workflows activos */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>8 workflows activos</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 my-4">
        {/* Campo de búsqueda */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar por nombre o etiqueta..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition"
          />
        </div>

        {/* Filtro desplegable */}
        <div className="relative sm:w-64">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition appearance-none cursor-pointer"
          >
            <option value="todos">Filtrar por: Todos los workflows</option>
            <option value="privados">Filtrar por: Privados</option>
            <option value="publicos">Filtrar por: Públicos</option>
            <option value="activos">Filtrar por: Activos</option>
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Espacio reservado para el componente de workflows (próximo paso solicitado) */}
      <div className="my-8 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          ⚡
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          Estructura de Workflows preparada
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
          El navbar y el layout ya están sincronizados. Listo para implementar las 6 tarjetas de pipelines (Contratos, Glosario, E-Commerce, etc.) en el siguiente paso.
        </p>
      </div>

    </div>
  );
}