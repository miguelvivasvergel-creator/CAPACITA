import { useState } from 'react';
import {
  mockStats,
  mockCapacidadesDestacadas,
  mockWorkflowsActivos,
} from '../mocks/home';
import { mockUsuarios } from '../mocks/users';
import PlanProposal from '../components/common/PlanProposal';

export default function Inicio({ usuario, onCambiarSeccion }) {
  const nombre = usuario?.name || 'Creador';

  // Buscador: dos modos (buscar / ia)
  const [modoBuscador, setModoBuscador] = useState('buscar');
  const [filtroBuscar, setFiltroBuscar] = useState('popularidad'); // popularidad | persona | capacidades
  const [consulta, setConsulta] = useState('');
  const [plan, setPlan] = useState(null);

  // Resultados filtrados por personas (modo Buscar + filtro Persona)
  const consultaMin = consulta.trim().toLowerCase();
  const resultadosPersonas =
    modoBuscador === 'buscar' && filtroBuscar === 'persona' && consultaMin.length >= 1
      ? mockUsuarios.filter(
          (u) =>
            u.username.toLowerCase().includes(consultaMin) ||
            u.nombre.toLowerCase().includes(consultaMin)
        ).slice(0, 5)
      : [];

  const handleConectarCapacidad = () => {
    if (!consulta.trim()) return;
    // Mock: en producción llamará POST /planner/propose (Luis Miguel).
    const planFalso = {
      explanation: `Propuesta para: "${consulta.trim()}"`,
      steps: [
        { capability_id: 'cap-002', name: 'Extraer texto', input_type: 'pdf',    output_type: 'texto' },
        { capability_id: 'cap-003', name: 'Traducir',      input_type: 'texto',  output_type: 'texto' },
        { capability_id: 'cap-004', name: 'Resumir',       input_type: 'texto',  output_type: 'texto' },
      ],
    };
    setPlan(planFalso);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

      {/* Encabezado centrado estilo mockup */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-sans leading-tight">
          Tu talento también es una{' '}
          <span className="text-blue-600">capacidad</span>
        </h1>
        <p className="mt-4 text-base text-slate-500 font-body">
          Conecta, comparte y accede a las habilidades que necesitas para hacer realidad cualquier proyecto.
        </p>
      </div>

      {/* Hola usuario */}
      <p className="mt-6 text-center text-sm text-slate-500 font-body">
        ¡Hola, <span className="font-semibold text-slate-700">{nombre}</span>! 👋
      </p>

      {/* Buscador grande con selector Buscar / IA */}
      <div className="mt-8 max-w-3xl mx-auto">

        {/* Selector de modo */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center bg-white border border-slate-200 shadow-soft p-1 rounded-full">
            <button
              onClick={() => { setModoBuscador('buscar'); setPlan(null); }}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors font-body ${
                modoBuscador === 'buscar'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 Buscar
            </button>
            <button
              onClick={() => setModoBuscador('ia')}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors font-body ${
                modoBuscador === 'ia'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✨ IA
            </button>
          </div>
        </div>

        {/* Caja de búsqueda grande con botón adentro */}
        <div className="relative bg-white border border-slate-200 rounded-full shadow-card p-2 flex items-center">
          <svg className="w-5 h-5 text-slate-400 ml-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder={
              modoBuscador === 'buscar'
                ? 'Diseño UX...'
                : 'Ej: tengo un PDF en inglés y lo quiero resumido en español'
            }
            className="flex-1 px-3 py-2 text-base bg-transparent !border-0 !outline-none !ring-0 focus:!outline-none focus:!ring-0 focus:!border-0 focus:!shadow-none text-slate-900 placeholder-slate-400 font-body rounded-full"
          />
          <button
            onClick={handleConectarCapacidad}
            className="boton-primario px-5 py-2.5 text-white text-sm font-semibold rounded-full cursor-pointer font-body shrink-0 flex items-center gap-2"
          >
            <span>Conectar capacidad</span>
            <span>→</span>
          </button>
        </div>

        {/* Panel de filtros (solo en modo Buscar) */}
        {modoBuscador === 'buscar' && (
          <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-slate-500 font-body mr-2">Filtrar por:</span>
              <ChipFiltro activo={filtroBuscar === 'popularidad'} onClick={() => setFiltroBuscar('popularidad')}>
                📈 Popularidad
              </ChipFiltro>
              <ChipFiltro activo={filtroBuscar === 'persona'} onClick={() => setFiltroBuscar('persona')}>
                👤 Persona
              </ChipFiltro>
              <ChipFiltro activo={filtroBuscar === 'capacidades'} onClick={() => setFiltroBuscar('capacidades')}>
                ⚡ Capacidades creadas
              </ChipFiltro>
            </div>

            {/* Contenido según filtro */}
            {filtroBuscar === 'popularidad' && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-body mb-2">📈 POPULARIDAD</p>
                <div className="flex flex-wrap gap-2">
                  <EtiquetaConteo nombre="Diseño UX" cantidad={25} />
                  <EtiquetaConteo nombre="Machine Learning" cantidad={13} />
                  <EtiquetaConteo nombre="Estrategia" cantidad={18} />
                </div>
              </>
            )}

            {filtroBuscar === 'persona' && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-body mb-2">👤 PERSONA</p>
                {resultadosPersonas.length > 0 ? (
                  <ul className="space-y-2">
                    {resultadosPersonas.map((u) => (
                      <li
                        key={u.username}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-full cursor-pointer flex items-center justify-between font-body"
                      >
                        <span className="text-sm font-semibold text-slate-800">{u.nombre}</span>
                        <span className="text-xs text-slate-500">@{u.username}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 font-body">
                    Escribe un nombre o usuario arriba para buscar personas.
                  </p>
                )}
              </>
            )}

            {filtroBuscar === 'capacidades' && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 font-body mb-2">⚡ CAPACIDADES CREADAS</p>
                <div className="flex flex-wrap gap-2">
                  <EtiquetaConteo nombre="Desarrollo Web" cantidad={31} />
                  <EtiquetaConteo nombre="Data" cantidad={9} />
                  <EtiquetaConteo nombre="IA" cantidad={22} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Resultado modo IA */}
        {modoBuscador === 'ia' && plan && (
          <PlanProposal
            plan={plan}
            onAbrir={() => onCambiarSeccion?.('workflows')}
            onEjecutar={() => alert('Abriendo pantalla de ejecución (lo entrega Fahida).')}
            onDescartar={() => setPlan(null)}
          />
        )}
      </div>

      {/* Tarjeta de estadísticas */}
      <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TarjetaStat label="Usuarios activos"     valor={mockStats.usuarios_activos} />
        <TarjetaStat label="Ejecuciones hoy"      valor={mockStats.ejecuciones_hoy} />
        <TarjetaStat label="Capacidades públicas" valor={mockStats.capacidades_publicas} />
        <TarjetaStat label="Workflows públicos"   valor={mockStats.workflows_publicos} />
      </div>

      {/* Capacidades destacadas */}
      <section className="mt-14 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
            Capacidades destacadas
          </h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-semibold font-body cursor-pointer">
            Ver todas →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCapacidadesDestacadas.map((cap) => (
            <article
              key={cap.id}
              className="pillar-card bg-white border border-slate-200 rounded-2xl p-5 shadow-soft"
            >
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-body">
                por {cap.owner_name}
              </p>
              <h3 className="mt-1 text-base font-extrabold text-slate-900 tracking-tight font-sans">
                {cap.name}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 font-body line-clamp-2">
                {cap.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-body">
                <span>{cap.input_type} → {cap.output_type}</span>
                <span className="font-semibold text-slate-600">{cap.uses_count} usos</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Workflows activos */}
      <section className="mt-10 mb-6 max-w-6xl mx-auto">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans mb-4">
          Workflows activos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockWorkflowsActivos.map((wf) => (
            <article
              key={wf.id}
              className="pillar-card bg-white border border-slate-200 rounded-2xl p-5 shadow-soft"
            >
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 font-body">
                por {wf.owner_name}
              </p>
              <h3 className="mt-1 text-base font-extrabold text-slate-900 tracking-tight font-sans">
                {wf.name}
              </h3>
              <p className="mt-2 text-xs text-slate-500 font-body">
                {wf.pasos.join(' → ')}
              </p>
              <p className="mt-3 text-xs text-slate-500 font-body font-semibold">
                {wf.uses_count} usos
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TarjetaStat({ label, valor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-soft">
      <p className="text-3xl font-extrabold text-blue-600 tracking-tight font-sans">{valor}</p>
      <p className="mt-1 text-xs text-slate-500 font-body">{label}</p>
    </div>
  );
}

function ChipFiltro({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border cursor-pointer transition-colors font-body ${
        activo
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function EtiquetaConteo({ nombre, cantidad }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
      <span className="text-sm font-semibold text-slate-800 font-body">{nombre}</span>
      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
        {cantidad}
      </span>
    </div>
  );
}
