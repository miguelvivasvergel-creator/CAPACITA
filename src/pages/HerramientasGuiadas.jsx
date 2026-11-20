import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import MiniCadena from '../components/common/MiniCadena';
import { useEffect, useState } from 'react';
import { listarCapacidades } from '../services/capacidades';
import { estadoHerramientas, mapaVersiones } from '../components/taller/solucionDirecta';
import CompartirHerramienta from '../components/taller/CompartirHerramienta';

const ORDEN = { lista: 0, probada: 1 };
const ETIQUETA = { lista: 'Lista · Usar ahora', probada: 'Probada, sin tu visto bueno · Usar ahora', sin: 'Sin terminar · Crearla otra vez en el chat' };

/**
 * Una entrada por nombre: las «versiones mejoradas» conservan el nombre de la original, así
 * que se agrupan y se abre la mejor (lista > probada; luego la más reciente). Las demás quedan
 * a la vista en «Ver las N versiones» por si dos herramientas distintas se llaman igual.
 */
function agrupar(items, estados) {
  const grupos = new Map();
  for (const row of items) {
    const clave = row.name.trim().toLowerCase();
    grupos.set(clave, [...(grupos.get(clave) || []), row]);
  }
  const estadoDe = (row) => estados?.get(row.id) || 'sin';
  return [...grupos.values()].map((filas) => {
    const ordenadas = [...filas].sort((a, b) => (ORDEN[estadoDe(a)] ?? 2) - (ORDEN[estadoDe(b)] ?? 2)
      || String(b.created_at || '').localeCompare(String(a.created_at || '')));
    const reciente = filas.reduce((max, row) => (String(row.created_at || '') > max ? String(row.created_at || '') : max), '');
    return { row: ordenadas[0], estado: estadoDe(ordenadas[0]), reciente, filas: ordenadas.map((row) => ({ row, estado: estadoDe(row) })) };
  // La API lista por id: se muestran primero las creadas (o mejoradas) más recientemente.
  }).sort((a, b) => b.reciente.localeCompare(a.reciente));
}

