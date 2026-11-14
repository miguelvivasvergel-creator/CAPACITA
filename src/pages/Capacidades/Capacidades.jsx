import { useEffect, useState } from 'react';
import CapacidadesLayout from '../../components/capabilities/CapacidadesLayout';
import MisCapacidades from '../../components/capabilities/MisCapacidades';
import DefinirCapacidad from '../../components/capabilities/DefinirCapacidad';
import { listarCapacidades, clonarCapacidad } from '../../services/capacidades';

const EMPTY_PAGE = { items: [], next_cursor: null };

function totalCargado(page, loaded) {
  if (!loaded) return '—';
  return `${page.items.length}${page.next_cursor ? '+' : ''}`;
}

export default function Capacidades() {
  const [seccion, setSeccion] = useState('mis');
  const [pages, setPages] = useState({ mine: EMPTY_PAGE, community: EMPTY_PAGE });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listarCapacidades('mine', { signal: controller.signal }),
      listarCapacidades('community', { signal: controller.signal }),
    ]).then(([mine, community]) => {
      if (controller.signal.aborted) return;
      setPages({ mine, community });
      setError('');
      setLoaded(true);
    }).catch((cause) => {
      if (!controller.signal.aborted) {
        setError(cause.message);
        setLoaded(true);
      }
    });
    return () => controller.abort();
  }, [revision]);

  const retry = () => {
    setLoaded(false);
    setError('');
    setRevision((value) => value + 1);
  };

  const scope = seccion === 'comunidad' ? 'community' : 'mine';
  const page = pages[scope];

  const loadMore = async () => {
    if (!page.next_cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await listarCapacidades(scope, { cursor: page.next_cursor });
      setPages((previous) => {
        const ids = new Set(previous[scope].items.map((item) => item.id));
        return { ...previous, [scope]: {
          items: [...previous[scope].items, ...next.items.filter((item) => !ids.has(item.id))],
          next_cursor: next.next_cursor,
        } };
      });
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const clone = async (capacidad) => {
    await clonarCapacidad(capacidad.id);
    setSeccion('mis');
    retry();
  };

  return (
    <CapacidadesLayout
      seccion={seccion}
      onCambiarSeccion={setSeccion}
      totalMis={totalCargado(pages.mine, loaded && !error)}
      totalComunidad={totalCargado(pages.community, loaded && !error)}
      onNuevaCapacidad={() => setSeccion('crear')}
    >
      {aviso && <p role="status" className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{aviso}</p>}
      {seccion === 'crear' ? (
        <>
          <DefinirCapacidad onGuardado={(capacidad) => {
            setAviso(`“${capacidad.name}” guardada como borrador privado. Su implementación y pruebas siguen pendientes.`);
            setSeccion('mis');
            retry();
          }} />
        </>
      ) : error ? (
        <div role="alert" className="my-6 rounded-2xl border border-red-200 bg-white p-6">
          <p className="text-sm text-red-700">No se pudo cargar el catálogo: {error}</p>
          <button type="button" onClick={retry} className="mt-3 rounded-xl border px-4 py-2 text-sm focus-visible:outline-blue-600">Reintentar</button>
        </div>
      ) : !loaded ? (
        <p role="status" className="py-8 text-sm text-slate-600">Cargando catálogo…</p>
      ) : (
        <MisCapacidades
          key={scope}
          capacidades={page.items}
          esMisCapacidades={scope === 'mine'}
          onCrearClick={() => setSeccion('crear')}
          onClonar={clone}
          onCargarMas={page.next_cursor ? loadMore : undefined}
          cargandoMas={loadingMore}
        />
      )}
    </CapacidadesLayout>
  );
}
