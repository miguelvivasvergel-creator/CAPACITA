import { useState, useEffect } from 'react';
import { buscarTodo } from '../services/capacitaApi';

const PESTAÑAS = [
  { id: 'todo', label: 'Todo' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'capacidades', label: 'Capacidades' },
  { id: 'workflows', label: 'Workflows' },
];

export default function Buscar({ texto, onCambiarSeccion }) {
  const [entrada, setEntrada] = useState(texto);
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [pestaña, setPestaña] = useState('todo');

  useEffect(() => {
    if (texto.trim().length < 2) { setRes(null); return; }
    let vigente = true;
    setCargando(true);
    setError(false);
    buscarTodo(texto.trim(), 24)
      .then((r) => { if (vigente) setRes(r); })
      .catch(() => { if (vigente) setError(true); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [texto]);

  const buscar = () => {
    if (entrada.trim().length >= 1) {
      onCambiarSeccion?.(`buscar/${encodeURIComponent(entrada.trim())}`);
    }
  };

  const mostrar = (tipo) => pestaña === 'todo' || pestaña === tipo;
  const total = res ? res.usuarios.length + res.capacidades.length + res.workflows.length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Caja de búsqueda */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
          autoFocus
          placeholder="Buscar usuarios, capacidades, workflows..."
          className="w-full pl-12 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db]"
        />
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-2xl p-2 w-fit">
        {PESTAÑAS.map((p) => (
          <button key={p.id} onClick={() => setPestaña(p.id)}
            className={`px-4 py-1.5 rounded-xl text-sm cursor-pointer transition ${
              pestaña === p.id ? 'bg-blue-50 text-[#1a56db] font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Estados */}
      {texto.trim().length < 2 && (
        <p className="text-sm text-slate-500">Escribe al menos 2 letras y pulsa Enter.</p>
      )}
      {cargando && <p className="text-sm text-slate-500">Buscando…</p>}
      {error && <p className="text-sm text-red-600">No se pudo conectar con la API.</p>}
      {res && !cargando && total === 0 && (
        <p className="text-sm text-slate-500">Sin resultados para "{texto}".</p>
      )}

      {/* Usuarios */}
      {res && mostrar('usuarios') && res.usuarios.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Usuarios ({res.usuarios.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {res.usuarios.map((u) => (
              <div key={u.username} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name)}&background=1a56db&color=fff&size=128&bold=true`}
                    alt={u.display_name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{u.display_name}</p>
                    <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                    <p className="text-xs text-slate-400">
                      {u.public_capabilities} capacidades · {u.public_workflows} workflows
                    </p>
                  </div>
                </div>
                <button onClick={() => onCambiarSeccion?.(`perfil/${u.username}`)}
                  className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700 py-2 cursor-pointer transition-colors">
                  Ver perfil
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Capacidades y workflows */}
      {res && mostrar('capacidades') && res.capacidades.length > 0 && (
        <ListaItems titulo="Capacidades" items={res.capacidades} onCambiarSeccion={onCambiarSeccion} />
      )}
      {res && mostrar('workflows') && res.workflows.length > 0 && (
        <ListaItems titulo="Workflows" items={res.workflows} onCambiarSeccion={onCambiarSeccion} />
      )}
    </div>
  );
}

function ListaItems({ titulo, items, onCambiarSeccion }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
        {titulo} ({items.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((i) => (
          <div key={i.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-semibold text-slate-900">{i.name}</p>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{i.description}</p>
            <button onClick={() => onCambiarSeccion?.(`perfil/${i.owner_username}`)}
              className="mt-3 text-xs font-medium text-[#1a56db] hover:underline cursor-pointer">
              por @{i.owner_username}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
