import { useState } from 'react';
import { repararCandidato } from '../../services/candidatos';

export default function RepararCandidato({ candidate, onGuardado }) {
  const [feedback, setFeedback] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <details className="mt-4 rounded-lg border border-slate-200 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-blue-700">Proponer una corrección del código</summary>
    <p className="mt-3 text-sm text-slate-600">Describe el fallo con datos de ejemplo. Una corrección crea otro candidato privado y requiere repetir las pruebas. No modifica ni habilita el anterior. Máximo dos intentos por hora con la configuración inicial.</p>
    <label className="mt-3 block text-sm font-medium">Observación sin datos sensibles<textarea value={feedback} maxLength={1500} disabled={busy} onChange={(event) => { setFeedback(event.target.value); setConsent(false); }} rows={3} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
    <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} />Autorizo enviar a Gemini esta observación, el código anterior, la definición y sus ejemplos. Confirmo que no contienen datos sensibles.</label>
    <button type="button" disabled={busy || !consent || feedback.trim().length < 10} className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50" onClick={async () => {
      setBusy(true); setError('');
      try { const saved = await repararCandidato(candidate.id, { feedback: feedback.trim(), consent_to_provider: consent }); onGuardado(saved); setFeedback(''); setConsent(false); }
      catch (cause) { setError(cause.message); }
      finally { setBusy(false); }
    }}>{busy ? 'Proponiendo corrección…' : 'Generar otro candidato para probar'}</button>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </details>;
}
