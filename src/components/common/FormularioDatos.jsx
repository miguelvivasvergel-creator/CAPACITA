import { useId, useState } from 'react';
import { admiteFormulario, datosIniciales, nombreCampo } from '../../utils/formularioDatos';

const INPUT = 'mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600';
function Campo({ name, schema, value, onChange, required }) {
  const id = useId();
  const [emptyText,setEmptyText] = useState(false);
  const title = nombreCampo(name, schema);
  if (schema.type === 'object' && !schema.enum) return <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">{title}</legend>{schema.description && <p className="text-sm text-slate-600">{schema.description}</p>}<Campos schema={schema} value={value || {}} onChange={onChange} /></fieldset>;
  if (schema.type === 'array' && !schema.enum) {
    const items = value || [];
    return <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold">{title}{required ? ' *' : ' (opcional)'}</legend>{schema.description && <p className="text-sm text-slate-600">{schema.description}</p>}{items.map((item, index) => <div key={index} className="min-w-0 space-y-2"><Campo name={`${title} ${index + 1}`} schema={schema.items} value={item} required onChange={next => onChange(items.map((old, i) => i === index ? next : old))} /><button type="button" className="min-h-11 text-sm text-red-700 underline" onClick={() => onChange(items.filter((_, i) => i !== index))}>Quitar elemento {index + 1}</button></div>)}<button type="button" disabled={items.length >= Math.min(schema.maxItems ?? 50, 50)} onClick={() => onChange([...items, datosIniciales(schema.items)])} className="min-h-11 rounded-lg border px-3 text-sm">Añadir elemento</button>{schema.minItems > 0 && <p className="text-xs text-slate-600">Mínimo {schema.minItems} elementos.</p>}</fieldset>;
  }
  const hint = schema.description;
  return <div className="min-w-0"><label htmlFor={id} className="block text-sm font-semibold">{title}{required ? ' *' : ' (opcional)'}</label>{hint && <p id={`${id}-ayuda`} className="mt-1 text-sm text-slate-600">{hint}</p>}
    {schema.enum || schema.type === 'boolean' ? <select id={id} name={name} aria-describedby={hint ? `${id}-ayuda` : undefined} required={required} className={INPUT} value={value === undefined ? '' : String((schema.enum || [true, false]).findIndex(item => Object.is(item, value)))} onChange={event => onChange(event.target.value === '' ? undefined : (schema.enum || [true, false])[Number(event.target.value)])}><option value="">Selecciona una opción</option>{(schema.enum || [true, false]).map((item, i) => <option key={i} value={i}>{item === true ? 'Sí' : item === false ? 'No' : item === null ? 'Sin valor' : String(item)}</option>)}</select>
      : schema.type === 'string' ? <><textarea id={id} name={name} aria-describedby={hint ? `${id}-ayuda` : undefined} autoComplete="off" required={required&&!emptyText} disabled={emptyText} rows={3} minLength={schema.minLength} maxLength={schema.maxLength} className={INPUT} value={value ?? ''} onChange={event => onChange(!required && event.target.value === '' ? undefined : event.target.value)} />{!(schema.minLength>0)&&<details className="mt-1 text-xs text-slate-600"><summary className="cursor-pointer py-2">Opciones de este dato</summary><label className="flex items-start gap-2 py-2"><input type="checkbox" checked={emptyText} onChange={event=>{setEmptyText(event.target.checked);onChange(event.target.checked?'':undefined);}}/>Usar texto vacío para {title}</label></details>}</>
        : <input id={id} name={name} aria-describedby={hint ? `${id}-ayuda` : undefined} autoComplete="off" required={required} type="number" step={schema.type === 'integer' ? 1 : 'any'} min={schema.minimum} max={schema.maximum} className={INPUT} value={value ?? ''} onChange={event => onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)} />}
  </div>;
}
function Campos({ schema, value, onChange }) {
  return Object.entries(schema.properties || {}).map(([name, spec]) => <Campo key={name} name={name} schema={spec} value={Object.hasOwn(value,name)?value[name]:undefined} required={schema.required?.includes(name)} onChange={next => { const result = { ...value, [name]:next }; if (next === undefined) delete result[name]; onChange(result); }} />);
}
export default function FormularioDatos({ schema, value, onChange, disabled = false, legend = 'Datos' }) {
  if (!admiteFormulario(schema)) return <p role="alert" className="text-sm text-amber-800">Estos datos necesitan una configuración que el formulario guiado aún no admite. Puedes revisar la herramienta en modo desarrollador.</p>;
  return <fieldset disabled={disabled} className="min-w-0 space-y-4"><legend className="mb-3 font-semibold">{legend}</legend>{Object.keys(schema.properties || {}).length ? <Campos schema={schema} value={value || {}} onChange={onChange} /> : <p className="text-sm text-slate-600">No necesitas completar datos en esta sección.</p>}</fieldset>;
}
