import { useRef, useState } from 'react';
import { consultarPrueba, crearPrueba, listarPruebas } from '../../services/laboratorio';

const estados = {
  queued: 'En cola: esperando al trabajador', testing: 'Probando en aislamiento',
  passed: 'Casos superados', failed: 'Prueba fallida', interrupted: 'Interrumpida: requiere una prueba nueva',
};
const razones = {
  matched: 'Salida correcta', input_rejected: 'Entrada rechazada antes de ejecutar',
  timeout: 'Tiempo agotado', output_limit: 'Límite de salida', memory_limit: 'Límite de memoria',
  candidate_error: 'Error del candidato', invalid_json_output: 'Salida JSON inválida',
  output_mismatch: 'Salida distinta de lo esperado o contrato incorrecto',
  cleanup_unverified: 'No se pudo confirmar la limpieza', infrastructure_error: 'Sandbox no disponible',
};

export default function LaboratorioCandidato({ candidate }) {
  const [text, setText] = useState(() => JSON.stringify(candidate.manifest.definition.examples.map((example, index) => ({
    name: `Ejemplo de definición ${index + 1}`, ...example, expect_rejection: false,
  })), null, 2));
  const [page, setPage] = useState({ items: [], next_cursor: null });
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Reintentar una respuesta perdida conserva la clave hasta editar casos o crear otra prueba.
  const requestKey = useRef(null);

  async function perform(action) {
    setBusy(true);
    setError('');
    try { await action(); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  function submit() {
    return perform(async () => {
      let cases;
      try { cases = JSON.parse(text); } catch { throw new Error('Los casos deben ser un JSON válido.'); }
      if (!Array.isArray(cases) || cases.length < 1 || cases.length > 20) throw new Error('Incluye entre 1 y 20 casos.');
      requestKey.current ||= crypto.randomUUID();
      setActive(await crearPrueba(candidate, cases, requestKey.current));
    });
  }

  function load(more = false) {
    return perform(async () => {
      const result = await listarPruebas(candidate.id, more ? page.next_cursor : null);
      setPage((previous) => ({ ...result, items: more ? [...previous.items, ...result.items.filter((item) => !previous.items.some((old) => old.id === item.id))] : result.items }));
    });
  }

  const pending = active && ['queued', 'testing'].includes(active.status);
  return (
    <section aria-label="Laboratorio de candidato" className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <h4 className="font-semibold text-slate-900">Laboratorio privado</h4>
      <p className="text-sm text-slate-600">Los ejemplos de la definición son un punto de partida. Añade casos propios con resultados conocidos y entradas inválidas. Superarlos no habilita ni publica la capacidad.</p>
      <label className="block text-sm font-medium text-slate-800">
        Casos de prueba (JSON)
        <textarea value={text} onChange={(event) => { setText(event.target.value); requestKey.current = null; }} disabled={busy || pending}
          spellCheck={false} rows={10} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs" />
      </label>
      <p className="text-xs text-slate-500">Cada caso usa name, inputs, parameters y expected_output. Para una entrada inválida usa expect_rejection: true y expected_output: null.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={submit} disabled={busy || pending} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Encolar prueba aislada</button>
        <button type="button" onClick={() => load()} disabled={busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Cargar reportes guardados</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {active && <div aria-live="polite" className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{estados[active.status]}</p>
        <p className="break-all text-xs text-slate-500">Prueba: {active.id}</p>
        <button type="button" disabled={busy} onClick={() => perform(async () => setActive(await consultarPrueba(active.id)))} className="rounded border bg-white px-3 py-1 disabled:opacity-50">Actualizar estado</button>
        {active.status === 'queued' && <p>La prueba comenzará cuando el trabajador local esté disponible.</p>}
        {active.report?.error && <p>La prueba no terminó. Revisa el trabajador y crea otra prueba cuando esté disponible.</p>}
        {active.report?.cases && <ol className="list-decimal space-y-1 pl-5">{active.report.cases.map((item) => <li key={item.index}>
          Caso {item.index + 1}: {item.passed ? 'superado' : 'fallido'} · {razones[item.reason] || 'Fallo del laboratorio'}{item.elapsed_seconds != null ? ` · ${item.elapsed_seconds} s` : ''}
        </li>)}</ol>}
        {active.report?.environment && <p className="text-xs text-slate-600">Aislamiento gVisor · memoria 256 MiB · tiempo máximo {active.report.environment.limits?.timeout_seconds} s por caso · sin red.</p>}
        {!pending && <button type="button" disabled={busy} onClick={() => { requestKey.current = null; setActive(null); }} className="rounded border bg-white px-3 py-1">Preparar otra prueba</button>}
      </div>}
      {page.items.length > 0 && <ul className="space-y-1 text-sm">{page.items.map((item) => <li key={item.id}>
        <button type="button" disabled={busy} onClick={() => setActive(item)} className="text-left text-blue-700 underline">{estados[item.status]} · {new Date(item.created_at).toLocaleString()} · {item.id.slice(0, 8)}</button>
      </li>)}</ul>}
      {page.next_cursor && <button type="button" disabled={busy} onClick={() => load(true)} className="rounded border px-3 py-1 text-sm">Más reportes</button>}
    </section>
  );
}
