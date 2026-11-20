import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import MiniCadena from '../components/common/MiniCadena';
import { useEffect, useRef, useState } from 'react';
import { listarCapacidades, clonarCapacidad } from '../services/capacidades';
import DetalleCapacidad from '../components/capabilities/DetalleCapacidad';
import { estadoHerramientas } from '../components/taller/solucionDirecta';

const EMPTY = { items: [], next_cursor: null };
const CATEGORIAS = { educacion: 'Educación', idiomas: 'Idiomas', salud: 'Salud', ciencia: 'Ciencia', lugares: 'Lugares',
  economia: 'Economía', datos: 'Datos', cultura: 'Cultura', imagenes: 'Imágenes', deportes: 'Deportes', noticias: 'Noticias',
  comida: 'Comida', comunicacion: 'Comunicación', texto: 'Texto', documentos: 'Documentos' };
// Conectores revisados por el equipo (sello en config.connector) frente a lo que comparten las personas.
const esOficial = (item) => Boolean(item.config?.connector);
const ORIGENES = [['todo', 'Todo'], ['personas', 'Compartidas por personas'], ['oficiales', 'Oficiales de Capacita']];
const COMO_FUNCIONA = [
  ['comunidad', 'Alguien la comparte', 'Con licencia abierta y una versión probada'],
  ['buscar', 'Tú la encuentras', 'Aquí o cuando el chat busca lo que necesitas'],
  ['candado', 'La usas con tus datos', 'Lo que subes solo lo ves tú'],
];
const BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function Comunidad({ _usuario, onCambiarSeccion, experiencia = 'desarrollador' }) {
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
  const [origen, setOrigen] = useState('todo');
  const request = useRef(null);
  // Guiado: qué herramientas públicas tienen una versión que se puede ejecutar (las demás son
  // solo una descripción). undefined mientras se consulta.
  const [ejecutables, setEjecutables] = useState(undefined);
  useEffect(() => {
    if (experiencia !== 'guiado') return undefined;
    let vivo = true;
    estadoHerramientas().then((estados) => { if (vivo) setEjecutables(new Set(estados.keys())); }).catch(() => { if (vivo) setEjecutables(null); });
    return () => { vivo = false; };
  }, [experiencia]);

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

  // Guiado: lo útil es usarla. Clonar copia solo la descripción (sin código probado) y deja una
  // herramienta «sin terminar», así que esa acción queda para el modo desarrollador.
  const guiado = experiencia === 'guiado';
  // Sin versión ejecutable no hay nada que usar: el chat recibe el pedido escrito para crear una
  // así (sin saber todavía, se intenta abrir y el chat avisa si no está lista).
  const ejecutable = (item) => !ejecutables || ejecutables.has(item.id);
  const usar = (item) => onCambiarSeccion?.(!guiado ? `ejecutar/capability/${item.id}`
    : ejecutable(item) ? `inicio/herramienta/${item.id}`
      : `inicio/usar/${encodeURIComponent(`Quiero una herramienta como «${item.name}» de la comunidad: ${item.description || ''}`.slice(0, 1500))}`);
  return <div className="vista-contenedor vista-secundaria">
    <EncabezadoVista icono="comunidad" etiqueta="Descubre posibilidades" titulo="Comunidad" descripcion={guiado
      ? 'Herramientas que otras personas compartieron. Úsalas en el chat con tus datos: lo que subas solo lo ves tú.'
      : 'Explora capacidades públicas y guarda una copia privada para trabajar con ella. La ejecución depende de una versión habilitada.'}/>
    {guiado && <section className="comunidad-como" aria-label="Cómo funciona la comunidad">
      <ol className="compartir-recorrido">{COMO_FUNCIONA.map(([icono, titulo, ayuda]) => <li key={titulo} className="is-activo">
        <span className="compartir-nodo"><Icono nombre={icono} className="h-3.5 w-3.5" /></span><strong>{titulo}</strong><span>{ayuda}</span>
      </li>)}</ol>
      <p className="comunidad-como-pie">¿Quieres compartir una tuya? En <button type="button" onClick={() => onCambiarSeccion?.('capacidades')}>Mi biblioteca</button> toca «Compartir con la comunidad» en cualquier herramienta probada.</p>
    </section>}
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
    {!loading && !!page.items.length && <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      {guiado && <div className="biblioteca-filtros" role="group" aria-label="Filtrar por origen">{ORIGENES.map(([valor, texto]) =>
        <button key={valor} type="button" aria-pressed={origen === valor} onClick={() => setOrigen(valor)}>{texto}</button>)}</div>}
      <p className="text-sm text-slate-500">{page.items.length}{page.next_cursor ? '+' : ''} {guiado ? 'herramientas cargadas' : 'capacidades cargadas'}</p>
    </div>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {page.items.filter((item) => origen === 'todo' || (origen === 'oficiales') === esOficial(item)).map((item) => <article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        {guiado ? <div className="flex items-center justify-between gap-2">
          <span className="comunidad-icono"><MiniCadena pasos={1} /></span>
          <span className={`comunidad-origen ${esOficial(item) ? 'is-oficial' : ''}`}>{esOficial(item) ? `Oficial · ${item.config.connector.provider || 'Capacita'}` : 'De la comunidad'}</span>
        </div> : <p className="text-xs text-slate-500">Capacidad pública · {item.category}</p>}
        {guiado && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORIAS[item.category] || item.category}</p>}
        <h2 className="mt-2 break-words text-lg font-bold text-slate-900">{item.name}</h2>
        <p className="mt-2 break-words text-sm text-slate-600">{item.description}</p>
        {!guiado && <p className="mt-3 text-xs text-slate-500">{item.input_type} → {item.output_type}</p>}
        {item.owner_username && !(guiado && esOficial(item)) && <button type="button" onClick={() => onCambiarSeccion?.(`perfil/${encodeURIComponent(item.owner_username)}`)} className="mt-3 self-start break-all text-sm font-semibold text-blue-700 underline">@{item.owner_username}</button>}
        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          {guiado && <button type="button" onClick={() => usar(item)} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" aria-label={ejecutable(item) ? `Usar ${item.name} en el chat` : `Pedir una herramienta como ${item.name} en el chat`}>{ejecutable(item) ? 'Usar en el chat' : 'Pedir una así en el chat'}</button>}
          {guiado && !ejecutable(item) && <p className="basis-full text-xs text-slate-500">Su autor compartió la idea, pero no una versión probada para usar.</p>}
          <button type="button" onClick={() => { setDetail(item); setCloneError(''); }} className={BUTTON}>{guiado ? 'Ver detalles' : `Ver ${item.name}`}</button>
          {!guiado && <button type="button" disabled={cloning} onClick={() => clone(item)} className={BUTTON}>{cloning ? 'Guardando copia…' : `Clonar ${item.name}`}</button>}
        </div>
      </article>)}
    </div>
    {!loading && page.next_cursor && <button type="button" disabled={loadingMore} onClick={loadMore} className={`${BUTTON} mt-5`}>{loadingMore ? 'Cargando más…' : 'Cargar más capacidades públicas'}</button>}
    {detail && <DetalleCapacidad capacidad={detail} experiencia={experiencia} esDuenio={detail.owner_id === _usuario?.id} onCerrar={() => setDetail(null)} onClonar={guiado ? undefined : () => clone(detail)} onUsar={() => usar(detail)} clonando={cloning} accionError={cloneError} />}
  </div>;
}
