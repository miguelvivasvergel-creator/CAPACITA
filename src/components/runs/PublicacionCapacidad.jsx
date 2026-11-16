import { useState } from 'react';
import { api } from '../../api';
import FormularioDatos from '../common/FormularioDatos';
import { admiteFormulario, datosIniciales } from '../../utils/formularioDatos';

const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50';

export default function PublicacionCapacidad({ capacidad, propia, onRefresh, onCambiarSeccion }) {
  const [page, setPage] = useState(null);
  const [chosen, setChosen] = useState('');
  const [consent, setConsent] = useState(false);
  const [license, setLicense] = useState('MIT');
  const [inputs, setInputs] = useState({});
  const [parameters, setParameters] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [key, setKey] = useState(null);
  const version = page?.items.find(row => row.id === chosen);
  async function action(task) { setBusy(true); setError(''); setNotice(''); try { await task(); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }
  async function load(cursor = null) {
    const availability = await api('/publications/availability');
    if (!availability.enabled) throw new Error('Publicación ejecutable pendiente de activar en este entorno. El uso privado continúa disponible.');
    const result = await api(`/publications?capability_id=${encodeURIComponent(capacidad.id)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    setPage(old => ({ ...result, items: cursor ? [...old.items, ...result.items.filter(row => !old.items.some(previous => previous.id === row.id))] : result.items }));
    if (!cursor && result.items.length === 1) select(result.items[0]);
  }
  function select(row) { setChosen(row.id); setInputs(datosIniciales(row.contracts.input_schema)); setParameters(datosIniciales(row.contracts.parameter_schema)); setConsent(false); setKey(null); }
  function edit(setter, value) { setter(value); setConsent(false); setKey(null); }
  async function execute(event) {
    event.preventDefault();
    await action(async () => {
      const identity = key || crypto.randomUUID(); setKey(identity);
      const run = await api(`/publications/${encodeURIComponent(version.publication_id)}/runs`, { method: 'POST', idempotencyKey: identity, body: { inputs, parameters } });
      onCambiarSeccion?.(`historial/${run.id}`);
    });
  }
  return <section aria-label="Publicación y uso compartido" className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
    <h2 className="text-lg font-bold">{propia ? 'Compartir una versión probada' : 'Usar la herramienta publicada'}</h2>
    <p className="text-sm text-slate-700">{propia ? 'Publicar permite que otras cuentas ejecuten esta versión. Revisa que la definición y los ejemplos sean públicos. El código fuente, candidatos, reportes y datos de tus ejecuciones siguen privados.' : 'El autor comparte una versión probada. Tus datos y resultados serán privados; no necesitas generar código otra vez.'}</p>
    <button type="button" className={button} disabled={busy} onClick={() => action(load)}>{propia ? 'Consultar versiones para compartir' : 'Consultar versión publicada'}</button>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {page && !page.items.length && <p className="text-sm">{propia ? 'Primero prueba y habilita una versión para usarla.' : 'No hay una publicación ejecutable disponible.'}</p>}
    {page?.next_cursor && <button type="button" className={button} disabled={busy} onClick={() => action(() => load(page.next_cursor))}>Consultar más versiones</button>}
    {page?.items.length > 0 && <label className="block text-sm font-semibold">Versión fijada<select className="mt-1 min-h-11 w-full rounded-lg border p-2" value={chosen} disabled={busy} onChange={event => select(page.items.find(row => row.id === event.target.value))}><option value="" disabled>Selecciona una versión</option>{page.items.map(row => <option key={row.id} value={row.id}>{row.name} · {row.id.slice(0, 8)}{row.publication_id ? ' · publicada' : ' · privada'}</option>)}</select></label>}
    {version && propia && <div className="space-y-3">
      {version.publication_id ? <><p className="text-sm">Publicación activa · licencia {version.license}</p><p className="text-sm text-slate-600">Retirarla impide usos nuevos y en cola. Los que ya comenzaron pueden terminar; el historial se conserva.</p><button type="button" className={button} disabled={busy} onClick={() => action(async () => { if (!window.confirm('¿Retirar esta versión y ocultar su definición pública? Se conserva el historial.')) return; await api(`/publications/${version.publication_id}/withdraw`, { method: 'POST' }); await load(); onRefresh?.(); setNotice('Publicación retirada.'); })}>Retirar publicación</button></> : <>
        <label className="block text-sm font-semibold">Licencia elegida<select className="mt-1 min-h-11 w-full rounded-lg border p-2" disabled={busy} value={license} onChange={event => { setLicense(event.target.value); setConsent(false); }}>{['MIT', 'Apache-2.0', 'CC0-1.0'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={busy} checked={consent} onChange={event => setConsent(event.target.checked)} />Autorizo publicar la definición y permitir ejecutar esta versión bajo la licencia elegida. Revisé que no contiene datos privados y tengo derechos para compartirla.</label>
        <button type="button" className={button} disabled={busy || !consent} onClick={() => action(async () => { await api('/publications', { method: 'POST', body: { version_id: version.id, license, consent: true } }); await load(); onRefresh?.(); setNotice('Versión publicada para otras cuentas.'); })}>Publicar esta versión</button>
      </>}
    </div>}
    {version?.publication_id && !propia && (admiteFormulario(version.contracts.input_schema) && admiteFormulario(version.contracts.parameter_schema) ? <form className="space-y-4" onSubmit={execute}>
      <p className="text-sm">Licencia {version.license} · autor {capacidad.owner_username || version.owner_id}</p>
      <FormularioDatos schema={version.contracts.input_schema} value={inputs} onChange={value => edit(setInputs, value)} disabled={busy} legend="Tus datos" />
      <FormularioDatos schema={version.contracts.parameter_schema} value={parameters} onChange={value => edit(setParameters, value)} disabled={busy} legend="Opciones" />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />Confirmo ejecutar esta versión con estos datos.</label>
      <button type="submit" className={button} disabled={busy || !consent}>{busy ? 'Enviando…' : 'Ejecutar con mis datos'}</button>
    </form> : <p role="alert" className="text-sm text-amber-900">Este contrato no es compatible con el formulario guiado. No se enviará una ejecución incompleta.</p>)}
  </section>;
}
