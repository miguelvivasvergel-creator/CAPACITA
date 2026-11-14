import { cloneElement, useId, useState } from 'react';
import { ejemploDefinicion } from '../../mocks/definiciones';
import { comprobarDefinicion, guardarDefinicion } from '../../services/definiciones';
import { prepararDefinicion } from '../../utils/definiciones';
import { clonarCapacidad } from '../../services/capacidades';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const SECONDARY = 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const TYPES = [['string', 'Texto'], ['number', 'Número'], ['integer', 'Entero'], ['boolean', 'Sí/no'], ['array', 'Lista'], ['object', 'Objeto libre']];
const DATA_TYPES = [['texto', 'Texto'], ['datos', 'Datos'], ['pdf', 'PDF'], ['imagen', 'Imagen'], ['audio', 'Audio']];

function campo(name = '') {
  return { id: crypto.randomUUID(), name, description: '', type: 'string', required: true };
}

function formularioVacio() {
  return {
    name: '', description: '', category: '', input_type: 'texto', output_type: 'texto',
    inputs: [campo('texto')], parameters: [], outputs: [campo('resultado')],
    constraints: '', required_permissions: '', resources: '', failure_cases: '',
    example_inputs: '{"texto": ""}', example_parameters: '{}', example_output: '{"resultado": ""}',
  };
}

