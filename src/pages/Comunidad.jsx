import { useState } from 'react';
import {
  mockComunidadItems,
  mockCreadoresDestacados,
  mockCapacidadesPopulares,
} from '../mocks/community';

const PAGINA = 4;

// Convierte una fecha ISO en "Hace X horas / días"
function tiempoRelativo(fechaIso) {
  const diff = (Date.now() - new Date(fechaIso).getTime()) / 1000;
  if (diff < 3600) return `Hace ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
  const dias = Math.floor(diff / 86400);
  if (dias === 1) return 'Ayer';
  return `Hace ${dias} días`;
}

export default function Comunidad({ _usuario }) {
  const [filtro, setFiltro] = useState('todo');       // todo | capacidades | workflows
  const [orden, setOrden] = useState('recientes');    // recientes | populares
  const [mostrar, setMostrar] = useState(PAGINA);
  const [toast, setToast] = useState('');

  // 1. Filtrar por tipo
  let items = mockComunidadItems;
  if (filtro === 'capacidades') items = items.filter((x) => x.tipo === 'capacidad');
  if (filtro === 'workflows')   items = items.filter((x) => x.tipo === 'workflow');

  // 2. Ordenar
  items = [...items].sort((a, b) => {
    if (orden === 'populares') return b.uses_count - a.uses_count;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const visibles = items.slice(0, mostrar);
  const hayMas = mostrar < items.length;

  const handleClonar = (item) => {
    setToast(`"${item.name}" clonado a tu cuenta ✓`);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* Pestañas-chip (Todo / Capacidades / Workflows / Más populares / Recientes) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-soft inline-flex flex-wrap gap-1">
        <PestañaChip activo={filtro === 'todo'}        onClick={() => { setFiltro('todo');        setMostrar(PAGINA); }}>Todo</PestañaChip>
        <PestañaChip activo={filtro === 'capacidades'} onClick={() => { setFiltro('capacidades'); setMostrar(PAGINA); }}>Capacidades</PestañaChip>
        <PestañaChip activo={filtro === 'workflows'}   onClick={() => { setFiltro('workflows');   setMostrar(PAGINA); }}>Workflows</PestañaChip>
        <div className="w-px bg-slate-200 mx-1 my-1" />
        <PestañaChip activo={orden === 'populares'}    onClick={() => setOrden('populares')}>Más populares</PestañaChip>
        <PestañaChip activo={orden === 'recientes'}    onClick={() => setOrden('recientes')}>Recientes</PestañaChip>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mt-4 inline-block bg-green-50 border border-green-200 text-green-700 text-xs font-semibold font-body px-3 py-2 rounded-full">
          {toast}
        </div>
      )}

      {/* Layout 2 columnas */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Grid de tarjetas */}
        <div className="lg:col-span-2">
          {visibles.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500 font-body">
              No hay publicaciones con ese filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibles.map((item) => (
                <TarjetaComunidad
                  key={item.id}
                  item={item}
                  onClonar={() => handleClonar(item)}
                />
              ))}
            </div>
          )}

          {hayMas && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setMostrar(mostrar + PAGINA)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-full cursor-pointer transition-colors font-body shadow-soft"
              >
                <span>🔄</span>
                <span>Cargar más</span>
              </button>
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans mb-4">
              Creadores destacados
            </h3>
            <ul className="space-y-3">
              {mockCreadoresDestacados.map((c) => (
                <li key={c.username} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center font-body shrink-0">
                    {c.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-slate-800 truncate font-sans">
                        {c.nombre}
                      </p>
                      <CheckVerificado />
                    </div>
                    <p className="text-xs text-slate-500 truncate font-body">
                      {c.usos} usos
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans mb-4">
              Capacidades más populares
            </h3>
            <ol className="space-y-2.5 font-body">
              {mockCapacidadesPopulares.map((c, idx) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-slate-400 font-semibold w-4">{idx + 1}</span>
                    <span className="text-slate-700 truncate">{c.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 font-semibold">
                    {c.uses_count}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes ---------- */

function PestañaChip({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors font-body ${
        activo
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function CheckVerificado() {
  return (
    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

function TarjetaComunidad({ item, onClonar }) {
  const esCapacidad = item.tipo === 'capacidad';
  const tipos = esCapacidad
    ? [item.input_type, item.output_type]
    : item.pasos;

  return (
    <article className="pillar-card bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex flex-col">
      {/* Etiqueta + tiempo */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-body ${
          esCapacidad
            ? 'bg-blue-50 text-blue-700 border border-blue-100'
            : 'bg-purple-50 text-purple-700 border border-purple-100'
        }`}>
          {esCapacidad ? '⚡' : '🔀'} {esCapacidad ? 'Capacidad' : 'Workflow'}
        </span>
        <span className="text-xs text-slate-400 font-body">
          {tiempoRelativo(item.created_at)}
        </span>
      </div>

      {/* Nombre */}
      <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
        {item.name}
      </h3>
      <p className="mt-1.5 text-xs text-slate-500 font-body line-clamp-2">
        {item.description}
      </p>

      {/* Chips con flechas */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tipos.map((t, idx) => (
          <span key={idx} className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700 font-body">
              {t}
            </span>
            {idx < tipos.length - 1 && (
              <span className="text-slate-400 text-xs">→</span>
            )}
          </span>
        ))}
      </div>

      {/* Pie: autor + usos + botón */}
      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-body shrink-0">
            {item.owner_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-semibold text-slate-800 truncate font-body">
              {item.owner_name}
            </span>
            <CheckVerificado />
          </div>
          <span className="text-xs text-slate-400 font-body shrink-0">
            ▶ {item.uses_count}
          </span>
        </div>
        <button
          onClick={onClonar}
          className="boton-primario inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-full cursor-pointer font-body shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Clonar y usar</span>
        </button>
      </div>
    </article>
  );
}
