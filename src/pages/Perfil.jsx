import { useState, useEffect } from 'react';
import PerfilEncabezado from '../components/profile/PerfilEncabezado';
import PerfilTarjetas from '../components/profile/PerfilTarjetas';
import EditarPerfilModal from '../components/profile/EditarPerfilModal';
import { ListaCapacidades, EstadoVacio } from '../components/profile/PerfilListas';
import { cargarPerfil, listarCapacidadesPerfil } from '../services/perfil';
import HistorialPropio from '../components/profile/HistorialPropio';
import ResumenTrabajo from '../components/profile/ResumenTrabajo';

const PESTANAS = [{ id: 'capacidades', label: 'Capacidades' }, { id: 'workflows', label: 'Workflows' }, { id: 'actividad', label: 'Actividad' }];

export default function Perfil({ usuario, username, onConfigurar, onPerfilActualizado, onCambiarSeccion }) {
  const [datos, setDatos] = useState(undefined);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [pestana, setPestana] = useState('capacidades');
  const [editando, setEditando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const userId = usuario?.id;
  const userUsername = usuario?.username;

  useEffect(() => {
    const controller = new AbortController();
    cargarPerfil(username, { id: userId, username: userUsername }, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setDatos(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [username, userId, userUsername, revision]);

  function retry() {
    setDatos(undefined);
    setError('');
    setRevision(value => value + 1);
  }

  async function loadMore() {
    if (!datos?.next_cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const next = await listarCapacidadesPerfil(datos.perfil.username, { cursor: datos.next_cursor });
      setDatos(previous => {
        const ids = new Set(previous.perfil.capabilities.map(item => item.id));
        const capabilities = [...previous.perfil.capabilities, ...next.items.filter(item => !ids.has(item.id))];
        return { ...previous, next_cursor: next.next_cursor, capacidadesError: '', perfil: {
          ...previous.perfil, capabilities, stats: { ...previous.perfil.stats, public_capabilities: next.next_cursor ? null : capabilities.length },
        } };
      });
    } catch (cause) { setDatos(previous => ({ ...previous, capacidadesError: cause.message })); }
    finally { setCargandoMas(false); }
  }

  if (error) return <div role="alert" className="mx-auto max-w-5xl p-8"><p className="text-sm text-red-700">No se pudo cargar el perfil: {error}</p><button onClick={retry} className="mt-4 rounded-xl border px-4 py-2 text-sm">Reintentar</button></div>;
  if (datos === undefined) return <p role="status" className="mx-auto max-w-5xl p-8 text-sm text-slate-600">Cargando perfil…</p>;
  if (datos === null) return <div className="mx-auto max-w-5xl p-8"><EstadoVacio icono="🔍" titulo="Perfil no encontrado" texto={`No encontramos el perfil @${username}.`} /></div>;

  const { perfil } = datos;
  const esPropio = perfil.id === userId;
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PerfilEncabezado perfil={perfil} esPropio={esPropio} onEditar={() => setEditando(true)} onConfigurar={onConfigurar} />
      <PerfilTarjetas stats={perfil.stats} />
      {esPropio && <ResumenTrabajo key={userId} onCambiarSeccion={onCambiarSeccion} />}
      <p className="text-xs text-slate-500">El perfil muestra capacidades públicas. Las métricas sin datos integrados aparecen como —.</p>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200/60 bg-slate-100/90 p-1" aria-label="Secciones del perfil">
        {PESTANAS.map(({ id, label }) => <button key={id} type="button" aria-pressed={pestana === id} onClick={() => setPestana(id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${pestana === id ? 'bg-white font-semibold text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
          {label}{id === 'capacidades' && <span className="ml-2 text-xs">{datos.capacidadesError ? '—' : `${perfil.capabilities.length}${datos.next_cursor ? '+' : ''}`}</span>}
        </button>)}
      </div>
      {pestana === 'capacidades' && <>
        {datos.capacidadesError && <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700"><p>No se pudieron cargar las capacidades: {datos.capacidadesError}</p><button onClick={retry} className="mt-3 rounded-lg border px-3 py-1 text-slate-700">Reintentar</button></div>}
        {!datos.capacidadesError && <ListaCapacidades capacidades={perfil.capabilities} />}
        {datos.next_cursor && <button onClick={loadMore} disabled={cargandoMas} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">{cargandoMas ? 'Cargando…' : 'Cargar más capacidades públicas'}</button>}
      </>}
      {pestana === 'workflows' && (esPropio ? <HistorialPropio key={`${userId}:workflows`} kind="workflows" onCambiarSeccion={onCambiarSeccion} /> : <EstadoVacio icono="🔗" titulo="Workflows públicos pendientes de integración" texto="Los workflows privados de esta persona no se publican en su perfil." />)}
      {pestana === 'actividad' && (esPropio ? <HistorialPropio key={`${userId}:runs`} kind="runs" /> : <EstadoVacio icono="📋" titulo="Actividad privada" texto="Las entradas, salidas y archivos de las ejecuciones solo los ve quien ejecutó." />)}
      {editando && esPropio && <EditarPerfilModal perfil={perfil} onCerrar={() => setEditando(false)} onGuardado={updated => {
        setDatos(previous => ({ ...previous, perfil: { ...previous.perfil, ...updated, stats: previous.perfil.stats } }));
        setEditando(false);
        onPerfilActualizado?.(updated);
      }} />}
    </div>
  );
}
