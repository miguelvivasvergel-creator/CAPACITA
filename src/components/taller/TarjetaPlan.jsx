import { useEffect, useRef, useState } from 'react';
import { aprobarWorkflow, ejecutarWorkflow } from '../../services/workflows';
import { admiteFormulario, camposChat, datosIniciales, pasosEnOrden } from '../../utils/formularioDatos';
import { infoTipo, tamano, urlDatos } from '../../utils/archivos';
import FormularioDatos from '../common/FormularioDatos';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Solución propuesta dentro del chat. Si sus datos son textos, números o archivos, el chat
 * los pide como mensajes y esta tarjeta aparece en modo confirmación con `datos`; si no,
 * muestra un formulario. "Aprobar y ejecutar" guarda (una sola vez por plan), aprueba
 * esos datos exactos y ejecuta. Editar los datos invalida la aprobación anterior.
 */
const SIN_CONECTORES = new Map();

export default function TarjetaPlan({ definition, datos, obtenerGuardada, ocupadoExterno, onEjecucion, conectores = SIN_CONECTORES }) {
  const esquema = definition.input_schema;
  const campos = camposChat(esquema);
  const formulario = admiteFormulario(esquema);
  const [inputs, setInputs] = useState(() => datosIniciales(esquema));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ejecutadas, setEjecutadas] = useState(0);
  const lock = useRef(false), alive = useRef(false), approval = useRef(null), key = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const pasos = pasosEnOrden(definition.nodes);
  const valores = datos || inputs;

  const ejecutar = (event) => {
    event.preventDefault();
    if (lock.current || (!datos && !formulario)) return;
    lock.current = true; setBusy(true); setError('');
    (async () => {
      try {
        const guardada = await obtenerGuardada();
        if (!approval.current) approval.current = await aprobarWorkflow(guardada, valores);
        key.current ||= crypto.randomUUID();
        try {
          const run = await ejecutarWorkflow(guardada.id, approval.current.id, key.current);
          if (!alive.current) return;
          approval.current = null; key.current = null; setEjecutadas((n) => n + 1);
          onEjecucion?.(run.id);
        } catch (cause) { if (cause.status === 409) { approval.current = null; key.current = null; } throw cause; }
      } catch (cause) { if (alive.current) setError(cause.message); }
      finally { lock.current = false; if (alive.current) setBusy(false); }
    })();
  };
  // Servicios externos que consulta este plan (sello 🌐): se dicen antes de aprobar.
  const externos = [...new Set(definition.nodes.map((node) => conectores.get(node.version_id)).filter(Boolean))];
  const boton = <>
    <p className="text-xs text-slate-500">🔒 Al confirmar autorizas estos pasos con estos datos. Tus datos no se envían a la IA.</p>
    {externos.length > 0 && <p className="text-xs text-sky-800">🌐 Este proceso consulta {externos.join(', ')}: solo recibe{externos.length > 1 ? 'n' : ''} los datos de su{externos.length > 1 ? 's' : ''} paso{externos.length > 1 ? 's' : ''} (por ejemplo, la ciudad o la referencia), nunca tus archivos ni tu cuenta.</p>}
    <button type="submit" disabled={busy || ocupadoExterno} className={`${BOTON} bg-emerald-600 text-white`}>
      {busy ? 'Preparando…' : ejecutadas ? 'Ejecutar de nuevo' : 'Aprobar y ejecutar'}
    </button>
  </>;

  if (datos) {
    return <form className="space-y-3" onSubmit={ejecutar} data-task-busy={busy ? 'true' : undefined}>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Listo para ejecutar</p>
      <p className="break-words text-sm text-slate-700"><span className="font-semibold">{definition.name}</span> con:</p>
      <ul className="space-y-2">{(campos || []).filter((campo) => campo.nombre in datos).map((campo) => {
        const valor = String(datos[campo.nombre]);
        return <li key={campo.nombre} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
          <p className="text-xs font-semibold text-slate-500">{campo.etiqueta}</p>
          {campo.archivo?.startsWith('image/') ? <img src={urlDatos(valor, campo.archivo)} alt={campo.etiqueta} className="mt-1 max-h-40 rounded-lg object-contain" />
            : campo.archivo ? <p className="mt-1">{infoTipo(campo.archivo).icono} {infoTipo(campo.archivo).nombre} · {tamano(valor)}</p>
            : <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words">{valor.length > 600 ? `${valor.slice(0, 600)}…` : valor}</p>}
        </li>;
      })}</ul>
      {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
      {boton}
    </form>;
  }

  return <div className="space-y-4" data-task-busy={busy ? 'true' : undefined}>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Solución propuesta</p>
      <h3 className="mt-1 break-words text-lg font-bold text-slate-900">{definition.name}</h3>
      {definition.description && <p className="mt-1 break-words text-sm text-slate-600">{definition.description}</p>}
    </div>
    <ol className="space-y-2">{pasos.map((node, index) => <li key={node.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{index + 1}</span>
      <span className="break-words">{node.label}{conectores.get(node.version_id) && <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">🌐 {conectores.get(node.version_id)}</span>}</span>
    </li>)}</ol>
    {campos ? null
      : formulario ? <form className="space-y-4 border-t pt-4" onSubmit={ejecutar}>
        <FormularioDatos schema={esquema} value={inputs} disabled={busy || ocupadoExterno} legend="Tus datos para esta ejecución"
          onChange={(next) => { setInputs(next); approval.current = null; key.current = null; setError(''); }} />
        {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
        {boton}
      </form>
      : <p className="text-sm text-amber-800">Esta solución necesita datos que el chat todavía no sabe pedir. Ábrela en el modo desarrollador para ejecutarla.</p>}
  </div>;
}
