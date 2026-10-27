import { useState, useEffect, useRef } from 'react';
import { buscarTodo } from "../../services/capacitaApi";
export default function BuscadorGlobal({ onCambiarSeccion }) {
  const [texto, setTexto] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const input = useRef(null);

  // Búsqueda con debounce de 300 ms (mínimo 2 letras)
  useEffect(() => {
    const t = texto.trim();
    if (t.length < 2) { setRes(null); setError(false); return; }
    let vigente = true;
    const id = setTimeout(() => {
      buscarTodo(t)
        .then((r) => { if (vigente) { setRes(r); setError(false); } })
        .catch(() => { if (vigente) { setRes(null); setError(true); } });
    }, 300);
    return () => { vigente = false; clearTimeout(id); };
  }, [texto]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const fuera = (e) => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  // Atajo Ctrl/Cmd + K para enfocar el buscador
  useEffect(() => {
    const atajo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', atajo);
    return () => document.removeEventListener('keydown', atajo);
  }, []);

  const ir = (seccion) => {
    setAbierto(false);
    setTexto('');
    setRes(null);
    onCambiarSeccion?.(seccion);
  };

  const hayResultados = res && (res.usuarios.length || res.capacidades.length || res.workflows.length);
  const mostrarPanel = abierto && texto.trim().length >= 2 && (res || error);

  return (
    <div ref={contenedor} className="relative w-56 sm:w-72 lg:w-80">
      <div className="relative flex items-center">
        <svg className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={input}
          type="text"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setAbierto(false); e.target.blur(); }
            if (e.key === 'Enter' && texto.trim().length >= 1) {
              ir(`buscar/${encodeURIComponent(texto.trim())}`);
              e.target.blur();
            }
          }}
          placeholder="Buscar capacidades, workflows..."
          className="w-full pl-9 pr-12 py-1.5 text-[13px] bg-slate-50/70 hover:bg-slate-100/60 focus:bg-white border border-slate-200/90 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1a56db] transition"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200/90 rounded px-1.5 py-0.5 shadow-2xs">
          ⌘K
        </span>
      </div>

      {mostrarPanel && (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[20rem] max-h-96 overflow-auto rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg">
          {error && <p className="p-3 text-xs text-red-600">No se pudo conectar con la API.</p>}
          {res && !hayResultados && (
            <p className="p-3 text-xs text-slate-500">Sin resultados para "{texto.trim()}".</p>
          )}

          {res?.usuarios.length > 0 && <Seccion titulo="Usuarios" />}
          {res?.usuarios.map((u) => (
            <Fila key={u.username} onClick={() => ir(`perfil/${u.username}`)}
              titulo={u.display_name}
              detalle={`@${u.username} · ${u.public_capabilities} capacidades · ${u.public_workflows} workflows`} />
          ))}

          {res?.capacidades.length > 0 && <Seccion titulo="Capacidades" />}
          {res?.capacidades.map((c) => (
            <Fila key={c.id} onClick={() => ir('comunidad')}
              titulo={c.name} detalle={`por @${c.owner_username}`} />
          ))}

          {res?.workflows.length > 0 && <Seccion titulo="Workflows" />}
          {res?.workflows.map((w) => (
            <Fila key={w.id} onClick={() => ir('comunidad')}
              titulo={w.name} detalle={`por @${w.owner_username}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Seccion({ titulo }) {
  return (
    <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
  );
}

function Fila({ titulo, detalle, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
      <p className="text-[13px] font-semibold text-slate-800 truncate">{titulo}</p>
      <p className="text-xs text-slate-500 truncate">{detalle}</p>
    </button>
  );
}