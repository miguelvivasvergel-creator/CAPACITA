import { useState } from 'react';
import { revisarGeneracion, listarCandidatos, generarCandidato } from '../../services/candidatos';
import LaboratorioCandidato from './LaboratorioCandidato';
import RepararCandidato from './RepararCandidato';

export default function CandidatosCapacidad({ capacidad }) {
  const [revision, setRevision] = useState(null);
  const [page, setPage] = useState({ items: [], next_cursor: null });
  const [consent, setConsent] = useState(false);
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function review() {
    setBusy(true);
    setError('');
    setNotice('');
    setRevision(null);
    setConsent(false);
    setAcknowledge(false);
    try {
      const [checked, candidates] = await Promise.all([revisarGeneracion(capacidad.id), listarCandidatos(capacidad.id)]);
      setRevision(checked);
      setPage(candidates);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (busy || !revision) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await generarCandidato(capacidad.id, {
        definition_hash: revision.definition_hash,
        acknowledge_similar: acknowledge,
        consent_to_provider: consent,
      });
      setPage((previous) => ({ ...previous, items: [saved, ...previous.items] }));
      setRevision(null);
      setConsent(false);
      setNotice('Candidato privado guardado. Puedes volver a abrirlo después de recargar. Las pruebas aisladas siguen pendientes.');
    } catch (cause) {
      setError(cause.message);
      setRevision(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (busy || !page.next_cursor) return;
    setBusy(true);
    setError('');
    try {
      const next = await listarCandidatos(capacidad.id, { cursor: page.next_cursor });
      setPage((previous) => ({ items: [...previous.items, ...next.items.filter((candidate) => !previous.items.some((item) => item.id === candidate.id))], next_cursor: next.next_cursor }));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  const hasMatches = Boolean(revision?.matches.items.length);
  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Candidatos Python privados">
      <h3 className="font-bold text-slate-900">Preparar implementación Python</h3>
      <p className="text-sm text-slate-600">Busca primero en el catálogo. Si necesitas una implementación distinta, Gemini puede proponer código. El candidato queda privado y requiere pruebas aisladas antes de usarse.</p>
      <button type="button" disabled={busy} onClick={review} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{busy ? 'Procesando…' : 'Revisar catálogo y cargar candidatos'}</button>
      {revision && <div className="space-y-3 text-sm text-slate-700">
        {hasMatches ? <>
          <p>Coincidencias textuales del catálogo autorizado. Revisa si puedes reutilizarlas desde Capacidades:</p>
          <ul className="list-disc space-y-1 pl-5">{revision.matches.items.map((item) => <li key={item.id}>{item.name} — {item.description}</li>)}</ul>
          {revision.matches.next_cursor && <p>Hay más coincidencias. Consulta el catálogo antes de decidir.</p>}
          <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} />Necesito una implementación distinta de estas coincidencias.</label>
        </> : <p>Sin coincidencias textuales en esta búsqueda. La búsqueda todavía no es semántica.</p>}
        <label className="flex items-start gap-2"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />Confirmo que la definición y los ejemplos no contienen datos privados y autorizo enviarlos a Google Gemini para generar el código. El nivel gratuito puede usar contenido para mejorar sus productos.</label>
        <button type="button" disabled={busy || !consent || (hasMatches && !acknowledge)} onClick={generate} className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Generar y guardar candidato privado</button>
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {page.items.length > 0 && <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-800">Candidatos guardados</h4>
        {page.items.map((candidate) => <details key={candidate.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-semibold">Python · borrador · {candidate.id.slice(0, 8)}</summary>
          <p className="mt-2 text-xs text-slate-500">Proveedor: {candidate.provider} · modelo: {candidate.model}. La revisión de sintaxis no acredita seguridad ni resultados correctos.</p>
          <p className="mt-2 break-all text-xs text-slate-500">SHA-256: {candidate.manifest.artifact_hash}</p>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-800">{candidate.manifest.proposal.source}</pre>
          <LaboratorioCandidato candidate={candidate} />
          <RepararCandidato candidate={candidate} onGuardado={(saved) => {
            setPage((previous) => ({ ...previous, items: [saved, ...previous.items] }));
            setNotice('Corrección guardada como candidato nuevo. Repite las pruebas aisladas antes de habilitarlo.');
          }} />
        </details>)}
        {page.next_cursor && <button type="button" disabled={busy} onClick={loadMore} className="rounded-xl border px-4 py-2 text-sm">Cargar más candidatos</button>}
      </div>}
    </section>
  );
}
