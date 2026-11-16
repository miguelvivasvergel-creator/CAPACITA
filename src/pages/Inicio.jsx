import { useEffect, useRef, useState } from 'react';
import { listarCapacidades, clonarCapacidad } from '../services/capacidades';
import InterpretarObjetivo from '../components/capabilities/InterpretarObjetivo';
import DefinirCapacidad from '../components/capabilities/DefinirCapacidad';
import DetalleCapacidad from '../components/capabilities/DetalleCapacidad';
import ResumenTrabajo from '../components/profile/ResumenTrabajo';
import PlanificarObjetivo from '../components/capabilities/PlanificarObjetivo';

const EMPTY_PAGE = { items: [], next_cursor: null };
const BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function Inicio({ usuario, onCambiarSeccion }) {
  const [modo, setModo] = useState('objetivo');
  const [consulta, setConsulta] = useState('');
  const [search, setSearch] = useState({ q: '', scope: 'available', revision: 0 });
  const [page, setPage] = useState(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [propuesta, setPropuesta] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const request = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    listarCapacidades(search.scope, { q: search.q, signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setPage(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search]);

  function changeSearch(changes = {}) {
    request.current?.abort();
    setLoading(true);
    setLoadingMore(false);
    setError('');
    setPage(EMPTY_PAGE);
    setSearch((previous) => ({ ...previous, ...changes, revision: previous.revision + 1 }));
  }

  const refresh = () => changeSearch();

  async function loadMore() {
    if (!page.next_cursor || loading || loadingMore) return;
    const controller = request.current;
    setLoadingMore(true);
    setError('');
    try {
      const next = await listarCapacidades(search.scope, { q: search.q, cursor: page.next_cursor, signal: controller.signal });
      if (!controller.signal.aborted) setPage((previous) => {
        const ids = new Set(previous.items.map((item) => item.id));
        return { items: [...previous.items, ...next.items.filter((item) => !ids.has(item.id))], next_cursor: next.next_cursor };
      });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause.message);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  async function clone(item) {
    if (cloning) return;
    setCloning(true);
    setCloneError('');
    try {
      const saved = await clonarCapacidad(item.id);
      setNotice(`“${saved.name}” guardada en Mis capacidades como borrador privado.`);
      setDetalle(null);
      refresh();
    } catch (cause) { setCloneError(cause.message); }
    finally { setCloning(false); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-sm text-slate-500">Hola, {usuario?.name || 'Creador'}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">¿Qué quieres resolver hoy?</h1>
        <p className="mt-4 text-base text-slate-600">Encuentra capacidades y define las herramientas que te faltan para avanzar en tu trabajo.</p>
      </header>
      <div className="mx-auto mt-8 max-w-4xl">
        <div className="mb-5 flex flex-wrap justify-center gap-2" aria-label="Cómo empezar">
          {[['objetivo', 'Describir un objetivo'], ['planificar', 'Planificar un proceso'], ['buscar', 'Buscar capacidades']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={modo === value} onClick={() => setModo(value)} className={`${BUTTON} ${modo === value ? '!border-blue-600 !bg-blue-600 !text-white' : ''}`}>{label}</button>
          ))}
        </div>
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {cloneError && !detalle && <p role="alert" className="mb-4 text-sm text-red-700">{cloneError}</p>}
        <div hidden={modo !== 'objetivo'}>
          <InterpretarObjetivo disabled={cloning} onClonar={clone} onPropuesta={(definition) => {
            setPropuesta({ id: crypto.randomUUID(), definition });
            setNotice('Propuesta cargada. Revisa el formulario y comprueba la definición antes de guardarla.');
          }} />
          {propuesta && <DefinirCapacidad key={propuesta.id} initialDefinition={propuesta.definition} mostrarInterprete={false} onGuardado={(saved) => {
            setNotice(`“${saved.name}” guardada como borrador privado. Su implementación y pruebas siguen pendientes.`);
            setPropuesta(null);
            refresh();
          }} />}
        </div>
        {modo === 'planificar' && <PlanificarObjetivo onCambiarSeccion={onCambiarSeccion} />}
        <form hidden={modo !== 'buscar'} onSubmit={(event) => {
          event.preventDefault();
          changeSearch({ q: consulta.trim() });
        }} className="rounded-2xl border border-slate-200 bg-white p-5">
          <label htmlFor="inicio-busqueda" className="text-sm font-semibold text-slate-800">Buscar en el catálogo autorizado</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="inicio-busqueda" maxLength={200} value={consulta} onChange={(event) => setConsulta(event.target.value)} placeholder="Nombre o descripción de la capacidad" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white">Buscar</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Búsqueda textual por nombre y descripción.</p>
        </form>
      </div>
      <ResumenTrabajo key={usuario?.id} onCambiarSeccion={onCambiarSeccion} />
      <section aria-label="Capacidades del catálogo" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{search.q ? `Resultados para “${search.q}”` : 'Explora capacidades'}</h2>
            {!loading && !error && <p className="mt-1 text-sm text-slate-500">{page.items.length}{page.next_cursor ? '+' : ''} resultados cargados</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">Mostrar
            <select value={search.scope} onChange={(event) => changeSearch({ scope: event.target.value })} className="rounded-xl border border-slate-300 py-2 pl-3 pr-8 text-sm">
              <option value="available">Visibles para mi cuenta</option><option value="mine">Mis capacidades</option><option value="community">Comunidad</option>
            </select>
          </label>
        </div>
        {loading && <p role="status" className="py-8 text-sm text-slate-600">Cargando catálogo…</p>}
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-4">
          <p className="text-sm text-red-700">No se pudo cargar el catálogo: {error}</p><button type="button" onClick={refresh} className={`${BUTTON} mt-3`}>Reintentar</button>
        </div>}
        {!loading && !error && !page.items.length && <p className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay capacidades para esta búsqueda. Puedes describir tu objetivo o cambiar los filtros.</p>}
        {!loading && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs text-slate-500">{item.visibility === 'private' ? 'Privada' : 'Pública'} · {item.status === 'draft' ? 'Borrador' : 'Implementación por verificar'}</p>
            <h3 className="mt-2 break-words text-base font-bold text-slate-900">{item.name}</h3>
            <p className="mt-2 break-words text-sm text-slate-600">{item.description}</p>
            <p className="mt-3 text-xs text-slate-500">{item.input_type} → {item.output_type}</p>
            <button type="button" onClick={() => { setDetalle(item); setCloneError(''); }} className="mt-4 text-sm font-semibold text-blue-700 underline">Ver {item.name}</button>
          </article>)}
        </div>}
        {!loading && page.next_cursor && <button type="button" onClick={loadMore} disabled={loadingMore} className={`${BUTTON} mt-5`}>{loadingMore ? 'Cargando más…' : 'Cargar más capacidades'}</button>}
        <button type="button" onClick={() => onCambiarSeccion?.('capacidades')} className="mt-5 block text-sm font-semibold text-blue-700 underline">Ir a Mis capacidades y crear manualmente</button>
      </section>
      {detalle && <DetalleCapacidad capacidad={detalle} esDuenio={detalle.owner_id === usuario?.id} onCerrar={() => setDetalle(null)} onClonar={() => clone(detalle)} clonando={cloning} accionError={cloneError} />}
    </div>
  );
}
