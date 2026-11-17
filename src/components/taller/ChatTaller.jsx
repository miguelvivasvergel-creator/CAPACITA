import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { buscarOpcionesPlan, proponerPlan } from '../../services/planner';
import { interpretarObjetivo } from '../../services/objetivos';
import { guardarWorkflow } from '../../services/workflows';
import { camposChat } from '../../utils/formularioDatos';
import { infoTipo, leerArchivo, urlDatos } from '../../utils/archivos';
import FabricaHerramienta from './FabricaHerramienta';
import ResultadoDatos from '../common/ResultadoDatos';
import LienzoTaller from './LienzoTaller';
import { ESTADOS_NODO } from './estadosNodo';
import TarjetaPlan from './TarjetaPlan';

const SUGERENCIAS = [
  'Quita los espacios de los extremos de un texto y conviértelo a mayúsculas',
  'Cuenta cuántas palabras tiene un texto y dime las más repetidas',
  'Detecta los productos agotados de una lista con sus existencias',
];
const ESTADO_RUN = { queued: 'En cola: esperando al trabajador', running: 'Trabajando en tu solución…', completed: '¡Listo! Aquí está tu resultado', failed: 'La solución no pudo terminar', interrupted: 'El trabajo se interrumpió' };
const activo = (status) => ['queued', 'running'].includes(status);

/**
 * Pantalla principal: conversación a la izquierda y taller visual a la derecha.
 * Orquesta las APIs existentes (planner, interpretación, laboratorio y workflows):
 * busca primero en el catálogo autorizado, propone, crea lo que falta y ejecuta.
 */
