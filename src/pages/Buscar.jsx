import { useEffect, useRef, useState } from 'react';
import { useBusqueda } from '../hooks/useBusqueda';
import { buscarTodo } from '../services/busqueda';
import { clonarCapacidad, obtenerCapacidad } from '../services/capacidades';
import DetalleCapacidad from '../components/capabilities/DetalleCapacidad';

const BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function Buscar({ texto, capacidadId, metodo, alcance, usuario, onCambiarSeccion }) {
  const [entrada, setEntrada] = useState(texto);
  const modo = ['text', 'semantic'].includes(metodo) ? metodo : 'text';
  const scope = ['available', 'mine', 'community'].includes(alcance) ? alcance : 'available';
  const [revision, setRevision] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const [notice, setNotice] = useState('');
  const [accionError, setAccionError] = useState('');
  const [cloning, setCloning] = useState(false);
  const { res, cargando, error } = useBusqueda(texto, { limite: 20, delay: 0, modo, scope, revision });
  useEffect(() => { document.title = 'Buscar — Capacita'; }, []);

  function navigate(query, nextMode = modo, nextScope = scope) {
    onCambiarSeccion?.(`buscar/${encodeURIComponent(query.trim())}//${nextMode}/${nextScope}`);
  }

  useEffect(() => {
    if (!capacidadId) return;
    const controller = new AbortController();
    obtenerCapacidad(capacidadId, { signal: controller.signal })
      .then(item => { if (!controller.signal.aborted) setDetalle(item); })
      .catch(cause => { if (!controller.signal.aborted) setAccionError(cause.message); });
    return () => controller.abort();
  }, [capacidadId]);

  async function clone() {
    if (cloning || !detalle) return;
    setCloning(true);
    setAccionError('');
    try {
      const result = await clonarCapacidad(detalle.id);
      setNotice(`“${result.name}” guardada como borrador privado en Mis capacidades.`);
      setDetalle(null);
      setRevision(value => value + 1);
    } catch (cause) { setAccionError(cause.message); }
    finally { setCloning(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Buscar capacidades y personas</h1>
      <form onSubmit={event => { event.preventDefault(); if (entrada.trim().length >= 2) navigate(entrada); }} className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">Consulta
          <input autoFocus maxLength={200} value={entrada} onChange={event => setEntrada(event.target.value)} placeholder="Describe lo que necesitas encontrar" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-normal" />
        </label>
        <button type="submit" disabled={entrada.trim().length < 2} className={`${BUTTON} self-end`}>Buscar</button>
      </form>
      <div className="flex flex-wrap gap-4">
        <label className="text-sm text-slate-700">Método
          <select value={modo} onChange={event => navigate(texto, event.target.value)} className="ml-2 rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm"><option value="text">Por texto</option><option value="semantic">Por significado · local</option></select>
        </label>
        <label className="text-sm text-slate-700">Capacidades
          <select value={scope} onChange={event => navigate(texto, modo, event.target.value)} className="ml-2 rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm"><option value="available">Visibles para mi cuenta</option><option value="mine">Propias</option><option value="community">Comunidad</option></select>
        </label>
      </div>
      <p className="text-xs text-slate-500">{modo === 'semantic' ? 'Las capacidades se ordenan por significado en tu equipo. Las personas se buscan por texto. Revisa contratos y disponibilidad antes de reutilizar una sugerencia.' : 'Coincidencias por nombre y descripción de capacidades, y por nombre, usuario o biografía de personas.'} La búsqueda de workflows se integrará cuando esté disponible.</p>
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {accionError && !detalle && <p role="alert" className="text-sm text-red-700">{accionError}</p>}
      {texto.trim().length < 2 && <p className="text-sm text-slate-500">Escribe al menos 2 caracteres y pulsa Buscar.</p>}
      {cargando && <p role="status" className="text-sm text-slate-500">{modo === 'semantic' ? 'Buscando por significado… La primera consulta puede tardar más.' : 'Buscando…'}</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setRevision(value => value + 1)} className={`${BUTTON} mt-3`}>Reintentar</button>{modo === 'semantic' && <button type="button" onClick={() => navigate(texto, 'text')} className={`${BUTTON} ml-2 mt-3`}>Usar búsqueda textual</button>}</div>}
      {res && <Resultados key={JSON.stringify([texto, modo, scope, revision])} initial={res} texto={texto} modo={modo} scope={scope} onPerfil={username => onCambiarSeccion?.(`perfil/${encodeURIComponent(username)}`)} onDetalle={item => { setDetalle(item); setAccionError(''); }} />}
      {detalle && <DetalleCapacidad capacidad={detalle} esDuenio={detalle.owner_id === usuario?.id} onCerrar={() => setDetalle(null)} onClonar={clone} clonando={cloning} accionError={accionError} />}
    </div>
  );
}

function Resultados({ initial, texto, modo, scope, onPerfil, onDetalle }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState('todo');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const controller = useRef(null);
  useEffect(() => { const active = new AbortController(); controller.current = active; return () => active.abort(); }, []);

  async function more(group) {
    if (busy || !data.cursores[group]) return;
    setBusy(group);
    setError('');
    try {
      const next = await buscarTodo(texto, 20, { modo, scope, signal: controller.current.signal,
        tipo: group === 'usuarios' ? 'profiles' : 'capabilities',
        profilesCursor: group === 'usuarios' ? data.cursores[group] : undefined,
        capabilitiesCursor: group === 'capacidades' ? data.cursores[group] : undefined,
      });
      if (!controller.current.signal.aborted) setData(previous => {
        const ids = new Set(previous[group].map(item => item.id));
        return { ...previous, [group]: [...previous[group], ...next[group].filter(item => !ids.has(item.id))], cursores: { ...previous.cursores, [group]: next.cursores[group] } };
      });
    } catch (cause) { if (!controller.current.signal.aborted) setError(cause.message); }
    finally { if (!controller.current.signal.aborted) setBusy(''); }
  }

  const show = group => tab === 'todo' || tab === group;
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2" aria-label="Tipos de resultado">
      {[['todo', 'Todo'], ['capacidades', 'Capacidades'], ['usuarios', 'Personas']].map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)} className={`${BUTTON} ${tab === id ? '!border-blue-600 !text-blue-700' : ''}`}>{label}</button>)}
    </div>
    {initial.semantic_truncated && <p role="status" className="text-sm text-amber-800">Se ordenaron por significado las primeras {initial.semantic_scanned} capacidades visibles. El catálogo es mayor; usa filtros o búsqueda textual para ampliarlo.</p>}
    {modo === 'semantic' && initial.semantic_scanned > 0 && !initial.semantic_truncated && <p className="text-xs text-slate-500">{initial.semantic_scanned} capacidades visibles comparadas localmente.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {show('capacidades') && <section aria-label="Capacidades encontradas">
      <h2 className="mb-3 font-bold text-slate-900">Capacidades · {data.capacidades.length}{data.cursores.capacidades ? '+' : ''}</h2>
      {!data.capacidades.length && <p className="text-sm text-slate-500">Sin capacidades para esta búsqueda.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{data.capacidades.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="break-words font-semibold text-slate-900">{item.name}</h3><p className="mt-2 break-words text-sm text-slate-600">{item.description}</p>
        <p className="mt-2 text-xs text-slate-500">{item.visibility === 'private' ? 'Privada' : 'Pública'} · {item.status === 'draft' ? 'Borrador' : 'Implementación por verificar'}</p>
        <button type="button" onClick={() => onDetalle(item)} className="mt-3 text-sm font-semibold text-blue-700 underline">Ver {item.name}</button>
      </article>)}</div>
      {data.cursores.capacidades && <button type="button" disabled={Boolean(busy)} onClick={() => more('capacidades')} className={`${BUTTON} mt-4`}>{busy === 'capacidades' ? 'Cargando…' : 'Más capacidades'}</button>}
    </section>}
    {show('usuarios') && <section aria-label="Personas encontradas">
      <h2 className="mb-3 font-bold text-slate-900">Personas · {data.usuarios.length}{data.cursores.usuarios ? '+' : ''}</h2>
      {!data.usuarios.length && <p className="text-sm text-slate-500">Sin personas para esta búsqueda.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{data.usuarios.map(person => <article key={person.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="break-words font-semibold text-slate-900">{person.display_name}</h3><p className="break-all text-sm text-slate-500">@{person.username}</p>
        {person.bio && <p className="mt-2 break-words text-sm text-slate-600">{person.bio}</p>}
        <button type="button" onClick={() => onPerfil(person.username)} className="mt-3 text-sm font-semibold text-blue-700 underline">Ver perfil de {person.display_name}</button>
      </article>)}</div>
      {data.cursores.usuarios && <button type="button" disabled={Boolean(busy)} onClick={() => more('usuarios')} className={`${BUTTON} mt-4`}>{busy === 'usuarios' ? 'Cargando…' : 'Más personas'}</button>}
    </section>}
  </div>;
}