const fecha = (valor) => {
  const dia = valor ? new Date(valor) : null;
  return dia && !Number.isNaN(dia.getTime()) ? dia.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

// incrustada: sección de «Mi biblioteca» (sin encabezado ni botón propios). onPropias recibe los
// ids de tus herramientas cargadas, para que la biblioteca no las repita como soluciones de 1 paso.
export default function HerramientasGuiadas({ onCambiarSeccion, incrustada = false, onPropias }) {
  const [page, setPage] = useState({ items: [], next_cursor: null }), [error, setError] = useState(''), [busy, setBusy] = useState(true), [revision, setRevision] = useState(0);
  // undefined mientras se consulta; null si no se pudo saber (se abren igual: el chat avisa).
  const [estados, setEstados] = useState(undefined);
  useEffect(() => {
    const controller = new AbortController();
    listarCapacidades('mine', { signal: controller.signal }).then((next) => { if (!controller.signal.aborted) setPage(next); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    let vivo = true;
    estadoHerramientas().then((next) => { if (vivo) setEstados(next); }).catch(() => { if (vivo) setEstados(null); });
    return () => { vivo = false; };
  }, [revision]);
  // Versión probada de cada herramienta: es la que se publica al compartirla con la comunidad.
  const [versionDe, setVersionDe] = useState(null);
  useEffect(() => {
    let vivo = true;
    mapaVersiones().then((mapas) => { if (vivo) setVersionDe(mapas.versionDe); }).catch(() => { if (vivo) setVersionDe(new Map()); });
    return () => { vivo = false; };
  }, [revision]);
  useEffect(() => {
    if (!busy && !error) onPropias?.(new Set(page.items.map((row) => row.id)));
  }, [busy, error, page.items, onPropias]);
  async function more() {
    if (busy || !page.next_cursor) return;
    setBusy(true); setError('');
    try {
      const next = await listarCapacidades('mine', { cursor: page.next_cursor });
      setPage((old) => ({ ...next, items: [...old.items, ...next.items.filter((row) => !old.items.some((item) => item.id === row.id))] }));
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  // La lista aparece en cuanto llegan las herramientas; las etiquetas, cuando se sabe su estado.
  const comprobando = estados === undefined, desconocido = comprobando || estados === null;
  const grupos = agrupar(page.items, desconocido ? null : estados);
  // Sin saber el estado no se esconde nada en «Sin terminar»: el chat avisa si no está lista.
  const usables = desconocido ? grupos : grupos.filter((grupo) => grupo.estado !== 'sin');
  const sinTerminar = desconocido ? [] : grupos.filter((grupo) => grupo.estado === 'sin');
  const etiqueta = (estado) => (comprobando ? 'Comprobando si está lista…' : estados === null ? 'Abrir en el chat' : ETIQUETA[estado]);
  // Usable: directa en el chat, sin IA. Sin terminar (no superó sus pruebas): el chat deja
  // escrito el pedido para crearla otra vez con la IA.
  const abrir = (row, estado) => onCambiarSeccion?.(desconocido || estado !== 'sin' ? `inicio/herramienta/${row.id}`
    : `inicio/usar/${encodeURIComponent(`Quiero usar mi herramienta «${row.name}»: ${row.description}`.slice(0, 1500))}`);
  const ficha = (row) => <button type="button" className="ml-2 mt-1 min-h-11 text-sm text-slate-600 underline" onClick={() => onCambiarSeccion?.(`ejecutar/capability/${row.id}`)}>Ficha técnica</button>;
  const item = (grupo) => <li key={grupo.row.id}>
    <button type="button" className="guiado-item" onClick={() => abrir(grupo.row, grupo.estado)}><span className="guiado-item-icono"><MiniCadena pasos={1} /></span><span className="guiado-item-copy"><strong>{grupo.row.name}</strong><span>{grupo.row.description}</span>
      <span>Simple · {etiqueta(grupo.estado)}{grupo.filas.length > 1 ? ` · abro la mejor de ${grupo.filas.length} versiones` : ''}</span></span><Icono nombre="flecha" className="guiado-item-flecha" /></button>
    {ficha(grupo.row)}
    {/* Solo una herramienta probada se puede compartir: los demás la usarán tal como pasó sus pruebas. */}
    {grupo.estado !== 'sin' && versionDe?.get(grupo.row.id) && <div className="ml-2"><CompartirHerramienta capacidad={grupo.row}
      version={{ id: versionDe.get(grupo.row.id), capability_id: grupo.row.id }} /></div>}
    {grupo.filas.length > 1 && <details className="ml-2 mt-1 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 text-slate-600">Ver las {grupo.filas.length} versiones</summary>
      <ul className="space-y-2 pb-2">{grupo.filas.map(({ row, estado }) => <li key={row.id} className="rounded-lg border border-slate-200 bg-white p-2">
        <p className="font-semibold text-slate-800">{fecha(row.created_at) ? `Creada el ${fecha(row.created_at)}` : row.name}{row.id === grupo.row.id ? ' · la que abro' : ''}</p>
        <p className="break-words text-xs text-slate-600">{row.description}</p>
        <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-blue-700 underline" onClick={() => abrir(row, estado)}>{etiqueta(estado)}</button>
        {ficha(row)}
      </li>)}</ul>
    </details>}
  </li>;

  return <div className={incrustada ? 'space-y-4' : 'vista-contenedor guiado-pagina space-y-5'}>
    {!incrustada && <><EncabezadoVista icono="herramientas" titulo="Mis herramientas" descripcion="Las herramientas que creaste en el chat. Toca una lista para usarla con tus datos, sin esperar a la IA." /><button type="button" className="vista-boton-primario" onClick={() => onCambiarSeccion?.('inicio')}>Crear una herramienta nueva</button></>}
    {busy && !page.items.length && !error && <p role="status">Cargando herramientas…</p>}
    {error && <div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={() => { setError(''); setBusy(true); setEstados(undefined); setRevision((old) => old + 1); }}>Volver a consultar</button></div>}
    {!busy && !error && !page.items.length && <p className="guiado-vacio">Todavía no tienes herramientas simples. Cuéntale al chat qué necesitas y la creamos juntos.</p>}
    {!busy && !error && page.items.length > 0 && !usables.length && <p className="guiado-vacio">Ninguna está lista todavía. Pídele al chat la que necesitas y la creamos y probamos juntos.</p>}
    <ul className="guiado-lista">{usables.map(item)}</ul>
    {sinTerminar.length > 0 && <details className="rounded-xl border border-slate-200 bg-white p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700">Sin terminar ({sinTerminar.length})</summary>
      <p className="mb-3 text-xs text-slate-500">Intentos que no superaron sus pruebas o que descartaste. No se pueden usar; tócalos para crearlos otra vez en el chat.</p>
      <ul className="guiado-lista">{sinTerminar.map(item)}</ul>
    </details>}
    {page.next_cursor && <button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más herramientas</button>}
  </div>;
}