export default function ChatTaller({ usuario, onCambiarSeccion }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [consentimiento, setConsentimiento] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [fase, setFase] = useState('');
  const [conversacion, setConversacion] = useState(null); // { objetivo, aclaraciones, ruta, metaDefinir }
  const [pendientes, setPendientes] = useState([]);
  const [plan, setPlan] = useState(null);
  const [creando, setCreando] = useState('');
  const [estadoCreacion, setEstadoCreacion] = useState('');
  const [run, setRun] = useState(null);
  const [runId, setRunId] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [vistaMovil, setVistaMovil] = useState('chat');
  // Datos del plan que el chat pide uno por uno: { definicion, campos, indice, datos }.
  const [pidiendo, setPidiendo] = useState(null);
  const [adjunto, setAdjunto] = useState(null); // archivo enviado antes de tener solución
  const [leyendo, setLeyendo] = useState(false);
  const siguienteId = useRef(0), peticion = useRef(null), fin = useRef(null), entrada = useRef(null), selector = useRef(null);
  const campoActual = plan && pidiendo ? pidiendo.campos[pidiendo.indice] : null;
  const solucion = useRef({ definicion: null, guardada: null, incierta: false });

  const agregar = useCallback((mensaje) => setMensajes((old) => [...old, { id: ++siguienteId.current, ...mensaje }]), []);
  useEffect(() => () => peticion.current?.abort(), []);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensajes, fase, run?.status]);

  // Seguimiento en vivo de la ejecución: alimenta los estados de los nodos del taller.
  useEffect(() => {
    if (!runId) return;
    const controller = new AbortController(); let timer;
    async function leer() {
      try {
        const next = await api(`/runs/${encodeURIComponent(runId)}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRun(next);
        if (activo(next.status)) timer = setTimeout(leer, 2000);
      } catch (cause) { if (!controller.signal.aborted) agregar({ de: 'capacita', tipo: 'error', texto: cause.message }); }
    }
    leer();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, agregar]);

  const estados = {};
  if (run) {
    estados.$input = 'completed';
    for (const step of run.report?.steps || []) estados[step.id] = step.status;
    estados.$output = run.status === 'completed' ? 'completed' : ['failed', 'interrupted'].includes(run.status) ? 'failed' : 'espera';
  }
  const pasoElegido = run?.report?.steps?.find((step) => step.id === seleccionado);
  const nodoElegido = plan?.nodes.find((node) => node.id === seleccionado);

  function nuevoTaller() {
    setPlan(null); setCreando(''); setEstadoCreacion(''); setRun(null); setRunId(null); setSeleccionado(null); setPendientes([]); setPidiendo(null);
  }

  // Se guarda una sola vez por plan, aunque se ejecute varias veces con datos distintos.
  async function obtenerGuardada() {
    const actual = solucion.current;
    if (actual.definicion !== plan) solucion.current = { definicion: plan, guardada: null, incierta: false };
    if (solucion.current.guardada) return solucion.current.guardada;
    if (solucion.current.incierta) throw new Error('No pudimos confirmar si la solución se guardó. Revísala en Soluciones antes de crear otra copia.');
    try {
      solucion.current.guardada = await guardarWorkflow(plan);
      return solucion.current.guardada;
    } catch (cause) {
      if (!cause.status || cause.status >= 500) solucion.current.incierta = true;
      throw cause;
    }
  }

  function alEjecutar(id) {
    setRun(null); setRunId(id); setSeleccionado(null); setVistaMovil('taller');
    agregar({ de: 'capacita', tipo: 'resultado', runId: id });
  }

  // Pide el siguiente dato o, si ya están todos, muestra la confirmación.
  function pedirSiguiente(estado) {
    setPidiendo(estado);
    const campo = estado.campos[estado.indice];
    if (!campo) { agregar({ de: 'capacita', tipo: 'confirmar', definicion: estado.definicion, datos: estado.datos }); return; }
    const inicio = estado.indice ? 'Ahora necesito' : 'Para ejecutarla necesito';
    agregar({ de: 'capacita', tipo: 'texto', texto: campo.archivo ? `${inicio}: ${campo.etiqueta} (${infoTipo(campo.archivo).nombre}). Súbelo con el botón 📎 de abajo 👇` : `${inicio}: ${campo.etiqueta}. Escríbelo abajo 👇` });
  }

  // Tras ejecutar, un dato nuevo vuelve a empezar la recogida para ejecutarla otra vez.
  const estadoParaDato = () => (pidiendo.indice >= pidiendo.campos.length ? { ...pidiendo, indice: 0, datos: {} } : pidiendo);

  function recibirDato(valor) {
    const estado = estadoParaDato(), campo = estado.campos[estado.indice];
    agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
    if (campo.archivo) {
      setPidiendo(estado);
      agregar({ de: 'capacita', tipo: 'texto', texto: `Aquí necesito un archivo: ${campo.etiqueta}. Súbelo con el botón 📎 de abajo 👇` });
      return;
    }
    const numero = campo.tipo !== 'string';
    const dato = numero ? Number(valor.trim().replace(',', '.')) : valor;
    if (numero && (!Number.isFinite(dato) || (campo.tipo === 'integer' && !Number.isInteger(dato)))) {
      agregar({ de: 'capacita', tipo: 'texto', texto: `Necesito un número${campo.tipo === 'integer' ? ' entero' : ''} para ${campo.etiqueta.toLowerCase()}. Escríbelo de nuevo.` });
      return;
    }
    pedirSiguiente({ ...estado, indice: estado.indice + 1, datos: { ...estado.datos, [campo.nombre]: dato } });
  }

  async function usarArchivo(archivo, estado) {
    const campo = estado.campos[estado.indice];
    setLeyendo(true);
    try {
      const base64 = await leerArchivo(archivo, campo.archivo);
      agregar({ de: 'tu', tipo: 'archivo', nombre: archivo.name, vista: campo.archivo.startsWith('image/') ? urlDatos(base64, campo.archivo) : null });
      pedirSiguiente({ ...estado, indice: estado.indice + 1, datos: { ...estado.datos, [campo.nombre]: base64 } });
    } catch (cause) {
      setPidiendo(estado); agregar({ de: 'capacita', tipo: 'error', texto: cause.message });
    } finally { setLeyendo(false); }
  }

  function recibirArchivo(archivo) {
    if (!archivo || leyendo) return;
    if (plan && pidiendo) {
      const estado = estadoParaDato(), campo = estado.campos[estado.indice];
      if (campo.archivo) { usarArchivo(archivo, estado); return; }
      setPidiendo(estado);
      agregar({ de: 'capacita', tipo: 'texto', texto: `Ahora necesito: ${campo.etiqueta}. Escríbelo abajo 👇` });
      return;
    }
    // Aún no hay solución: se guarda y se usa cuando la solución pida un archivo.
    setAdjunto(archivo);
    agregar({ de: 'tu', tipo: 'archivo', nombre: archivo.name, vista: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null });
    agregar({ de: 'capacita', tipo: 'texto', texto: 'Recibí tu archivo 👍. Cuéntame qué quieres hacer con él.' });
  }

  function empezarDatos(definicion) {
    const campos = camposChat(definicion.input_schema);
    if (!campos) { setPidiendo(null); return; }
    const estado = { definicion, campos, indice: 0, datos: {} };
    if (adjunto && campos[0].archivo) {
      agregar({ de: 'capacita', tipo: 'texto', texto: `Uso el archivo que me enviaste (${adjunto.name}).` });
      const archivo = adjunto; setAdjunto(null); usarArchivo(archivo, estado);
      return;
    }
    pedirSiguiente(estado);
  }

  function mostrarDefinicion(value, objetivoDefinido) {
    const interpretation = value.interpretation;
    if (interpretation?.explanation) agregar({ de: 'capacita', tipo: 'texto', texto: interpretation.explanation });
    if (interpretation?.decision === 'clarify') {
      setPendientes(interpretation.questions); agregar({ de: 'capacita', tipo: 'preguntas', preguntas: interpretation.questions });
    } else if (value.definition) {
      setCreando(value.definition.name); setEstadoCreacion(''); setPlan(null);
      agregar({ de: 'capacita', tipo: 'crear', definicion: value.definition });
    } else {
      agregar({ de: 'capacita', tipo: 'bloqueado' });
    }
    setConversacion((old) => ({ ...old, ruta: 'definir', metaDefinir: objetivoDefinido }));
  }

  async function resolver(estado) {
    const { objetivo, aclaraciones, ruta, metaDefinir } = estado;
    const completo = [objetivo, ...aclaraciones.map((item) => `${item.question}: ${item.answer}`)].join('\n');
    if (completo.length > 2000) { agregar({ de: 'capacita', tipo: 'error', texto: 'Tu necesidad y respuestas superan 2.000 caracteres. Resúmelas un poco y vuelve a escribir.' }); return; }
    const controller = new AbortController(); peticion.current?.abort(); peticion.current = controller;
    setOcupado(true); setPendientes([]);
    try {
      if (ruta === 'definir') {
        setFase('Estoy diseñando la herramienta que falta…');
        const value = await interpretarObjetivo(metaDefinir || objetivo, aclaraciones, true, controller.signal);
        if (!controller.signal.aborted) mostrarDefinicion(value, metaDefinir || objetivo);
        return;
      }
      setFase('Buscando en tus herramientas y en las de la comunidad…');
      const opciones = await buscarOpcionesPlan(completo, controller.signal);
      if (controller.signal.aborted) return;
      if (!opciones.items.length) {
        setFase('No encontré herramientas para esto. Voy a diseñar una nueva…');
        const value = await interpretarObjetivo(objetivo, aclaraciones, true, controller.signal);
        if (!controller.signal.aborted) mostrarDefinicion(value, objetivo);
        return;
      }
      setFase(`Encontré ${opciones.items.length} herramienta${opciones.items.length === 1 ? '' : 's'} posibles. Armando tu proceso…`);
      const { proposal } = await proponerPlan(completo, opciones.items.slice(0, 12), controller.signal);
      if (controller.signal.aborted) return;
      agregar({ de: 'capacita', tipo: 'texto', texto: proposal.explanation });
      if (proposal.decision === 'clarify') {
        setPendientes(proposal.questions); agregar({ de: 'capacita', tipo: 'preguntas', preguntas: proposal.questions });
      } else if (proposal.definition) {
        setPlan(proposal.definition); setCreando('');
        agregar({ de: 'capacita', tipo: 'plan', definicion: proposal.definition });
        empezarDatos(proposal.definition);
      } else if (proposal.decision === 'create') {
        agregar({ de: 'capacita', tipo: 'faltan', faltan: proposal.missing });
      } else {
        // El planner a veces marca "blocked" cuando solo falta una herramienta. El
        // diseñador tiene sus propios controles y bloquea si de verdad hace falta algo externo.
        setFase('Ninguna de tus herramientas sirve para esto. Voy a diseñar una nueva…');
        const value = await interpretarObjetivo(objetivo, aclaraciones, true, controller.signal);
        if (!controller.signal.aborted) mostrarDefinicion(value, objetivo);
      }
    } catch (cause) {
      if (!controller.signal.aborted) agregar({ de: 'capacita', tipo: 'error', texto: `${cause.message} Tu conversación sigue aquí; puedes volver a intentarlo.` });
    } finally {
      if (!controller.signal.aborted) { setOcupado(false); setFase(''); }
    }
  }

  function continuar(estado) {
    setConversacion(estado);
    if (!consentimiento) { agregar({ de: 'capacita', tipo: 'consentimiento', estado }); return; }
    resolver(estado);
  }

  function enviar(event) {
    event?.preventDefault();
    const valor = texto.trim();
    if (ocupado || !valor) return;
    // Un dato se entrega tal cual lo escribió la persona (sin recortar espacios).
    if (pidiendo && plan && !pendientes.length) { recibirDato(texto); return; }
    if (!pendientes.length && valor.length < 10) { agregar({ de: 'capacita', tipo: 'texto', texto: 'Cuéntame un poco más: qué datos tienes y qué resultado buscas.' }); return; }
    agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
    if (pendientes.length && conversacion) {
      const respuesta = { question: pendientes.join(' / '), answer: valor };
      continuar({ ...conversacion, aclaraciones: [...conversacion.aclaraciones, respuesta].slice(-6) });
    } else {
      nuevoTaller();
      // Solo se cuenta el tipo de archivo adjunto, nunca su contenido.
      const tipoAdjunto = !adjunto ? '' : adjunto.type.startsWith('image/') ? 'una foto' : adjunto.name.toLowerCase().endsWith('.pdf') ? 'un PDF'
        : adjunto.name.toLowerCase().endsWith('.docx') ? 'un documento Word' : adjunto.name.toLowerCase().endsWith('.xlsx') ? 'un Excel' : 'un archivo';
      continuar({ objetivo: tipoAdjunto ? `${valor}\n(Adjunté ${tipoAdjunto} como entrada.)` : valor, aclaraciones: [], ruta: 'buscar', metaDefinir: null });
    }
  }

  function crearFaltante(item) {
    if (ocupado || !conversacion) return;
    const meta = `Preparar únicamente esta herramienta faltante: ${item}. Contexto de la necesidad: ${conversacion.objetivo}`.slice(0, 2000);
    agregar({ de: 'tu', tipo: 'texto', texto: `Crea la herramienta: ${item}` });
    setCreando(item);
    continuar({ ...conversacion, aclaraciones: [], ruta: 'definir', metaDefinir: meta });
  }

  function herramientaLista() {
    agregar({ de: 'capacita', tipo: 'texto', texto: '¡La herramienta nueva quedó probada y lista! Vuelvo a armar tu solución con ella…' });
    const estado = { ...conversacion, ruta: 'buscar', metaDefinir: null };
    setCreando(''); setEstadoCreacion(''); continuar(estado);
  }

  function renderMensaje(mensaje) {
    if (mensaje.de === 'tu' && mensaje.tipo === 'archivo') {
      return <div className="flex justify-end"><div className="max-w-[70%] rounded-2xl rounded-br-md bg-blue-700 p-2 text-sm text-white">
        {mensaje.vista && <img src={mensaje.vista} alt={`Archivo enviado: ${mensaje.nombre}`} className="max-h-48 rounded-xl object-contain" />}
        <p className="break-words px-2 py-1">📎 {mensaje.nombre}</p>
      </div></div>;
    }
    if (mensaje.de === 'tu') {
      return <div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-blue-700 px-4 py-2.5 text-sm text-white">{mensaje.texto}</p></div>;
    }
    const tarjeta = 'w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';
    switch (mensaje.tipo) {
      case 'texto': return <p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-sm text-slate-800">{mensaje.texto}</p>;
      case 'error': return <p role="alert" className="max-w-[90%] break-words rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-800">{mensaje.texto}</p>;
      case 'bloqueado': return <p className="max-w-[90%] rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">Para esto falta un recurso o permiso que Capacita todavía no tiene. No he creado ni ejecutado nada; puedes reformular tu necesidad.</p>;
      case 'consentimiento': return <div className={tarjeta}>
        <p className="font-semibold">Antes de empezar</p>
        <p className="mt-1 text-sm text-slate-600">Para entender tu necesidad usaré la IA de Google Gemini. Le enviaré lo que escribas en esta conversación y los nombres y contratos de las herramientas que encuentre (incluidas tus privadas). Nunca tus datos de ejecución ni código. Evita escribir datos sensibles: el nivel gratuito puede usar el contenido para mejorar sus productos.</p>
        <button type="button" disabled={consentimiento || ocupado} onClick={() => { setConsentimiento(true); resolver(mensaje.estado); }} className="mt-3 min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{consentimiento ? 'Aceptado' : 'Acepto, continuar'}</button>
      </div>;
      case 'preguntas': return <div className={tarjeta}>
        <p className="font-semibold">Necesito aclarar algo</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{mensaje.preguntas.map((pregunta, index) => <li key={index} className="break-words">{pregunta}</li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">Respóndeme abajo en un solo mensaje.</p>
      </div>;
      case 'faltan': return <div className={tarjeta}>
        <p className="font-semibold">🛠️ Me falta una herramienta para resolverlo</p>
        <p className="mt-1 text-sm text-slate-600">Puedo crearla, probarla en un entorno aislado y dejarla lista para ti. No estará disponible hasta superar las pruebas.</p>
        <ul className="mt-3 space-y-2">{mensaje.faltan.map((item, index) => <li key={index} className="rounded-xl bg-amber-50 p-3">
          <p className="break-words text-sm">{item}</p>
          <button type="button" disabled={ocupado} onClick={() => crearFaltante(item)} className="mt-2 min-h-11 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Créala</button>
        </li>)}</ul>
      </div>;
      case 'crear': return <FabricaHerramienta definition={mensaje.definicion} onEstado={setEstadoCreacion} onLista={herramientaLista} />;
      case 'plan': return <div className={tarjeta}><TarjetaPlan definition={mensaje.definicion} obtenerGuardada={obtenerGuardada} ocupadoExterno={Boolean(run && activo(run.status))} onEjecucion={alEjecutar} /></div>;
      case 'confirmar': return <div className={tarjeta}><TarjetaPlan definition={mensaje.definicion} datos={mensaje.datos} obtenerGuardada={obtenerGuardada} ocupadoExterno={Boolean(run && activo(run.status)) || mensaje.definicion !== plan} onEjecucion={alEjecutar} /></div>;
      case 'resultado': {
        const actual = run && run.id === mensaje.runId ? run : null;
        if (!actual && runId !== mensaje.runId) return <p className="text-sm text-slate-500">Ejecución anterior · <button type="button" className="text-blue-700 underline" onClick={() => onCambiarSeccion?.(`historial/${mensaje.runId}`)}>ver en Resultados</button></p>;
        return <div className={tarjeta}>
          <p className="font-semibold">{actual ? ESTADO_RUN[actual.status] || actual.status : 'Iniciando…'}</p>
          {actual?.status === 'queued' && <p className="mt-1 text-sm text-slate-600">Tu solicitud está guardada; empezará cuando el trabajador esté disponible.</p>}
          {actual?.output != null && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm"><ResultadoDatos value={actual.output} /></div>}
          {actual?.report?.error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{actual.report.error}. Los pasos que terminaron se conservan; revisa tus datos e inténtalo de nuevo.</p>}
          {actual && !activo(actual.status) && <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => onCambiarSeccion?.(`historial/${actual.id}`)}>Ver en Resultados</button>
            <button type="button" className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => { setPidiendo(null); entrada.current?.focus(); }}>Pedir otra cosa</button>
            {pidiendo && plan && <p className="basis-full text-xs text-slate-500">O escribe abajo otro dato para ejecutarla de nuevo.</p>}
          </div>}
        </div>;
      }
      default: return null;
    }
  }

  const vacio = !mensajes.length;
  return <section className="taller-pantalla" data-vista={vistaMovil} aria-label="Chat y taller de Capacita" data-task-busy={ocupado ? 'true' : undefined} data-trabajo-pendiente={conversacion ? 'true' : undefined}>
    <div className="taller-pestanas" role="tablist" aria-label="Vista">
      {[['chat', '💬 Chat'], ['taller', '🧩 Taller']].map(([valor, etiqueta]) => <button key={valor} type="button" role="tab" aria-selected={vistaMovil === valor} onClick={() => setVistaMovil(valor)}>{etiqueta}</button>)}
    </div>
    <div className="taller-chat">
      <div className="taller-mensajes" aria-live="polite">
        {vacio && <div className="taller-bienvenida">
          <p className="text-sm font-semibold text-blue-700">Hola, {usuario?.name?.split(' ')[0] || 'bienvenida'} 👋</p>
          <h1>¿Qué necesitas resolver hoy?</h1>
          <p>Cuéntamelo con tus palabras. Busco las herramientas que ya existen, creo las que falten y te muestro el proceso armándose a la derecha.</p>
          <div className="mt-4 flex flex-col gap-2">{SUGERENCIAS.map((sugerencia) => <button key={sugerencia} type="button" className="taller-sugerencia" onClick={() => { setTexto(sugerencia); entrada.current?.focus(); }}>{sugerencia}</button>)}</div>
        </div>}
        {mensajes.map((mensaje) => <div key={mensaje.id} className="taller-mensaje">{renderMensaje(mensaje)}</div>)}
        {ocupado && <p role="status" className="taller-escribiendo"><span className="taller-puntos" aria-hidden="true"><i /><i /><i /></span>{fase}</p>}
        <div ref={fin} />
      </div>
      {campoActual && <div className="flex items-center justify-between gap-2 px-1 pb-1 text-xs text-slate-600">
        <span className="break-words">{campoActual.archivo ? '📎' : '✍️'} Esperando: {campoActual.etiqueta}</span>
        <button type="button" className="shrink-0 rounded-lg px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50" onClick={() => { setPidiendo(null); entrada.current?.focus(); }}>Pedir otra cosa</button>
      </div>}
      <form onSubmit={enviar} className="taller-compositor">
        <input ref={selector} type="file" className="sr-only" tabIndex={-1} aria-hidden="true"
          accept={campoActual?.archivo ? infoTipo(campoActual.archivo).acepta : 'image/*,.pdf,.docx,.xlsx'}
          onChange={(event) => { recibirArchivo(event.target.files?.[0]); event.target.value = ''; }} />
        <button type="button" className="taller-adjuntar" disabled={ocupado || leyendo} onClick={() => selector.current?.click()}
          aria-label={campoActual?.archivo ? `Subir ${campoActual.etiqueta}` : 'Adjuntar foto, PDF, Word o Excel'} title="Adjuntar archivo">{leyendo ? '⏳' : '📎'}</button>
        <label htmlFor="taller-entrada" className="sr-only">Escribe tu necesidad</label>
        <textarea id="taller-entrada" ref={entrada} rows={2} maxLength={2000} value={texto} disabled={ocupado} onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) enviar(event); }}
          placeholder={pendientes.length ? 'Responde a mis preguntas…' : campoActual ? (campoActual.archivo ? `Sube ${campoActual.etiqueta} con 📎` : `Escribe aquí: ${campoActual.etiqueta}`) : 'Ej.: mejora la foto de mi plato y ponle el nombre de mi restaurante…'} />
        <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar">➤</button>
      </form>
    </div>
    <aside className="taller-lienzo" aria-label="Taller">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-slate-900">🧩 Taller</p>
        {(plan || creando) && <p className="text-xs text-slate-500">{creando ? (ESTADOS_NODO[estadoCreacion] || ESTADOS_NODO.creando).texto : run ? ESTADO_RUN[run.status] || run.status : 'Plan listo · toca un paso para ver detalles'}</p>}
      </div>
      <div className="min-h-0 flex-1"><LienzoTaller definicion={plan} creando={creando} estadoCreacion={estadoCreacion} estados={estados} seleccionado={seleccionado} onSeleccionar={setSeleccionado} /></div>
      {nodoElegido && <div className="taller-detalle">
        <div className="flex items-start justify-between gap-2">
          <p className="break-words font-semibold">{nodoElegido.label}</p>
          <button type="button" className="text-sm text-slate-500" onClick={() => setSeleccionado(null)} aria-label="Cerrar detalle">✕</button>
        </div>
        <p className="mt-1 text-xs text-slate-600">{(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).icono} {(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).texto} · {Object.values(nodoElegido.bindings || {}).some((binding) => binding.source !== '$input') ? 'usa el resultado del paso anterior' : 'usa tus datos'}</p>
        {Object.keys(nodoElegido.parameters || {}).length > 0 && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Opciones</p><ResultadoDatos value={nodoElegido.parameters} /></div>}
        {pasoElegido?.output != null && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Lo que produjo</p><ResultadoDatos value={pasoElegido.output} /></div>}
        {pasoElegido?.error && <p className="mt-2 break-words text-sm text-red-700">{pasoElegido.error}</p>}
      </div>}
    </aside>
  </section>;
}
