import { useId, useState } from 'react';
import { objetivoDeEjemplo } from '../../mocks/objetivos';
import { interpretarObjetivo } from '../../services/objetivos';

export default function InterpretarObjetivo({ onPropuesta, onClonar, disabled, onBusy, initialObjective = '' }) {
  const id = useId();
  const [objective, setObjective] = useState(initialObjective);
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function changeObjective(value) {
    setObjective(value);
    setResult(null);
    setHistory([]);
    setAnswers({});
    setError('');
    setNotice('');
    setConsent(false);
  }

  const questions = result?.interpretation.decision === 'clarify' ? result.interpretation.questions : [];
  const total = history.length + questions.length;

  async function interpret() {
    if (busy || disabled) return;
    setBusy(true);
    onBusy?.(true);
    setError('');
    setNotice('');
    const next = [...history, ...questions.map((question, index) => ({ question, answer: (answers[index] || '').trim() }))];
    try {
      const response = await interpretarObjetivo(objective, next, consent);
      setResult(response);
      setHistory(next);
      setAnswers({});
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }

  const inactive = busy || disabled;
  return (
    <section className="mb-6 space-y-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4" aria-label="Definir desde una necesidad">
      <div>
        <h3 className="font-bold text-slate-900">Empieza describiendo lo que necesitas</h3>
        <p className="mt-1 text-sm text-slate-600">Buscaremos en tu catálogo y Gemini te ayudará a aclarar entradas, resultados y reglas. Revisarás la definición antes de guardarla.</p>
      </div>
      <fieldset disabled={inactive} className="space-y-3">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-800">¿Qué quieres resolver?</label>
        <textarea id={id} rows={4} maxLength={2000} value={objective} onChange={(event) => changeObjective(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" placeholder="Describe qué datos tienes, qué resultado esperas y las reglas que debe respetar." />
        <button type="button" onClick={() => changeObjective(objetivoDeEjemplo)} className="text-sm font-semibold text-blue-700 underline">Cargar necesidad de ejemplo</button>
        {questions.length > 0 && <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Faltan estas aclaraciones:</p>
          {questions.map((question, index) => <label key={`${history.length}-${index}`} className="block space-y-1 text-sm text-slate-700">
            <span>{question}</span>
            <textarea rows={2} maxLength={1000} value={answers[index] || ''} onChange={(event) => setAnswers((previous) => ({ ...previous, [index]: event.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white p-2" />
          </label>)}
        </div>}
        <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />Confirmo que el objetivo y las respuestas no contienen datos privados y autorizo enviarlos a Google Gemini. El nivel gratuito puede usar contenido para mejorar sus productos.</label>
        <button type="button" onClick={interpret} disabled={!consent || objective.trim().length < 10 || questions.some((_, index) => !(answers[index] || '').trim()) || total > 6} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Buscando e interpretando…' : questions.length ? 'Enviar aclaraciones' : 'Buscar e interpretar necesidad'}</button>
        {total > 6 && <p className="text-sm text-amber-800">Alcanzaste el límite de aclaraciones de este bloque. Incorpora las respuestas al objetivo y vuelve a interpretarlo, o completa el formulario manual.</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {result && <div className="space-y-3 border-t border-blue-100 pt-3">
        <p role="status" className="text-sm text-slate-700">{result.interpretation.explanation}</p>
        {result.interpretation.decision === 'blocked' && <p className="text-sm text-amber-800">Hay un requisito pendiente. Puedes reformular la necesidad o continuar la definición manualmente.</p>}
        <h4 className="text-sm font-bold text-slate-800">Coincidencias del catálogo autorizado</h4>
        <p className="text-xs text-slate-600">Búsqueda textual parcial. Una coincidencia no demuestra equivalencia funcional ni disponibilidad para ejecutar.</p>
        {result.matches.items.length > 0 ? <ul className="space-y-2">{result.matches.items.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="text-sm text-slate-600">{item.description}</p>
          <p className="mt-1 text-xs text-slate-500">{item.status === 'draft' ? 'Borrador; ejecución pendiente' : 'Implementación por verificar'}</p>
          <button type="button" disabled={inactive} onClick={() => onClonar?.(item)} className="mt-2 text-sm font-semibold text-blue-700 underline disabled:opacity-50">Clonar como borrador</button>
        </li>)}</ul> : <p className="text-sm text-slate-600">Sin coincidencias textuales en esta búsqueda.</p>}
        {result.search_truncated && <p className="text-xs text-slate-500">Hay más resultados; explora el catálogo antes de decidir.</p>}
        {result.definition && <>
          <p className="text-sm font-semibold text-slate-800">Propuesta: {result.definition.name}</p>
          <p className="text-sm text-slate-600">{result.definition.description}</p>
          <button type="button" disabled={inactive} onClick={() => {
            onPropuesta(result.definition);
            setNotice('Propuesta cargada en el formulario. Revisa campos, reglas y ejemplo; después comprueba la definición antes de guardarla.');
          }} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Usar propuesta en el formulario</button>
        </>}
      </div>}
    </section>
  );
}
