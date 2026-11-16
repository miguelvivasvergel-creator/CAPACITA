import { useEffect, useState } from 'react';
import { obtenerCapacidad } from '../services/capacidades';
import CandidatosCapacidad from '../components/capabilities/CandidatosCapacidad';

// Integración A: reutiliza el laboratorio y uso de versiones B3/B4 existentes.
export default function TrabajoCapacidad({ id, usuario, onCambiarSeccion }) {
  const [capacidad, setCapacidad] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    obtenerCapacidad(id, { signal: controller.signal })
      .then((row) => { if (!controller.signal.aborted) setCapacidad(row); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [id, revision]);
  const propia = capacidad?.owner_id === usuario?.id;
  const completa = propia && capacidad.visibility === 'private' && capacidad.status === 'draft' && capacidad.config?.definition;
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
    <button type="button" onClick={() => onCambiarSeccion?.('capacidades')} className="text-sm font-semibold text-blue-700 underline">Volver a capacidades</button>
    {error ? <div role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => { setCapacidad(null); setError(''); setRevision((value) => value + 1); }} className="mt-3 rounded-lg border px-3 py-2">Reintentar</button></div>
      : !capacidad ? <p role="status">Cargando capacidad…</p> : <>
        <header><h1 className="break-words text-2xl font-bold text-slate-900">{capacidad.name}</h1><p className="mt-2 break-words text-sm text-slate-600">{capacidad.description}</p></header>
        {completa ? <>
          <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Revisa tus candidatos y reportes guardados. Desde cada candidato puedes probar una implementación, habilitar una versión probada y usarla con datos nuevos. Cada acción requiere tu revisión.</p>
          <CandidatosCapacidad key={capacidad.id} capacidad={capacidad} />
        </> : <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">{propia ? 'Esta capacidad necesita una definición estructurada privada para preparar su implementación.' : 'Esta definición es pública. El uso de versiones de otro autor todavía requiere el contrato de publicación; puedes guardar una copia privada desde el catálogo.'}</p>}
        <button type="button" onClick={() => onCambiarSeccion?.('workflows')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Abrir constructor de workflows</button>
      </>}
  </div>;
}
