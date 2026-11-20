import { useEffect, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { aprobarWorkflow, ejecutarWorkflow } from '../../services/workflows';
import { admiteFormulario, camposChat, datosIniciales, pasosEnOrden } from '../../utils/formularioDatos';
import { infoTipo, tamano, urlDatos } from '../../utils/archivos';
import FormularioDatos from '../common/FormularioDatos';
import { crearAsistente, horarioEnPalabras } from '../../services/asistentes';
import { estadoTelegram } from '../../services/telegram';
import { estadoGoogle } from '../../services/google';

const DIAS_CORTOS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']];

/**
 * Después de una ejecución que salió bien: convertir esta solución, con estos mismos datos, en un
 * asistente que se ejecuta solo (fase 5). Usa el mismo «Acepto» de la tarjeta si hay IA o envíos.
 */
function RepetirAutomatico({ obtenerGuardada, valores, nombre, requiereAcepto, aceptado }) {
  const [abierto, setAbierto] = useState(false);
  const [frecuencia, setFrecuencia] = useState('weekly');
  const [dias, setDias] = useState([1]);
  const [hora, setHora] = useState('07:00');
  const [creado, setCreado] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const horario = { frequency: frecuencia, days: frecuencia === 'weekly' ? dias : [], time: hora };

  async function crear() {
    if (requiereAcepto && !aceptado) { setError('Marca primero el «Acepto» de arriba: el asistente hará esos envíos cada vez.'); return; }
    if (frecuencia === 'weekly' && !dias.length) { setError('Elige al menos un día.'); return; }
    setOcupado(true); setError('');
    try {
      const guardada = await obtenerGuardada();
      setCreado(await crearAsistente(guardada, valores, horario, `${nombre} · ${horarioEnPalabras(horario).toLowerCase()}`, requiereAcepto && aceptado));
    } catch (causa) { setError(causa.message); } finally { setOcupado(false); }
  }

  if (creado) return <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><Icono nombre="actualizar" className="mr-1 inline h-4 w-4 align-[-3px]" />Asistente creado: {horarioEnPalabras(horario)}, con estos mismos datos. Lo ves y lo pausas en Mi biblioteca → Asistentes.</p>;
  if (!abierto) return <button type="button" onClick={() => setAbierto(true)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"><Icono nombre="actualizar" className="mr-1 inline h-4 w-4 align-[-3px]" />Repetir automáticamente</button>;
  return <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
    <p className="font-semibold">¿Cada cuánto?</p>
    <div className="flex flex-wrap gap-2">{[['daily', 'Todos los días'], ['weekly', 'Algunos días']].map(([valor, texto]) =>
      <button key={valor} type="button" aria-pressed={frecuencia === valor} onClick={() => setFrecuencia(valor)}
        className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold ${frecuencia === valor ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>{texto}</button>)}</div>
    {frecuencia === 'weekly' && <div className="flex flex-wrap gap-1" role="group" aria-label="Días de la semana">{DIAS_CORTOS.map(([dia, letra]) =>
      <button key={dia} type="button" aria-pressed={dias.includes(dia)} onClick={() => setDias((old) => (old.includes(dia) ? old.filter((d) => d !== dia) : [...old, dia].sort()))}
        className={`h-11 w-11 rounded-full text-sm font-semibold ${dias.includes(dia) ? 'bg-blue-700 text-white' : 'border border-slate-300 bg-white'}`}>{letra}</button>)}</div>}
    <label className="flex items-center gap-2">A las <input type="time" value={hora} onChange={(event) => setHora(event.target.value || '07:00')} className="min-h-11 rounded-lg border px-2" /> <span className="text-xs text-slate-500">(hora de Colombia)</span></label>
    <p className="text-xs text-slate-600">{horarioEnPalabras(horario)}, con los mismos datos de esta ejecución. Se pausa solo si falla 3 veces o si cambias la solución.</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={ocupado} onClick={crear} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{ocupado ? 'Creando…' : 'Crear asistente'}</button>
      <button type="button" disabled={ocupado} onClick={() => setAbierto(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button>
    </div>
  </div>;
}

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Solución propuesta dentro del chat. Si sus datos son textos, números o archivos, el chat
 * los pide como mensajes y esta tarjeta aparece en modo confirmación con `datos`; si no,
 * muestra un formulario. "Aprobar y ejecutar" guarda (una sola vez por plan), aprueba
 * esos datos exactos y ejecuta. Editar los datos invalida la aprobación anterior.
 */
const SIN_CONECTORES = new Map();

// Cuentas que el plan necesita y aún no están conectadas («Telegram», «tu cuenta de Google»). Si la
// consulta falla, no se bloquea: el trabajador vuelve a comprobarlo y responde con un error claro.
async function conexionesFaltantes(acciones) {
  const faltan = [];
  try {
    if (acciones.includes('Telegram') && !(await estadoTelegram()).linked) faltan.push('tu Telegram');
    if (acciones.some((nombre) => /^(Gmail|Google)/.test(nombre)) && !(await estadoGoogle()).linked) faltan.push('tu cuenta de Google');
  } catch { /* sin red o sin la migración: decide el trabajador */ }
  return faltan;
}

// Qué recibe cada paso, para que la persona vea la lógica antes de aprobar: de qué paso salen sus
// datos y los textos fijos que lleva (la instrucción de la IA, la ciudad, el asunto…). Solo texto.
function detallePaso(node, pasos) {
  const numero = new Map(pasos.map((paso, index) => [paso.id, index + 1]));
  const origenes = [...new Set(Object.values(node.bindings || {}).map((binding) => binding.source))];
  const lineas = [];
  const desde = origenes.filter((source) => numero.has(source)).map((source) => `paso ${numero.get(source)}`);
  if (desde.length) lineas.push(`Usa el resultado del ${desde.join(' y del ')}`);
  if (origenes.includes('$input')) lineas.push('Usa los datos que tú das');
  for (const [campo, valor] of Object.entries(node.values || {})) {
    if (!['string', 'number'].includes(typeof valor) || String(valor).startsWith('MUESTRA:') || String(valor).length > 2000) continue;
    const texto = String(valor).trim();
    if (texto) lineas.push(`${campo.replaceAll('_', ' ')}: «${texto.length > 220 ? `${texto.slice(0, 220)}…` : texto}»`);
  }
  return lineas;
}

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
  // Servicios externos del plan: los de datos (globo) solo reciben los datos de su paso; los de IA
  // (IA) reciben tu contenido (texto o fotos) y exigen un «Acepto» propio, también en el backend.
  const conectoresPlan = definition.nodes.map((node) => conectores.get(node.version_id)).filter(Boolean);
  const nombres = (lista) => [...new Set(lista.map((item) => item.proveedor))];
  const datosExternos = nombres(conectoresPlan.filter((item) => !item.ia && !item.accion));
  const iaExterna = nombres(conectoresPlan.filter((item) => item.ia));
  // Acciones (Telegram, Google): envían el resultado fuera de Capacita; también exigen el «Acepto».
  const acciones = nombres(conectoresPlan.filter((item) => item.accion));
  const requiereAcepto = iaExterna.length > 0 || acciones.length > 0;
  // Correos a otra persona: la dirección que ella escribió (valor fijo «para» del paso de correo).
  const destinatarios = [...new Set(definition.nodes.filter((node) => conectores.get(node.version_id)?.accion)
    .map((node) => node.values?.para).filter((para) => typeof para === 'string' && para.trim()).map((para) => para.trim()))];
  const aceptoEnvios = destinatarios.length
    ? `Acepto que este proceso envíe el resultado a mi ${acciones.join(', ')} y, desde mi Gmail, a ${destinatarios.join(', ')}. `
    : `Acepto que este proceso envíe el resultado a mi ${acciones.join(', ')} (solo a mis propias cuentas conectadas, nunca a otras personas).`;
  const [aceptaIA, setAceptaIA] = useState(false);

  const ejecutar = (event) => {
    event.preventDefault();
    if (lock.current || (!datos && !formulario) || (requiereAcepto && !aceptaIA)) return;
    lock.current = true; setBusy(true); setError('');
    (async () => {
      try {
        // Antes de ejecutar nada: si falta conectar Telegram o Google, se avisa ahora y no a mitad
        // del proceso (cuando un envío ya salió y el siguiente falla).
        const faltan = await conexionesFaltantes(acciones);
        if (faltan.length) throw new Error(`Primero conecta ${faltan.join(' y ')} en Configuración y vuelve a ejecutarlo. No se envió nada.`);
        const guardada = await obtenerGuardada();
        if (!approval.current) approval.current = await aprobarWorkflow(guardada, valores, requiereAcepto && aceptaIA);
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
  const boton = <>
    <p className="text-xs text-slate-500"><Icono nombre="candado" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Al confirmar autorizas estos pasos con estos datos.{iaExterna.length ? '' : ' Tus datos no se envían a la IA.'}</p>
    {datosExternos.length > 0 && <p className="text-xs text-sky-800"><Icono nombre="globo" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Este proceso consulta {datosExternos.join(', ')}: solo recibe{datosExternos.length > 1 ? 'n' : ''} los datos de su{datosExternos.length > 1 ? 's' : ''} paso{datosExternos.length > 1 ? 's' : ''} (por ejemplo, la ciudad o la referencia), nunca tus archivos ni tu cuenta.</p>}
    {requiereAcepto && <label className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-900">
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={aceptaIA} disabled={busy} onChange={(event) => { setAceptaIA(event.target.checked); approval.current = null; key.current = null; }} />
      <span>{iaExterna.length > 0 && `Acepto que los pasos de IA envíen a ${iaExterna.join(', ')} el contenido que reciben (tu texto o tu foto) para procesarlo. En el nivel gratuito Google puede usarlo para mejorar sus productos: no lo uses con datos sensibles. La IA puede equivocarse; revisa el resultado. `}{acciones.length > 0 && aceptoEnvios}</span>
    </label>}
    {destinatarios.length > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <Icono nombre="candado" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />El correo saldrá de tu Gmail hacia <span className="font-semibold">{destinatarios.join(', ')}</span>. Revisa que la dirección esté bien escrita: es la que pusiste en tu pedido.</p>}
    <button type="submit" disabled={busy || ocupadoExterno || (requiereAcepto && !aceptaIA)} className={`${BOTON} bg-emerald-600 text-white`}>
      {busy ? 'Preparando…' : ejecutadas ? 'Ejecutar de nuevo' : 'Aprobar y ejecutar'}
    </button>
    {ejecutadas > 0 && <RepetirAutomatico obtenerGuardada={obtenerGuardada} valores={valores} nombre={definition.name}
      requiereAcepto={requiereAcepto} aceptado={aceptaIA} />}
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
            : campo.archivo ? <p className="mt-1"><Icono nombre={infoTipo(campo.archivo).icono} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />{infoTipo(campo.archivo).nombre} · {tamano(valor)}</p>
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
      <div className="min-w-0 flex-1">
        <span className="break-words">{node.label}{conectores.get(node.version_id) && <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${conectores.get(node.version_id).ia ? 'bg-violet-100 text-violet-800' : conectores.get(node.version_id).accion ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-800'}`}><Icono nombre={conectores.get(node.version_id).ia ? 'chispa' : conectores.get(node.version_id).accion ? 'candado' : 'globo'} className="mr-1 inline h-3 w-3 align-[-1px]" />{conectores.get(node.version_id).ia ? 'IA · ' : ''}{conectores.get(node.version_id).proveedor}</span>}</span>
        {detallePaso(node, pasos).map((linea) => <p key={linea} className="mt-1 break-words text-xs leading-snug text-slate-600">{linea}</p>)}
      </div>
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