// Componente de A. B puede reutilizarlo en su estudio mediante onGuardado(capacidad).
export default function DefinirCapacidad({ onGuardado }) {
  const [form, setForm] = useState(formularioVacio);
  const [checked, setChecked] = useState(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function cambiar(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setChecked(null);
    setAcknowledge(false);
    setError('');
  }

  async function comprobar(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setChecked(null);
    setAcknowledge(false);
    try { setChecked(await comprobarDefinicion(prepararDefinicion(form))); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  async function guardar() {
    if (!checked || busy) return;
    setBusy(true);
    setError('');
    try { onGuardado?.(await guardarDefinicion(checked.definition, acknowledge)); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  async function reutilizar(item) {
    setBusy(true);
    setError('');
    try { onGuardado?.(await clonarCapacidad(item.id)); }
    catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Define tu capacidad</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Describe lo que debe hacer, qué recibe y qué entrega. Guardaremos una definición privada; la implementación y sus pruebas vendrán después.</p>
        </div>
        <button type="button" className={SECONDARY} disabled={busy} onClick={() => {
          setForm(structuredClone(ejemploDefinicion)); setChecked(null); setAcknowledge(false); setError('');
        }}>Cargar ejemplo editable</button>
      </div>
      <form onSubmit={comprobar}>
        <fieldset disabled={busy} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre"><input className={INPUT} required minLength={3} maxLength={80} value={form.name} onChange={(e) => cambiar('name', e.target.value)} /></Campo>
            <Campo label="Categoría"><input className={INPUT} required maxLength={50} value={form.category} onChange={(e) => cambiar('category', e.target.value)} placeholder="Educación, datos, inventario…" /></Campo>
            <div className="sm:col-span-2"><Campo label="Propósito y resultado esperado"><textarea className={INPUT} required minLength={5} maxLength={500} rows={3} value={form.description} onChange={(e) => cambiar('description', e.target.value)} /></Campo></div>
            <Campo label="Tipo general de entrada"><select className={INPUT} value={form.input_type} onChange={(e) => cambiar('input_type', e.target.value)}>{DATA_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Campo>
            <Campo label="Tipo general de salida"><select className={INPUT} value={form.output_type} onChange={(e) => cambiar('output_type', e.target.value)}>{DATA_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Campo>
          </div>
          <EditorCampos title="Entradas" fields={form.inputs} onChange={(value) => cambiar('inputs', value)} />
          <EditorCampos title="Parámetros" fields={form.parameters} onChange={(value) => cambiar('parameters', value)} />
          <EditorCampos title="Salidas" fields={form.outputs} onChange={(value) => cambiar('outputs', value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['constraints', 'Reglas y restricciones'], ['failure_cases', 'Errores esperados'],
              ['required_permissions', 'Permisos que necesitaría'], ['resources', 'Recursos o servicios necesarios'],
            ].map(([key, label]) => <Campo key={key} label={label}><textarea className={INPUT} rows={3} maxLength={8000} value={form[key]} onChange={(e) => cambiar(key, e.target.value)} placeholder="Una indicación por línea. Puede quedar vacío." /></Campo>)}
          </div>
          <p className="text-xs text-slate-500">Declarar un permiso o recurso no lo concede ni conecta servicios. Los archivos se describen mediante referencias autorizadas, no mediante rutas de tu equipo.</p>
          <div>
            <h3 className="font-semibold text-slate-900">Un caso de referencia</h3>
            <p className="mt-1 text-sm text-slate-600">Escribe ejemplos como objetos JSON. Comprobaremos que cumplen los tipos y campos definidos; la salida esperada la escribes tú, todavía no se calcula.</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {[
                ['example_inputs', 'Ejemplo de entrada'], ['example_parameters', 'Ejemplo de parámetros'], ['example_output', 'Salida esperada'],
              ].map(([key, label]) => <Campo key={key} label={label}><textarea spellCheck={false} className={`${INPUT} font-mono`} required rows={5} maxLength={16000} value={form[key]} onChange={(e) => cambiar(key, e.target.value)} /></Campo>)}
            </div>
          </div>
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Comprobando…' : 'Comprobar definición y buscar similares'}</button>
        </fieldset>
      </form>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {checked && (
        <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
          <p role="status" className="text-sm text-slate-700">Los contratos y el ejemplo son consistentes. La implementación sigue pendiente de creación y pruebas.</p>
          <h3 className="font-semibold text-slate-900">Coincidencias en tu catálogo autorizado</h3>
          <p className="text-sm text-slate-600">Búsqueda textual por nombre; una coincidencia no demuestra que haga lo mismo ni que esté lista para ejecutarse.</p>
          {checked.matches.items.length ? (
            <>
              <ul className="space-y-3">
                {checked.matches.items.map((item) => <li key={item.id} className="flex flex-col items-start gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{item.name}</p><p className="mt-1 text-sm text-slate-600">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.visibility === 'private' ? 'Privada' : 'Pública'} · {item.status === 'draft' ? 'Borrador' : 'Implementación por verificar'}</p></div>
                  <button type="button" className={SECONDARY} disabled={busy} onClick={() => reutilizar(item)}>Clonar como borrador</button>
                </li>)}
              </ul>
              {checked.matches.next_cursor && <p className="text-xs text-slate-500">Hay más coincidencias. Puedes explorarlas en el catálogo.</p>}
              <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1 rounded" checked={acknowledge} disabled={busy} onChange={(e) => setAcknowledge(e.target.checked)} />Revisé las coincidencias y necesito una definición diferente.</label>
            </>
          ) : <p className="text-sm text-slate-600">No encontramos coincidencias textuales con ese nombre. Puedes guardar tu definición.</p>}
          <button type="button" onClick={guardar} disabled={busy || (checked.matches.items.length > 0 && !acknowledge)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar definición privada'}</button>
        </div>
      )}
    </section>
  );
}

function Campo({ label, children }) {
  const id = useId();
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700" htmlFor={id}><span>{label}</span><span className="block">{cloneElement(children, { id })}</span></label>;
}

function EditorCampos({ title, fields, onChange }) {
  const edit = (id, key, value) => onChange(fields.map((field) => field.id === id ? { ...field, [key]: value } : field));
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 font-semibold text-slate-900">{title}</legend>
      <p className="mb-3 text-xs text-slate-500">Nombres sin espacios ni tildes, por ejemplo texto o cantidad. Objeto libre no define sus campos internos.</p>
      <div className="space-y-3">
        {fields.map((field, index) => <div key={field.id} className="grid items-end gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label={`${title}: nombre ${index + 1}`}><input className={INPUT} value={field.name} required maxLength={64} pattern="[a-zA-Z][a-zA-Z0-9_]{0,63}" onChange={(e) => edit(field.id, 'name', e.target.value)} /></Campo>
          <Campo label="Descripción del campo"><input className={INPUT} value={field.description} maxLength={500} onChange={(e) => edit(field.id, 'description', e.target.value)} /></Campo>
          <Campo label="Tipo de valor"><select className={INPUT} value={field.type} onChange={(e) => edit(field.id, 'type', e.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Campo>
          <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="rounded" checked={field.required} onChange={(e) => edit(field.id, 'required', e.target.checked)} />Obligatorio</label><button type="button" className="text-sm text-red-700 underline" aria-label={`Quitar campo ${index + 1} de ${title}`} onClick={() => onChange(fields.filter((item) => item.id !== field.id))}>Quitar</button></div>
          {field.type === 'array' && <Campo label="Tipo de cada elemento"><select className={INPUT} value={field.itemsType || 'string'} onChange={(e) => edit(field.id, 'itemsType', e.target.value)}>{TYPES.filter(([value]) => value !== 'array').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Campo>}
        </div>)}
      </div>
      <button type="button" disabled={fields.length >= 64} className={`${SECONDARY} mt-3`} onClick={() => onChange([...fields, campo()])}>Añadir campo</button>
    </fieldset>
  );
}
