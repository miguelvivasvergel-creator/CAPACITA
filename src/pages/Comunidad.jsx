import { useState, useEffect, useRef } from 'react';
import { getComunidad, getCreadores, getPopulares, buscarPerfiles } from '../services/CapacitaAPI';

const PAGINA = 4;

function tiempoRelativo(fechaIso) {
  if (!fechaIso) return '';
  const diff = (Date.now() - new Date(fechaIso).getTime()) / 1000;
  if (diff < 3600) return `Hace ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
  const dias = Math.floor(diff / 86400);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

export default function Comunidad({ _usuario, onCambiarSeccion }) {
  const [filtro, setFiltro] = useState('todo');
  const [orden, setOrden] = useState('recientes');
  const [mostrar, setMostrar] = useState(PAGINA);
  const [toast, setToast] = useState('');

  // Datos reales de la API .NET
  const [items, setItems]       = useState([]);
  const [creadores, setCreadores] = useState([]);
  const [populares, setPopulares] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [errorApi, setErrorApi]   = useState(null);

  // Buscador de usuarios
  const [query, setQuery]           = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando]     = useState(false);
  const buscadorRef = useRef(null);

  // --- Carga inicial ---
  useEffect(() => {
    Promise.all([getComunidad(), getCreadores(), getPopulares()])
      .then(([i, c, p]) => { setItems(i || []); setCreadores(c || []); setPopulares(p || []); })
      .catch(() => setErrorApi('No se pudo conectar con la API .NET.'))
      .finally(() => setCargando(false));
  }, []);

  // --- Buscador con debounce 300 ms ---
  useEffect(() => {
    const texto = query.trim();
    if (texto.length < 2) { setResultados([]); setBuscando(false); return; }

    setBuscando(true);
    const id = setTimeout(async () => {
      try   { setResultados(await buscarPerfiles(texto) || []); }
      catch  { setResultados([]); }
      finally { setBuscando(false); }
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  // Cerrar lista al clic fuera
  useEffect(() => {
    const fn = (e) => { if (!buscadorRef.current?.contains(e.target)) setQuery(''); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const irPerfil = (username) => {
    setQuery('');
    if (onCambiarSeccion) {
      onCambiarSeccion(`perfil/${username}`);
    } else {
      window.location.assign(`#perfil/${username}`);
    }
  };

  // Filtro + orden de publicaciones
  let lista = items;
  if (filtro === 'capacidades') lista = lista.filter((x) => x.tipo === 'capacidad');
  if (filtro === 'workflows')   lista = lista.filter((x) => x.tipo === 'workflow');
  lista = [...lista].sort((a, b) =>
    orden === 'populares'
      ? (b.uses_count || 0) - (a.uses_count || 0)
      : new Date(b.created_at) - new Date(a.created_at)
  );
  const visibles = lista.slice(0, mostrar);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

      {/* ── Buscador de usuarios ── */}
      <div className="relative mb-6 max-w-sm" ref={buscadorRef}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios…"
          className="w-full pl-4 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition font-body"
        />
        {buscando && (
          <div className="absolute right-3 top-2.5">
            <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          </div>
        )}

        {/* Resultados del buscador */}
        {query.trim().length >= 2 && (
          <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 max-h-64 overflow-y-auto font-body">
            {resultados.length === 0 && !buscando && (
              <li className="p-3 text-sm text-slate-500 text-center">Sin resultados para &quot;{query}&quot;</li>
            )}
            {resultados.map((p) => (
              <li key={p.username}>
                <button
                  onClick={() => irPerfil(p.username)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(p.display_name || p.username || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.display_name}</p>
                    <p className="text-xs text-slate-400">@{p.username} · ⚡{p.public_capabilities ?? 0} 🔀{p.public_workflows ?? 0}</p>
                  </div>
                </button>
              </li>
            ))}
            {/* Nota de limitación actual */}
            <li className="px-3 py-2 text-[11px] text-slate-400 bg-slate-50">
              ℹ️ Solo muestra los 4 perfiles de ejemplo de la API .NET. Los usuarios reales de Supabase se integran en un paso siguiente.
            </li>
          </ul>
        )}
      </div>

      {/* ── Chips de filtro ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-soft inline-flex flex-wrap gap-1 mb-4">
        {['todo','capacidades','workflows'].map((f) => (
          <button key={f} onClick={() => { setFiltro(f); setMostrar(PAGINA); }}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors font-body ${filtro === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {f === 'todo' ? 'Todo' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="w-px bg-slate-200 mx-1 my-1" />
        {['populares','recientes'].map((o) => (
          <button key={o} onClick={() => setOrden(o)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors font-body ${orden === o ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {o === 'populares' ? 'Más populares' : 'Recientes'}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && <div className="mb-4 inline-block bg-green-50 border border-green-200 text-green-700 text-xs font-semibold font-body px-3 py-2 rounded-full">{toast}</div>}

      {/* Error de conexión */}
      {errorApi && !cargando && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-body">{errorApi}</p>
      )}

      {/* ── Layout principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tarjetas */}
        <div className="lg:col-span-2">
          {cargando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1,2,3,4].map((n) => <div key={n} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : visibles.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500 font-body">
              No hay publicaciones con ese filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibles.map((item) => (
                <Tarjeta key={item.id} item={item} onClonar={() => { setToast(`"${item.name}" clonado ✓`); setTimeout(() => setToast(''), 2500); }} onIrPerfil={irPerfil} />
              ))}
            </div>
          )}

          {mostrar < lista.length && (
            <div className="mt-6 text-center">
              <button onClick={() => setMostrar(mostrar + PAGINA)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-full cursor-pointer transition-colors font-body shadow-soft">
                🔄 Cargar más
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <SidebarCard titulo="Creadores destacados">
            {cargando
              ? [1,2,3].map((n) => <div key={n} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)
              : creadores.map((c) => (
                <button key={c.username} onClick={() => irPerfil(c.username)}
                  className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl p-1 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(c.nombre || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-800 truncate font-sans">{c.nombre}</p>
                    <p className="text-xs text-slate-500 font-body">{c.usos} usos</p>
                  </div>
                </button>
              ))
            }
          </SidebarCard>

          <SidebarCard titulo="Capacidades más populares">
            {cargando
              ? [1,2,3].map((n) => <div key={n} className="h-6 bg-slate-100 rounded animate-pulse" />)
              : populares.map((c, idx) => (
                <div key={c.id} className="flex items-center justify-between text-sm font-body">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-slate-400 font-semibold w-4">{idx + 1}</span>
                    <span className="text-slate-700 truncate">{c.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold shrink-0">{c.uses_count ?? 0}</span>
                </div>
              ))
            }
          </SidebarCard>
        </aside>
      </div>
    </div>
  );
}

/* ── Subcomponentes ── */

function SidebarCard({ titulo, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft space-y-3">
      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans">{titulo}</h3>
      {children}
    </div>
  );
}

function Tarjeta({ item, onClonar, onIrPerfil }) {
  const esCapacidad = item.tipo === 'capacidad';
  const chips = esCapacidad ? [item.input_type, item.output_type].filter(Boolean) : item.pasos || [];

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full font-body ${esCapacidad ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
          {esCapacidad ? '⚡ Capacidad' : '🔀 Workflow'}
        </span>
        <span className="text-xs text-slate-400 font-body">{tiempoRelativo(item.created_at)}</span>
      </div>

      <h3 className="text-base font-extrabold text-slate-900 font-sans">{item.name}</h3>
      <p className="mt-1 text-xs text-slate-500 font-body line-clamp-2">{item.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {chips.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-700 font-body">{t}</span>
            {i < chips.length - 1 && <span className="text-slate-400 text-xs">→</span>}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between">
        <button onClick={() => onIrPerfil?.(item.owner_username)} className="flex items-center gap-2 hover:opacity-75 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-body shrink-0">
            {(item.owner_name || '?').slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-800 font-body">{item.owner_name}</span>
          <span className="text-xs text-slate-400 font-body">▶ {item.uses_count || 0}</span>
        </button>
        <button onClick={onClonar}
          className="boton-primario inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-full cursor-pointer font-body">
          Clonar y usar
        </button>
      </div>
    </article>
  );
}
