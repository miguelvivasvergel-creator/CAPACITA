import { useEffect, useRef, useState } from 'react';
import { listarCapacidades, clonarCapacidad } from '../services/capacidades';
import DetalleCapacidad from '../components/capabilities/DetalleCapacidad';

const EMPTY = { items: [], next_cursor: null };
const BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function Comunidad({ _usuario, onCambiarSeccion }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState({ q: '', revision: 0 });
  const [page, setPage] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    listarCapacidades('community', { q: search.q, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setPage(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search]);

  function refresh(q = search.q) {
    request.current?.abort();
    setPage(EMPTY);
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setSearch((previous) => ({ q, revision: previous.revision + 1 }));
  }

  async function loadMore() {
    if (loading || loadingMore || !page.next_cursor) return;
    const controller = request.current;
    setLoadingMore(true);
    setError('');
    try {
      const next = await listarCapacidades('community', { q: search.q, cursor: page.next_cursor, signal: controller.signal });
      if (!controller.signal.aborted) setPage((previous) => {
        const ids = new Set(previous.items.map((item) => item.id));
        return { items: [...previous.items, ...next.items.filter((item) => !ids.has(item.id))], next_cursor: next.next_cursor };
      });
    } catch (cause) { if (!controller.signal.aborted) setError(cause.message); }
    finally { if (!controller.signal.aborted) setLoadingMore(false); }
  }

  async function clone(item) {
    if (cloning) return;
    setCloning(true);
    setCloneError('');
    setNotice('');
    try {
      const saved = await clonarCapacidad(item.id);
      setNotice(`“${saved.name}” guardada como borrador privado en Mis capacidades.`);
      setDetail(null);
    } catch (cause) { setCloneError(cause.message); }
    finally { setCloning(false); }
  }

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
    <h1 className="text-3xl font-extrabold text-slate-900">Comunidad</h1>
    <p className="mt-2 text-sm text-slate-600">Explora capacidades públicas y guarda una copia privada para trabajar con ella. La ejecución depende de una versión habilitada.</p>
    <form onSubmit={(event) => { event.preventDefault(); refresh(query.trim()); }} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <label htmlFor="comunidad-buscar" className="text-sm font-semibold text-slate-800">Buscar capacidades públicas</label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input id="comunidad-buscar" value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2" placeholder="Nombre o descripción" />
        <button type="submit" className={BUTTON}>Buscar en comunidad</button>
      </div>
    </form>
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {cloneError && !detail && <p role="alert" className="mt-4 text-sm text-red-700">{cloneError}</p>}
    {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4"><p className="text-sm text-red-700">No se pudo cargar la comunidad: {error}</p><button type="button" onClick={() => refresh()} className={`${BUTTON} mt-3`}>Reintentar</button></div>}
    {loading && <p role="status" className="mt-6 text-sm text-slate-600">Cargando comunidad…</p>}
    {!loading && !error && !page.items.length && <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">No hay capacidades públicas para esta búsqueda.</p>}
    {!loading && !!page.items.length && <p className="mt-6 text-sm text-slate-500">{page.items.length}{page.next_cursor ? '+' : ''} capacidades cargadas</p>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {page.items.map((item) => <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs text-slate-500">Capacidad pública · {item.category}</p>
        <h2 className="mt-2 break-words text-lg font-bold text-slate-900">{item.name}</h2>
        <p className="mt-2 break-words text-sm text-slate-600">{item.description}</p>
        <p className="mt-3 text-xs text-slate-500">{item.input_type} → {item.output_type}</p>
        {item.owner_username && <button type="button" onClick={() => onCambiarSeccion?.(`perfil/${encodeURIComponent(item.owner_username)}`)} className="mt-3 self-start break-all text-sm font-semibold text-blue-700 underline">@{item.owner_username}</button>}
        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          <button type="button" onClick={() => { setDetail(item); setCloneError(''); }} className={BUTTON}>Ver {item.name}</button>
          <button type="button" disabled={cloning} onClick={() => clone(item)} className={BUTTON}>{cloning ? 'Guardando copia…' : `Clonar ${item.name}`}</button>
        </div>
      </article>)}
    </div>
    {!loading && page.next_cursor && <button type="button" disabled={loadingMore} onClick={loadMore} className={`${BUTTON} mt-5`}>{loadingMore ? 'Cargando más…' : 'Cargar más capacidades públicas'}</button>}
    {detail && <DetalleCapacidad capacidad={detail} esDuenio={detail.owner_id === _usuario?.id} onCerrar={() => setDetail(null)} onClonar={() => clone(detail)} onUsar={() => onCambiarSeccion?.(`ejecutar/capability/${detail.id}`)} clonando={cloning} accionError={cloneError} />}
  </div>;
}
