import { useCallback, useEffect, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { api } from '../../api';
import { buscarOpcionesPlan, proponerPlan } from '../../services/planner';
import { ajustarOpciones, interpretarObjetivo, investigar } from '../../services/objetivos';
import { ajusteDirecto, opcionesEditables } from './ajustes';
import { guardarWorkflow } from '../../services/workflows';
import { camposChat } from '../../utils/formularioDatos';
import { etiquetaLegible } from '../../utils/etiquetas';
import { infoTipo, leerArchivo, urlDatos } from '../../utils/archivos';
import FabricaHerramienta from './FabricaHerramienta';
import ResultadoDatos from '../common/ResultadoDatos';
import LienzoTaller from './LienzoTaller';
import { ESTADOS_NODO, etapaActual } from './estadosNodo';
import RutaTaller from './RutaTaller';

// Ideas para empezar, en el estilo de las píldoras del login (dato ⇄ herramienta).
// Solo rellenan la caja de texto: la persona revisa y envía.
const SUGERENCIAS = [
  { de: 'Foto', a: 'Quitar fondo', texto: 'Quita el fondo de la foto de mi producto', tono: 'azul' },
  { de: 'Recibo', a: 'Tabla', texto: 'Lee el texto de la foto de este recibo y pásalo a una tabla', tono: 'cian' },
  { de: 'Excel', a: 'Gráfico', texto: 'Haz un gráfico con los datos de mi Excel de ventas', tono: 'indigo' },
  { de: 'Clima', a: 'Telegram', texto: 'Mándame a Telegram el clima de mañana en mi ciudad', tono: 'cian' },
];
// Saludos y «¿qué puedes hacer?» se responden aquí, sin IA ni búsqueda en internet: antes
// pasaban por la investigación y Gemini contestaba «soy un modelo de lenguaje de Google».
const SALUDO = /^(hola+|holi|buenas( tardes| noches)?|buenos dias|hey|que tal|saludos)\b[\s,.!¡¿?]*/;
const PREGUNTA_GENERAL = /(que (puedes|sabes|podes) hacer|que haces|quien eres|que eres|como funcionas|como funciona( esto)?|para que sirves|en que me (puedes )?ayudar|que me ofreces|^ayuda$)/;
function esPreguntaGeneral(valor) {
  const plano = valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[¿?¡!.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const resto = plano.replace(SALUDO, '').trim();
  return resto.length < 4 || (plano.length <= 90 && PREGUNTA_GENERAL.test(resto));
}
const PUEDO = [
  { icono: 'globo', titulo: 'Consultar datos', texto: 'clima y lluvia, festivos, dólar y monedas, más de 30 fuentes abiertas.' },
  { icono: 'chispa', titulo: 'Escribir con IA', texto: 'promociones, resúmenes, traducciones; leer fotos y facturas.' },
  { icono: 'herramienta', titulo: 'Crear herramientas', texto: 'quitar fondos, gráficos de tu Excel, PDF y Word; se prueban aisladas.' },
  { icono: 'enviar', titulo: 'Enviarte el resultado', texto: 'a tu Telegram, tu correo, tu Drive o tu calendario, con tu aprobación.' },
  { icono: 'reloj', titulo: 'Hacerlo solo', texto: 'repite una solución cada día o cada semana a la hora que digas.' },
];
const EJEMPLOS_PRESENTACION = [
  'Revisa el pronóstico de lluvia de Valledupar esta semana, escribe una promoción para mi restaurante y mándamela por Telegram',
  'Lee la foto de esta factura y resúmeme proveedor, fecha y total',
];
import TarjetaPlan from './TarjetaPlan';
import TarjetaInvestigacion from './TarjetaInvestigacion';
import TextoConFormato from '../common/TextoConFormato';
import { limpiarMensaje } from '../../utils/textoFormato';
import { solucionDeVersion, solucionGuardadaDe, versionLista } from './solucionDirecta';
import { herramientasParecidas } from './parecidas';

const ESTADO_RUN = { queued: 'En cola: esperando al trabajador', running: 'Trabajando en tu solución…', completed: '¡Listo! Aquí está tu resultado', failed: 'La solución no pudo terminar', interrupted: 'El trabajo se interrumpió' };
const activo = (status) => ['queued', 'running'].includes(status);
// El «Acepto» de Gemini se recuerda por cuenta en este navegador (se puede retirar desde la
// bienvenida). Sin almacenamiento disponible se vuelve a pedir: nunca se da por aceptado.
const CLAVE_GEMINI = (id) => `capacita:consentimiento-gemini:${id || 'anonimo'}`;
function leerConsentimiento(id) {
  try { return localStorage.getItem(CLAVE_GEMINI(id)) === 'si'; } catch { return false; }
}
function recordarConsentimiento(id, valor) {
  try { if (valor) localStorage.setItem(CLAVE_GEMINI(id), 'si'); else localStorage.removeItem(CLAVE_GEMINI(id)); } catch { /* vale solo en esta pestaña */ }
}
// Herramientas parecidas a lo pedido (por raíz de palabra): ver ./parecidas.js.

// Pasos que consultan un servicio externo (sello globo): version_id → proveedor («Open-Meteo»).
const SIN_CONECTORES = new Map();
// ia: el paso envía tu contenido a una IA externa (exige un «Acepto» propio al aprobar).
const conectorDe = (item) => {
  const [, tipo, proveedor] = /^Conector (externo|de IA|de acción) \(([^)]+)\)/.exec(item.description || '') || [];
  return { proveedor: proveedor || 'Servicio externo', ia: tipo === 'de IA', accion: tipo === 'de acción' };
};
const mapaConectores = (items) => new Map(items.filter((item) => item.profile === 'connector-v1').map((item) => [item.id, conectorDe(item)]));

// Errores del trabajador en palabras. detail es un código fijo (nunca el valor que escribió la persona).
const DATO = {
  ciudad: 'la ciudad', ciudad_no_encontrada: 'la ciudad (no la encontré)', fecha: 'la fecha', fecha_inicio: 'la fecha inicial',
  fecha_fin: 'la fecha final', rango_fechas: 'las fechas (hasta un año y no en el futuro)', dias: 'los días', pais: 'el país',
  anio_pais: 'el año o el país', pais_sin_datos: 'el país (no hay datos)', monto_moneda: 'el monto o las monedas',
  moneda_origen: 'la moneda de origen', moneda_destino: 'la moneda de destino', referencia: 'la referencia',
  sin_datos: 'los datos (el servicio no tiene información para eso)', texto: 'el texto (está vacío)',
  texto_muy_largo: 'el texto (es muy largo: máximo 30.000 caracteres)', foto: 'la foto (debe ser JPG o PNG)',
  campos: 'los datos a sacar (sepáralos con comas, máximo 20)', indicaciones: 'las indicaciones', instruccion: 'qué hacer',
  mensaje: 'el mensaje (está vacío)', mensaje_muy_largo: 'el mensaje (máximo 12.000 caracteres)',
  archivo: 'el archivo (no se pudo leer o pesa más de 4,5 MB)', titulo: 'el título', hora: 'la hora (HH:MM)',
  duracion_minutos: 'la duración (de 5 a 1440 minutos)',
  // Biblioteca de APIs abiertas
  tema: 'el tema (escríbelo de forma más corta)', busqueda: 'lo que buscas', palabra: 'la palabra (solo letras)',
  idioma: 'el idioma', cantidad: 'cuántos resultados (de 1 a 10)', relacion: 'qué tipo de palabras buscar',
  de: 'el idioma de origen', a: 'el idioma de destino (debe ser distinto al de origen)', lugar: 'el lugar (no lo encontré en el mapa)',
  magnitud_minima: 'la magnitud (de 0 a 10)', que: 'qué lugar buscar cerca', radio_metros: 'el radio (de 200 a 3.000 metros)',
  indicador: 'el indicador', monedas: 'las criptomonedas (por ejemplo: bitcoin, ethereum)', producto: 'el producto o código de barras',
  medicamento: 'el medicamento (nombre genérico en inglés, por ejemplo ibuprofen)', plato: 'el plato', artista: 'el artista',
  equipo: 'el equipo',
};
// Respuestas de la IA que no dependen de un dato concreto.
const DETALLES_IA = {
  contenido_bloqueado: 'La IA no quiso procesar ese contenido (lo marcó como sensible). Prueba con otro texto o foto',
  respuesta_muy_larga: 'La respuesta de la IA salía demasiado larga. Prueba con un texto más corto',
  telegram_no_vinculado: 'Primero conecta tu Telegram en Configuración (sección «Telegram») y vuelve a ejecutarlo',
  google_no_vinculado: 'Primero conecta tu cuenta de Google en Configuración (sección «Google») y vuelve a ejecutarlo',
  cupo_traduccion: 'Se acabó el cupo gratuito de traducción de hoy. Pídele la traducción a la IA o inténtalo mañana',
};
const ERRORES = {
  connector_provider_unavailable: 'El servicio externo no respondió. Intenta de nuevo en unos minutos',
  connector_not_found: 'El servicio externo no tiene datos para eso',
  connector_provider_busy: 'El servicio externo está recibiendo muchas consultas. Espera un minuto y vuelve a intentarlo',
  connector_provider_rejected: 'El servicio externo rechazó la consulta; revisa los datos',
  connector_invalid_response: 'El servicio externo respondió algo que no pude leer',
  connector_mismatch: 'Este conector no coincide con el revisado en Capacita; avisa al equipo',
  input_contract: 'Algún dato no tiene el formato esperado', output_contract: 'El resultado no tuvo el formato esperado',
  sandbox_unavailable: 'El entorno de ejecución no está disponible; revisa que el trabajador esté encendido',
  connector_not_configured: 'Este paso necesita una clave de servicio que no está configurada en el trabajador',
  connector_quota: 'Se alcanzó el tope de usos de IA por hora en Capacita. Intenta de nuevo más tarde',
};
function explicarError(report) {
  const paso = report?.steps?.find((step) => step.status === 'failed');
  if (paso?.error === 'connector_input' && DETALLES_IA[paso.detail]) return DETALLES_IA[paso.detail];
  // input_contract trae el campo que no encajó (su nombre, nunca el valor): se nombra en vez de un error genérico.
  if (paso?.error === 'connector_input' || (paso?.error === 'input_contract' && paso.detail)) {
    return `Revisa ${DATO[paso.detail] || (paso.detail ? `«${etiquetaLegible(paso.detail)}»` : 'los datos')} en el paso «${paso.label}»`;
  }
  const codigo = paso?.error || report?.error;
  return ERRORES[codigo] || (paso ? `Falló el paso «${paso.label}»` : codigo);
}

// Respuestas para saltar un archivo opcional (logo, plantilla…).
const SALTAR = /^\s*(no|nop|sin|ninguno|omitir|saltar|no tengo|despu[eé]s|as[ií] est[aá] bien)/i;

/**
 * Pantalla principal: conversación a la izquierda y taller visual a la derecha.
 * Orquesta las APIs existentes (planner, interpretación, laboratorio y workflows):
 * busca primero en el catálogo autorizado, propone, crea lo que falta y ejecuta.
 */
export default function ChatTaller({ usuario, onCambiarSeccion, abrir = [] }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [consentimiento, setConsentimiento] = useState(() => leerConsentimiento(usuario?.id));
  // Copia inmediata del consentimiento: las acciones que siguen al «Acepto» corren antes del render.
  const consentido = useRef(consentimiento);
  function aceptarGemini(valor) {
    consentido.current = valor; setConsentimiento(valor); recordarConsentimiento(usuario?.id, valor);
  }
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
  // Mientras una herramienta está «en prueba», lo que se escribe la ajusta («ponle 30 %»).
  const ajustador = useRef(null);
  // «Créalas todas»: herramientas que faltan por crear, una tras otra, en modo automático.
  const cola = useRef([]), automatico = useRef(false);
  // Versiones creadas en esta necesidad: al rearmar el plan se ofrecen siempre al planner y,
  // si aun así no las combina, se usan directamente en vez de diseñar un duplicado.
  const recienCreadas = useRef([]);
  // Para ajustar un resultado: contratos de las versiones del plan y el último archivo usado.
  const opcionesPlan = useRef([]), ultimoArchivo = useRef(null);
  // Qué pasos del plan son conectores (sello globo); se recalcula cada vez que cambian las opciones.
  const [conectores, setConectores] = useState(SIN_CONECTORES);
  function fijarOpciones(items) { opcionesPlan.current = items; setConectores(mapaConectores(items)); }
  const registrarAjustador = useCallback((fn, previo) => {
    if (fn) ajustador.current = fn;
    else if (ajustador.current === previo) ajustador.current = null;
  }, []);
  const campoActual = plan && pidiendo ? pidiendo.campos[pidiendo.indice] : null;
  const solucion = useRef({ definicion: null, guardada: null, incierta: false });

  const agregar = useCallback((mensaje) => setMensajes((old) => [...old, { id: ++siguienteId.current, ...mensaje }]), []);
  useEffect(() => () => peticion.current?.abort(), []);

  // Opciones (contratos) de las versiones de una solución abierta desde el menú, para poder
  // ajustarla escribiendo. Sin Gemini: solo el catálogo autorizado de versiones.
  // Versiones habilitadas (con sus contratos) a partir de sus ids, desde el catálogo autorizado.
  async function buscarVersiones(ids) {
    const faltan = new Set(ids);
    const encontradas = [];
    let cursor = null;
    for (let pagina = 0; pagina < 3 && faltan.size; pagina++) {
      const page = await api(`/workflows/available-versions?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      for (const item of page.items) if (faltan.delete(item.id)) encontradas.push(item);
      cursor = page.next_cursor;
      if (!cursor) break;
    }
    return encontradas;
  }
  async function cargarOpcionesDe(definicion) {
    // Sin opciones: ajustarPlan lo explica si la persona intenta ajustar.
    fijarOpciones(await buscarVersiones(definicion.nodes.map((nodo) => nodo.version_id)).catch(() => []));
  }

  // Desde Soluciones o Herramientas: abrir una solución guardada o dejar escrito un pedido.
  // Una sola vez (también en StrictMode); abrir una solución no usa Gemini ni la vuelve a guardar.
  const abierto = useRef(false);
  useEffect(() => {
    const [tipo, valor] = abrir;
    if (abierto.current || !valor) return;
    abierto.current = true;
    if (tipo === 'usar') {
      try { setTexto(decodeURIComponent(valor).slice(0, 2000)); } catch { /* texto inválido: se ignora */ }
      entrada.current?.focus();
      return;
    }
    if (tipo === 'herramienta') { abrirHerramienta(valor); return; }
    if (tipo !== 'solucion') return;
    api(`/workflows/${encodeURIComponent(valor)}`).then((guardada) => {
      abrirSolucion(guardada.definition, guardada, `Abrí tu solución «${guardada.definition.name}». Revisa sus pasos en el taller; te pido los datos para usarla`);
      cargarOpcionesDe(guardada.definition);
    }).catch((cause) => agregar({ de: 'capacita', tipo: 'error', texto: `${cause.message} Puedes describir tu necesidad aquí.` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // guardada: la solución ya guardada, o null si se guarda al ejecutarla por primera vez.
  function abrirSolucion(definicion, guardada, aviso) {
    solucion.current = { definicion, guardada, incierta: false };
    setPlan(definicion);
    setConversacion({ objetivo: definicion.name, aclaraciones: [], ruta: 'buscar', metaDefinir: null });
    agregar({ de: 'capacita', tipo: 'texto', texto: aviso });
    agregar({ de: 'capacita', tipo: 'plan', definicion });
    empezarDatos(definicion);
  }

  // «Usar» desde Mis herramientas: sin IA ni búsqueda en internet. Si ya tiene una solución de
  // un paso guardada, se reutiliza; si no, se arma y se guarda al ejecutarla.
  async function abrirHerramienta(capacidadId) {
    setOcupado(true); setFase('Abriendo tu herramienta…');
    try {
      const version = await versionLista(capacidadId);
      const definicion = version && solucionDeVersion(version);
      if (!definicion) {
        agregar({ de: 'capacita', tipo: 'texto', texto: version
          ? 'Esta herramienta no entrega un resultado que el chat pueda mostrarte, así que no puedo usarla desde aquí. Cuéntame qué necesitas y busco o creo una que sí sirva'
          : 'Esta herramienta todavía no tiene una versión probada que se pueda usar. Cuéntame qué necesitas y busco o creo una que sí funcione' });
        return;
      }
      fijarOpciones([version]);
      const guardada = await solucionGuardadaDe(version.id).catch(() => null);
      const ajena = version.owner_id && usuario?.id && version.owner_id !== usuario.id;
      abrirSolucion(guardada?.definition || definicion, guardada,
        `Abrí ${ajena ? 'la herramienta de la comunidad' : 'tu herramienta'} «${version.name}». No necesito la IA para usarla: te pido los datos y la ejecuto`);
    } catch (cause) {
      agregar({ de: 'capacita', tipo: 'error', texto: `${cause.message} Puedes describir tu necesidad aquí.` });
    } finally { setOcupado(false); setFase(''); }
  }
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
    ajustador.current = null;
    setPlan(null); setCreando(''); setEstadoCreacion(''); setRun(null); setRunId(null); setSeleccionado(null); setPendientes([]); setPidiendo(null);
  }

  // Se guarda una sola vez por plan, aunque se ejecute varias veces con datos distintos.
  async function obtenerGuardada() {
    const actual = solucion.current;
    if (actual.definicion !== plan) solucion.current = { definicion: plan, guardada: null, incierta: false, base: null };
    if (solucion.current.guardada) return solucion.current.guardada;
    if (solucion.current.incierta) throw new Error('No pudimos confirmar si la solución se guardó. Revísala en Mi biblioteca antes de crear otra copia.');
    try {
      // Una solución ajustada («ponle 50 %») actualiza la guardada en vez de duplicarla.
      solucion.current.guardada = await guardarWorkflow(plan, solucion.current.base || undefined);
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
    if (campo.opcional) {
      agregar({ de: 'capacita', tipo: 'texto', texto: `Si quieres personalizarla, sube ${campo.etiqueta} (${infoTipo(campo.archivo).nombre}) con el botón del clip. Es opcional: si no, escribe «no»` });
      return;
    }
    agregar({ de: 'capacita', tipo: 'texto', texto: campo.archivo ? `${inicio}: ${campo.etiqueta} (${infoTipo(campo.archivo).nombre}). Súbelo con el botón del clip de abajo` : `${inicio}: ${campo.etiqueta}${campo.ayuda ? ` (${campo.ayuda})` : ''}. Escríbelo abajo` });
  }

  // Tras ejecutar, un dato nuevo vuelve a empezar la recogida para ejecutarla otra vez.
  const estadoParaDato = () => (pidiendo.indice >= pidiendo.campos.length ? { ...pidiendo, indice: 0, datos: {} } : pidiendo);

  function recibirDato(valor) {
    const estado = estadoParaDato(), campo = estado.campos[estado.indice];
    agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
    if (campo.archivo) {
      if (campo.opcional && SALTAR.test(valor)) { pedirSiguiente({ ...estado, indice: estado.indice + 1 }); return; }
      setPidiendo(estado);
      agregar({ de: 'capacita', tipo: 'texto', texto: campo.opcional ? `Para ${campo.etiqueta} súbelo con el botón del clip, o escribe «no» si prefieres seguir sin él.` : `Aquí necesito un archivo: ${campo.etiqueta}. Súbelo con el botón del clip de abajo` });
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
      ultimoArchivo.current = archivo;
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
      agregar({ de: 'capacita', tipo: 'texto', texto: `Ahora necesito: ${campo.etiqueta}. Escríbelo abajo` });
      return;
    }
    // Aún no hay solución: se guarda y se usa cuando la solución pida un archivo.
    setAdjunto(archivo);
    agregar({ de: 'tu', tipo: 'archivo', nombre: archivo.name, vista: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null });
    agregar({ de: 'capacita', tipo: 'texto', texto: 'Recibí tu archivo. Cuéntame qué quieres hacer con él.' });
  }

  function empezarDatos(definicion) {
    // En una solución solo llegan a los pasos los datos obligatorios (las conexiones desde la
    // entrada exigen campos obligatorios): pedir un logo opcional sería pedir algo que se ignora.
    const campos = camposChat(definicion.input_schema)?.filter((campo) => !campo.opcional);
    if (!campos?.length) { setPidiendo(null); return; }
    const estado = { definicion, campos, indice: 0, datos: {} };
    if (adjunto && campos[0].archivo) {
      agregar({ de: 'capacita', tipo: 'texto', texto: `Uso el archivo que me enviaste (${adjunto.name}).` });
      const archivo = adjunto; setAdjunto(null); usarArchivo(archivo, estado);
      return;
    }
    pedirSiguiente(estado);
  }

  // mejorando: nombre de la herramienta que se está mejorando. La versión mejorada conserva ese
  // nombre para que «Mis herramientas» las agrupe como versiones de la misma.
  function mostrarDefinicion(value, objetivoDefinido, mejorando) {
    const interpretation = value.interpretation;
    if (value.research) agregar({ de: 'capacita', tipo: 'investigacion', investigacion: value.research });
    if (interpretation?.explanation) agregar({ de: 'capacita', tipo: 'texto', texto: interpretation.explanation });
    const aclarar = interpretation?.decision === 'clarify';
    if (aclarar) {
      setPendientes(interpretation.questions); agregar({ de: 'capacita', tipo: 'preguntas', preguntas: interpretation.questions });
    } else if (value.definition) {
      const definicion = mejorando ? { ...value.definition, name: mejorando } : value.definition;
      setCreando(definicion.name); setEstadoCreacion(''); setPlan(null);
      agregar({ de: 'capacita', tipo: 'crear', definicion, automatica: automatico.current });
    } else {
      agregar({ de: 'capacita', tipo: 'bloqueado' });
      falloEnCola();
    }
    // La mejora sigue solo mientras se responden sus preguntas; si ya se mostró o se bloqueó,
    // lo siguiente (otra herramienta, rearmar el plan) no debe heredar su nombre.
    setConversacion((old) => ({ ...old, ruta: 'definir', metaDefinir: objetivoDefinido, ...(aclarar ? {} : { mejorando: undefined }) }));
  }

  // Si la IA aún no da turno tras el planner (5 s entre llamadas), espera una vez y reintenta.
  async function disenarTrasPlan(objetivo, aclaraciones, signal, investigacion) {
    for (let intento = 0; ; intento += 1) {
      try { return await interpretarObjetivo(objetivo, aclaraciones, true, signal, investigacion); } catch (cause) {
        if (cause.status !== 429 || intento >= 1 || signal.aborted || (cause.retryAfter || 0) > 15) throw cause;
        setFase('Esperando turno con la IA (unos segundos)…');
        await new Promise((resolve) => { setTimeout(resolve, ((cause.retryAfter || 5) + 1) * 1000); });
        if (signal.aborted) throw cause;
        setFase('Con lo que investigué, diseño una herramienta nueva…');
      }
    }
  }

  // Antes de diseñar algo nuevo: buscar en internet cómo se hace bien. Una vez por
  // conversación; las aclaraciones y herramientas que falten lo reutilizan. Si tus herramientas
  // ya lo resuelven no se busca: usarlas no es hacer algo nuevo y la búsqueda tarda y gasta cuota.
  async function investigarPrimero(estado, signal) {
    if (estado.investigacion !== undefined) return estado.investigacion;
    setFase('Antes de crearla, investigo en internet cómo se hace bien…');
    let resultado = null;
    try { resultado = await investigar(estado.objetivo.slice(0, 2000), signal); } catch (cause) { if (signal.aborted) throw cause; }
    if (signal.aborted) return null;
    if (resultado) agregar({ de: 'capacita', tipo: 'investigacion', investigacion: resultado });
    else agregar({ de: 'capacita', tipo: 'texto', texto: 'No pude buscar en internet en este momento; sigo con lo que ya sé.' });
    const investigacion = resultado?.summary || null;
    setConversacion((old) => (old ? { ...old, investigacion } : old));
    return investigacion;
  }

  async function resolver(estado) {
    const { objetivo, aclaraciones, ruta, metaDefinir } = estado;
    const completo = [objetivo, ...aclaraciones.map((item) => `${item.question}: ${item.answer}`)].join('\n');
    if (completo.length > 2000) { agregar({ de: 'capacita', tipo: 'error', texto: 'Tu necesidad y respuestas superan 2.000 caracteres. Resúmelas un poco y vuelve a escribir.' }); return; }
    const controller = new AbortController(); peticion.current?.abort(); peticion.current = controller;
    setOcupado(true); setPendientes([]);
    // Diseñar una herramienta nueva: primero se investiga (una vez) y luego se diseña con eso.
    // conEspera: justo después del planner la IA puede pedir unos segundos de turno.
    const disenar = async (meta, texto, conEspera = false) => {
      const investigacion = await investigarPrimero(estado, controller.signal);
      if (controller.signal.aborted) return;
      setFase(texto);
      const value = conEspera ? await disenarTrasPlan(meta, aclaraciones, controller.signal, investigacion)
        : await interpretarObjetivo(meta, aclaraciones, true, controller.signal, investigacion);
      if (!controller.signal.aborted) mostrarDefinicion(value, meta, estado.mejorando);
    };
    try {
      if (ruta === 'definir') {
        await disenar(metaDefinir || objetivo, 'Con lo que investigué, diseño la herramienta…');
        return;
      }
      setFase('Buscando en tus herramientas y en las de la comunidad…');
      const opciones = await buscarOpcionesPlan(completo, controller.signal, 'text', true);
      if (controller.signal.aborted) return;
      // La búsqueda por texto no siempre encuentra lo que se acaba de crear: se agrega primero.
      let items = opciones.items;
      const faltantes = recienCreadas.current.filter((id) => !items.some((item) => item.id === id));
      if (faltantes.length) items = [...await buscarVersiones(faltantes).catch(() => []), ...items];
      if (controller.signal.aborted) return;
      fijarOpciones(items); // contratos de cada versión, para ajustar después
      // Si el planner no logra usar lo recién creado, se usa directo: diseñar otra sería un duplicado.
      const usarRecienCreada = () => {
        const version = items.find((item) => recienCreadas.current.includes(item.id));
        const definicion = version && solucionDeVersion(version);
        if (!definicion) return false;
        fijarOpciones([version]);
        abrirSolucion(definicion, null, `Uso «${version.name}», la herramienta que acabamos de crear. Te pido los datos`);
        return true;
      };
      if (soloCatalogo(estado) && !recienCreadas.current.length) {
        // Reutilizar sin IA: si hay herramientas que encajan con lo que escribió, se ofrecen.
        const atajos = herramientasParecidas(items, objetivo, solucionDeVersion);
        if (atajos.length) { agregar({ de: 'capacita', tipo: 'atajo', atajos, estado }); return; }
      }
      // Lo que sigue (planner, investigación, diseño) sí usa la IA: se pide el «Acepto».
      if (!consentimiento && !consentido.current) {
        agregar({ de: 'capacita', tipo: 'consentimiento', estado: { ...estado, saltarAtajo: true } });
        return;
      }
      if (!items.length) {
        await disenar(objetivo, 'No tenías herramientas para esto. Con lo que investigué, diseño una nueva…');
        return;
      }
      setFase(`Reviso ${items.length} pieza${items.length === 1 ? '' : 's'} disponibles, elijo las que sirven y armo tu proceso…`);
      let proposal;
      try {
        ({ proposal } = await proponerPlan(completo, items.slice(0, 100), controller.signal, 'text', true));
      } catch (cause) {
        // El plan no pasó la revisión ni con los reintentos del backend. Antes se saltaba a diseñar
        // una herramienta nueva, que no puede enviar ni consultar servicios y terminaba en «Aquí me
        // detengo». Ahora se ofrece reintentar (suele salir) o, si la persona quiere, diseñar una.
        if (controller.signal.aborted || cause.status !== 502) throw cause;
        if (usarRecienCreada()) return;
        agregar({ de: 'capacita', tipo: 'planFallo', estado });
        return;
      }
      if (controller.signal.aborted) return;
      agregar({ de: 'capacita', tipo: 'texto', texto: proposal.explanation });
      if (proposal.decision === 'clarify') {
        setPendientes(proposal.questions); agregar({ de: 'capacita', tipo: 'preguntas', preguntas: proposal.questions });
      } else if (proposal.definition) {
        setPlan(proposal.definition); setCreando('');
        // Lista de verificación: cada cosa que pidió la persona y si el plan la cumple (antes de aprobar).
        if (proposal.requisitos?.length > 1) agregar({ de: 'capacita', tipo: 'requisitos', requisitos: proposal.requisitos, pendientes: proposal.pendientes || [] });
        agregar({ de: 'capacita', tipo: 'plan', definicion: proposal.definition });
        empezarDatos(proposal.definition);
      } else if (proposal.decision === 'create') {
        agregar({ de: 'capacita', tipo: 'faltan', faltan: proposal.missing });
      } else {
        // "blocked": la IA ya explicó arriba qué falta. Antes se saltaba a fabricar una herramienta,
        // que no puede enviar ni consultar servicios y terminaba igual en «Aquí me detengo» tras
        // gastar búsqueda y cuota. Ahora la persona elige: reformular o intentar crear una.
        if (usarRecienCreada()) return;
        agregar({ de: 'capacita', tipo: 'planFallo', estado, bloqueado: true });
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        // Reintentar reenvía el MISMO pedido (antes, escribir «intenta de nuevo» se tomaba como un pedido nuevo).
        agregar({ de: 'capacita', tipo: 'error', texto: `${cause.message} Tu conversación sigue aquí.`, reintentar: estado }); falloEnCola();
        setConversacion((old) => (old ? { ...old, mejorando: undefined } : old));
      }
    } finally {
      if (!controller.signal.aborted) { setOcupado(false); setFase(''); }
    }
  }

  // Buscar en el catálogo no usa la IA: el primer paso de una necesidad nueva corre sin el
  // «Acepto» y, si una herramienta tuya ya sirve, se ofrece antes de gastar IA.
  const soloCatalogo = (estado) => estado.ruta === 'buscar' && !estado.aclaraciones.length && !estado.saltarAtajo;
  function continuar(estado) {
    setConversacion(estado);
    if (!soloCatalogo(estado) && !consentimiento && !consentido.current) { agregar({ de: 'capacita', tipo: 'consentimiento', estado }); return; }
    resolver(estado);
  }

  function enviar(event) {
    event?.preventDefault();
    const valor = texto.trim();
    if (ocupado || !valor) return;
    // Un dato se entrega tal cual lo escribió la persona (sin recortar espacios).
    // Con los datos ya entregados y una solución que recibe un archivo, lo escrito es un
    // ajuste del resultado («bájale al 50 %»), no un dato nuevo.
    if (pidiendo && plan && !pendientes.length && pidiendo.indice >= pidiendo.campos.length && pidiendo.campos[0]?.archivo) {
      agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
      ajustarPlan(valor);
      return;
    }
    if (pidiendo && plan && !pendientes.length) { recibirDato(texto); return; }
    // Herramienta «en prueba»: la frase la ajusta; la tarjeta muestra el nuevo resultado.
    if (ajustador.current && !pendientes.length) {
      const ajustar = ajustador.current; setTexto('');
      // Si el intento anterior aún corre, el texto vuelve al cuadro para no perderlo.
      ajustar(valor).then((resultado) => { if (resultado === 'nuevo') nuevaNecesidad(valor); else if (resultado === 'ocupado') setTexto((actual) => actual || valor); });
      return;
    }
    if (!pendientes.length && esPreguntaGeneral(valor)) {
      agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
      agregar({ de: 'capacita', tipo: 'presentacion' });
      return;
    }
    if (!pendientes.length && valor.length < 10) { agregar({ de: 'capacita', tipo: 'texto', texto: 'Cuéntame un poco más: qué datos tienes y qué resultado buscas.' }); return; }
    agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
    if (pendientes.length && conversacion) {
      const respuesta = { question: pendientes.join(' / '), answer: valor };
      continuar({ ...conversacion, aclaraciones: [...conversacion.aclaraciones, respuesta].slice(-6) });
    } else {
      nuevaNecesidad(valor, false);
    }
  }

  function nuevaNecesidad(valor, mostrar = true) {
    if (mostrar) agregar({ de: 'tu', tipo: 'texto', texto: valor });
    nuevoTaller(); recienCreadas.current = [];
    // Solo se cuenta el tipo de archivo adjunto, nunca su contenido.
    const tipoAdjunto = !adjunto ? '' : adjunto.type.startsWith('image/') ? 'una foto' : adjunto.name.toLowerCase().endsWith('.pdf') ? 'un PDF'
      : adjunto.name.toLowerCase().endsWith('.docx') ? 'un documento Word' : adjunto.name.toLowerCase().endsWith('.xlsx') ? 'un Excel' : 'un archivo';
    continuar({ objetivo: tipoAdjunto ? `${valor}\n(Adjunté ${tipoAdjunto} como entrada.)` : valor, aclaraciones: [], ruta: 'buscar', metaDefinir: null });
  }

  function crearTodas(items) {
    if (ocupado || automatico.current || !conversacion || !items.length) return;
    automatico.current = true; cola.current = items.slice(1);
    agregar({ de: 'capacita', tipo: 'texto', texto: `Voy a crear y probar las ${items.length} herramientas una por una. Al final armo tu solución con todas` });
    crearFaltante(items[0]);
  }

  // Una herramienta de la cola no salió: se detiene y se dice qué quedó pendiente.
  function falloEnCola() {
    if (!automatico.current) return;
    const pendientesCola = cola.current;
    automatico.current = false; cola.current = [];
    agregar({ de: 'capacita', tipo: 'texto', texto: `Me detuve aquí: esta herramienta no salió.${pendientesCola.length ? ` Quedan pendientes: ${pendientesCola.join(' · ')}.` : ''} Puedes reintentarla con el botón de la tarjeta o describirme la necesidad de otra forma.` });
  }

  function crearFaltante(item) {
    if (ocupado || !conversacion) return;
    const meta = `Preparar únicamente esta herramienta faltante: ${item}. Contexto de la necesidad: ${conversacion.objetivo}`.slice(0, 2000);
    agregar({ de: 'tu', tipo: 'texto', texto: `Crea la herramienta: ${item}` });
    setCreando(item);
    continuar({ ...conversacion, aclaraciones: [], ruta: 'definir', metaDefinir: meta, mejorando: undefined });
  }

  // La persona no quiere solo otros valores: pide que la herramienta haga algo más.
  // Ajusta las opciones de los pasos de la solución y la vuelve a proponer con los mismos datos.
  async function ajustarPlan(valor) {
    const pasos = plan.nodes.map((nodo) => ({ nodo, opcion: opcionesPlan.current.find((item) => item.id === nodo.version_id) })).filter((item) => item.opcion);
    if (!pasos.length) { agregar({ de: 'capacita', tipo: 'texto', texto: 'No tengo a mano las opciones de esta solución. Pídemela como necesidad nueva y te la ajusto.' }); return; }
    const graduables = pasos.filter(({ opcion }) => Object.keys(opcion.parameter_schema?.properties || {}).length);
    if (!graduables.length) { mejorarHerramienta(valor, 'Esta herramienta no tiene opciones para graduarla.', pasos[0].opcion, false); return; }
    // Opciones de todos los pasos en un solo contrato: «paso__opcion».
    const properties = {}, required = [], actuales = {}, origen = {};
    for (const { nodo, opcion } of graduables) {
      for (const [nombre, spec] of Object.entries(opcion.parameter_schema.properties)) {
        const clave = `${nodo.id}__${nombre}`;
        origen[clave] = [nodo.id, nombre];
        properties[clave] = { ...spec, title: graduables.length > 1 ? `${spec.title || nombre} (${nodo.label})` : spec.title || etiquetaLegible(nombre) };
        if (opcion.parameter_schema.required?.includes(nombre)) required.push(clave);
        if (nodo.parameters?.[nombre] !== undefined) actuales[clave] = nodo.parameters[nombre];
      }
    }
    const schema = { type: 'object', properties, required, additionalProperties: false };
    let nuevos, explicacion;
    const directo = ajusteDirecto(valor, opcionesEditables({ parameter_schema: schema, input_schema: {} }), actuales);
    if (directo) ({ parametros: nuevos, explicacion } = directo);
    else {
      // Una solución abierta desde el menú no pasó por el «Acepto»: la frase va a Gemini, así
      // que se pide antes. Al aceptar se retoma este mismo ajuste.
      if (!consentimiento && !consentido.current) { agregar({ de: 'capacita', tipo: 'consentimiento', alAceptar: () => ajustarPlan(valor) }); return; }
      setOcupado(true); setFase('Ajustando tu resultado…');
      try {
        const respuesta = await ajustarOpciones({ request: valor, tool_name: plan.name, tool_description: plan.description, parameter_schema: schema, current: actuales });
        if (respuesta.decision === 'improve') { setOcupado(false); setFase(''); mejorarHerramienta(valor, respuesta.explanation, graduables[0].opcion, false); return; }
        if (respuesta.decision === 'new') { setOcupado(false); setFase(''); nuevaNecesidad(valor, false); return; }
        nuevos = respuesta.parameters; explicacion = respuesta.explanation;
      } catch (cause) {
        agregar({ de: 'capacita', tipo: 'error', texto: cause.status === 429 && (cause.retryAfter || 0) <= 15 ? 'Vas muy rápido. Espera unos segundos y vuelve a escribirlo.' : cause.message });
        return;
      } finally { setOcupado(false); setFase(''); }
    }
    const nodes = plan.nodes.map((nodo) => {
      const cambios = Object.entries(nuevos).filter(([clave]) => origen[clave]?.[0] === nodo.id).map(([clave, v]) => [origen[clave][1], v]);
      return cambios.length ? { ...nodo, parameters: { ...nodo.parameters, ...Object.fromEntries(cambios) } } : nodo;
    });
    const ajustado = { ...plan, nodes };
    const anterior = solucion.current;
    solucion.current = { definicion: ajustado, guardada: null, incierta: false, base: anterior.guardada || anterior.base || null };
    setPlan(ajustado); setPidiendo({ ...pidiendo, definicion: ajustado });
    agregar({ de: 'capacita', tipo: 'texto', texto: `${explicacion} Uso el mismo archivo; confirma para ver cómo queda` });
    agregar({ de: 'capacita', tipo: 'confirmar', definicion: ajustado, datos: pidiendo.datos });
  }

  function mejorarHerramienta(pedido, explicacion, definicion, mostrarPedido = true) {
    if (ocupado) return;
    ajustador.current = null;
    if (mostrarPedido) agregar({ de: 'tu', tipo: 'texto', texto: pedido });
    agregar({ de: 'capacita', tipo: 'texto', texto: `${explicacion} Voy a diseñar una versión mejorada que también haga eso…` });
    const opciones = Object.keys(definicion.parameter_schema?.properties || {}).join(', ') || 'ninguna';
    const meta = `Versión mejorada de la herramienta «${definicion.name}»: ${definicion.description} Opciones actuales: ${opciones}. Además debe: ${pedido}. Conserva lo que ya hace y deja graduable lo nuevo.`.slice(0, 2000);
    setCreando(definicion.name);
    continuar({ ...(conversacion || { objetivo: meta }), aclaraciones: [], ruta: 'definir', metaDefinir: meta, mejorando: definicion.name });
  }

  function herramientaLista(version, terminada) {
    if (version?.id && !recienCreadas.current.includes(version.id)) recienCreadas.current = [...recienCreadas.current, version.id];
    if (automatico.current) {
      if (cola.current.length) {
        const siguiente = cola.current.shift();
        agregar({ de: 'capacita', tipo: 'texto', texto: `Lista. Sigo con la siguiente (quedan ${cola.current.length + 1})…` });
        crearFaltante(siguiente);
        return;
      }
      automatico.current = false;
    }
    // Si la herramienta era toda la solución y ya le gustó el resultado, no hace falta rearmar nada.
    if (terminada && !conversacion?.metaDefinir?.startsWith('Preparar únicamente')) {
      // El taller la sigue mostrando, ya en verde, hasta la siguiente necesidad.
      setEstadoCreacion('completed');
      // El archivo ya se usó en la vista previa: una necesidad nueva no debe heredarlo en
      // silencio (ni decirle a la IA «adjunté una foto»). Queda como último archivo para ajustes.
      if (adjunto) { ultimoArchivo.current = adjunto; setAdjunto(null); }
      agregar({ de: 'capacita', tipo: 'texto', texto: '¡Guardada en tus herramientas privadas! Descarga el resultado desde la tarjeta. Para usarla otra vez con otro archivo, búscala en «Mi biblioteca» y tócala: no hará falta esperar a la IA.' });
      return;
    }
    agregar({ de: 'capacita', tipo: 'texto', texto: '¡La herramienta nueva quedó probada y lista! Vuelvo a armar tu solución con ella…' });
    const estado = { ...conversacion, ruta: 'buscar', metaDefinir: null, mejorando: undefined };
    setCreando(''); setEstadoCreacion(''); continuar(estado);
  }

  function renderMensaje(mensaje) {
    if (mensaje.de === 'tu' && mensaje.tipo === 'archivo') {
      return <div className="flex justify-end"><div className="taller-burbuja-tu max-w-[70%] p-2 text-sm">
        {mensaje.vista && <img src={mensaje.vista} alt={`Archivo enviado: ${mensaje.nombre}`} className="max-h-48 rounded-xl object-contain" />}
        <p className="break-words px-2 py-1"><Icono nombre="clip" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />{mensaje.nombre}</p>
      </div></div>;
    }
    if (mensaje.de === 'tu') {
      return <div className="flex justify-end"><p className="taller-burbuja-tu max-w-[85%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm">{mensaje.texto}</p></div>;
    }
    const tarjeta = 'taller-tarjeta';
    switch (mensaje.tipo) {
      // Lo que dice Capacita (o la IA) se muestra con formato (títulos, viñetas, negrita), siempre como
      // texto, y sin los identificadores internos que la IA copia del catálogo.
      case 'texto': return <div className="taller-burbuja max-w-[92%] px-4 py-2.5 text-sm"><TextoConFormato texto={limpiarMensaje(mensaje.texto)} /></div>;
      case 'presentacion': return <div className={tarjeta}>
        <p className="font-semibold">Hola, soy Capacita</p>
        <p className="mt-1 text-sm text-slate-600">Me cuentas qué necesitas y armo una solución con herramientas que se combinan. Puedo:</p>
        <ul className="mt-3 space-y-2">{PUEDO.map((item) => <li key={item.titulo} className="flex gap-2 text-sm">
          <Icono nombre={item.icono} className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <span><span className="font-semibold">{item.titulo}:</span> {item.texto}</span>
        </li>)}</ul>
        <p className="mt-3 text-xs text-slate-500">Prueba con uno de estos (se escribe abajo y lo revisas antes de enviar):</p>
        <div className="mt-2 flex flex-wrap gap-2">{EJEMPLOS_PRESENTACION.map((ejemplo) => <button key={ejemplo} type="button" disabled={ocupado}
          onClick={() => { setTexto(ejemplo); entrada.current?.focus(); }}
          className="min-h-11 rounded-xl bg-blue-50 px-3 py-2 text-left text-sm text-blue-900 hover:bg-blue-100 disabled:opacity-50">{ejemplo}</button>)}</div>
      </div>;
      case 'error': return <div role="alert" className="taller-aviso taller-aviso--error">
        <p className="flex gap-2"><Icono nombre="x" className="mt-0.5 h-4 w-4 shrink-0" /><span>{limpiarMensaje(mensaje.texto)}</span></p>
        {mensaje.reintentar && <button type="button" disabled={ocupado} onClick={() => resolver(mensaje.reintentar)}
          className="mt-2 min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-800 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50">Reintentar el mismo pedido</button>}
      </div>;
      case 'planFallo': return <div className="taller-aviso taller-aviso--pausa">
        <p className="flex gap-2 font-semibold"><Icono nombre="actualizar" className="mt-0.5 h-4 w-4 shrink-0" />{mensaje.bloqueado ? 'Con las piezas que hay no llego a todo' : 'No logré armar el proceso esta vez'}</p>
        <p className="mt-1">{mensaje.bloqueado ? 'Arriba te explico qué parte falta. No ejecuté nada: puedes reintentar, quitar esa parte del pedido o pedirme que intente crear una herramienta para ella.' : 'La IA propuso un plan que no pasó la revisión de Capacita, así que no ejecuté nada. Con pedidos de muchos pasos pasa a veces y suele salir al reintentar.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={ocupado} onClick={() => resolver(mensaje.estado)} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reintentar el mismo pedido</button>
          <button type="button" disabled={ocupado} onClick={() => continuar({ ...mensaje.estado, ruta: 'definir', metaDefinir: mensaje.estado.objetivo })} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">Mejor crea una herramienta nueva</button>
        </div>
      </div>;
      case 'bloqueado': return <div className="taller-aviso taller-aviso--pausa">
        <p className="flex gap-2 font-semibold"><Icono nombre="candado" className="mt-0.5 h-4 w-4 shrink-0" />Aquí me detengo</p>
        <p className="mt-1">Para esto falta un recurso o permiso que Capacita todavía no tiene. No creé ni ejecuté nada; puedes reformular tu necesidad.</p>
      </div>;
      case 'consentimiento': return <div className={tarjeta}>
        <p className="font-semibold">Antes de empezar</p>
        <p className="mt-1 text-sm text-slate-600">Para entender tu necesidad usaré la IA de Google Gemini. Le enviaré lo que escribas en esta conversación y los nombres y contratos de las herramientas que encuentre (incluidas tus privadas). Nunca tus datos de ejecución ni código. Para diseñar herramientas nuevas también puede buscar en Google cómo se hace bien la tarea (solo con lo que escribas; nunca tus archivos). Evita escribir datos sensibles: el nivel gratuito puede usar el contenido para mejorar sus productos.</p>
        <button type="button" disabled={consentimiento || ocupado} onClick={() => { aceptarGemini(true); if (mensaje.alAceptar) mensaje.alAceptar(); else resolver(mensaje.estado); }} className="mt-3 min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{consentimiento ? 'Aceptado' : 'Acepto, continuar'}</button>
      </div>;
      case 'investigacion': return <TarjetaInvestigacion investigacion={mensaje.investigacion} clase={tarjeta} />;
      case 'preguntas': return <div className={tarjeta}>
        <p className="font-semibold">Necesito aclarar algo</p>
        <ol className="mt-2 space-y-2 text-sm">{mensaje.preguntas.map((pregunta, index) => <li key={index} className="flex gap-2 break-words">
          <span className="taller-numero" aria-hidden="true">{index + 1}</span><span>{limpiarMensaje(pregunta)}</span>
        </li>)}</ol>
        <p className="mt-2 text-xs text-slate-500">Respóndeme abajo en un solo mensaje.</p>
      </div>;
      case 'atajo': return <div className={tarjeta}>
        <p className="font-semibold"><Icono nombre="herramientas" className="mr-1 inline h-4 w-4 align-[-3px]" />Ya tienes algo que puede servir</p>
        <p className="mt-1 text-sm text-slate-600">Lo encontré en tus herramientas y las de la comunidad. Usarla no necesita la IA ni esperar: te pido los datos y la ejecuto.</p>
        <ul className="mt-3 space-y-2">{mensaje.atajos.map((item) => <li key={item.id} className="rounded-xl bg-emerald-50 p-3">
          <p className="break-words text-sm font-semibold">{item.name}</p>
          {item.description && <p className="mt-1 break-words text-xs text-slate-600">{item.description}</p>}
          <button type="button" disabled={ocupado} onClick={() => { agregar({ de: 'tu', tipo: 'texto', texto: `Usa «${item.name}»` }); abrirHerramienta(item.capability_id); }} className="mt-2 min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Usar esta, sin IA</button>
        </li>)}</ul>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <button type="button" disabled={ocupado} onClick={() => { agregar({ de: 'tu', tipo: 'texto', texto: 'Ninguna me sirve: quiero algo nuevo' }); continuar({ ...mensaje.estado, saltarAtajo: true }); }} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Ninguna me sirve: armar algo nuevo con la IA</button>
        </div>
      </div>;
      case 'requisitos': return <div className={tarjeta}>
        <p className="font-semibold">Revisé tu pedido punto por punto</p>
        <ul className="mt-2 space-y-1 text-sm">{mensaje.requisitos.map((requisito, index) => {
          const falta = mensaje.pendientes.includes(requisito);
          return <li key={index} className={`flex gap-2 rounded-lg px-2 py-1 ${falta ? 'bg-amber-50 text-amber-900' : ''}`}>
            <span aria-hidden="true">{falta ? '⚠️' : '✓'}</span>
            <span className="break-words">{requisito}{falta && <span className="sr-only"> (no incluido en el plan)</span>}</span>
          </li>;
        })}</ul>
        {mensaje.pendientes.length > 0 && <p className="mt-2 text-xs text-amber-900">Lo marcado con ⚠️ no quedó en el plan. Puedes reintentar, quitar otra parte del pedido o dividirlo en dos soluciones.</p>}
      </div>;
      case 'faltan': return <div className={tarjeta}>
        <p className="font-semibold"><Icono nombre="herramienta" className="mr-1 inline h-4 w-4 align-[-3px]" />Me falta una herramienta para resolverlo</p>
        <p className="mt-1 text-sm text-slate-600">Puedo crearla, probarla en un entorno aislado y dejarla lista para ti. No estará disponible hasta superar las pruebas.</p>
        <ul className="mt-3 space-y-2">{mensaje.faltan.map((item, index) => <li key={index} className="rounded-xl bg-amber-50 p-3">
          <p className="break-words text-sm">{limpiarMensaje(item)}</p>
          <button type="button" disabled={ocupado} onClick={() => crearFaltante(item)} className="mt-2 min-h-11 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Créala</button>
        </li>)}</ul>
        {mensaje.faltan.length > 1 && <div className="mt-3 border-t border-slate-200 pt-3">
          <button type="button" disabled={ocupado} onClick={() => crearTodas(mensaje.faltan)} className="min-h-11 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Icono nombre="rayo" className="mr-1 inline h-4 w-4 align-[-3px]" />Créalas todas ({mensaje.faltan.length})</button>
          <p className="mt-1 text-xs text-slate-500">Las diseño, escribo y pruebo una tras otra sin preguntarte en cada una. Enviaré a Google Gemini la descripción y los ejemplos de cada una (nunca tus datos reales). Al final armo la solución con tu archivo.</p>
        </div>}
      </div>;
      case 'crear': return <FabricaHerramienta definition={mensaje.definicion} onEstado={setEstadoCreacion} onLista={herramientaLista}
        archivo={adjunto || ultimoArchivo.current} registrarAjustador={registrarAjustador} onMejorar={mejorarHerramienta}
        automatica={Boolean(mensaje.automatica)} onFallo={falloEnCola} />;
      case 'plan': return <div className={tarjeta}><TarjetaPlan definition={mensaje.definicion} obtenerGuardada={obtenerGuardada} ocupadoExterno={Boolean(run && activo(run.status))} onEjecucion={alEjecutar} conectores={conectores} /></div>;
      case 'confirmar': return <div className={tarjeta}><TarjetaPlan definition={mensaje.definicion} datos={mensaje.datos} obtenerGuardada={obtenerGuardada} ocupadoExterno={Boolean(run && activo(run.status)) || mensaje.definicion !== plan} onEjecucion={alEjecutar} conectores={conectores} /></div>;
      case 'resultado': {
        const actual = run && run.id === mensaje.runId ? run : null;
        if (!actual && runId !== mensaje.runId) return <p className="text-sm text-slate-500">Ejecución anterior · <button type="button" className="text-blue-700 underline" onClick={() => onCambiarSeccion?.(`historial/${mensaje.runId}`)}>ver en Resultados</button></p>;
        return <div className={tarjeta}>
          <p className="font-semibold">{actual ? ESTADO_RUN[actual.status] || actual.status : 'Iniciando…'}</p>
          {actual?.status === 'queued' && <p className="mt-1 text-sm text-slate-600">Tu solicitud está guardada; empezará cuando el trabajador esté disponible.</p>}
          {actual?.output != null && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm"><ResultadoDatos value={actual.output} /></div>}
          {/* Una consulta que no respondió no tumbó la solución: la IA lo mencionó y aquí se avisa cuál. */}
          {actual?.status === 'completed' && actual.report?.avisos?.length > 0 && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Terminó, pero no pude consultar: {actual.report.avisos.map((id) => actual.report.steps?.find((paso) => paso.id === id)?.label || id).join(', ')}. El texto lo menciona; si quieres, ejecútala otra vez más tarde.</p>}
          {actual?.report?.error && <p role="alert" className="mt-2 break-words text-sm text-red-700">{explicarError(actual.report)}. Los pasos que terminaron se conservan; revisa tus datos e inténtalo de nuevo.</p>}
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
      {[['chat', 'Chat'], ['taller', 'Taller']].map(([valor, etiqueta]) => <button key={valor} type="button" role="tab" aria-selected={vistaMovil === valor} onClick={() => setVistaMovil(valor)}><Icono nombre={valor} className="mr-1 inline h-4 w-4 align-[-3px]" />{etiqueta}</button>)}
    </div>
    <div className="taller-chat">
      <div className="taller-mensajes" aria-live="polite">
        {vacio && <div className="taller-bienvenida">
          <p className="taller-saludo"><span className="inicio-punto" aria-hidden="true" />Hola, {usuario?.name?.split(' ')[0] || 'de nuevo'}</p>
          <h1>¿Qué necesitas <span>resolver</span> hoy?</h1>
          <p>Cuéntamelo con tus palabras o sube un archivo. Busco las herramientas que ya existen, creo las que falten y te muestro el proceso armándose en el taller.</p>
          <p className="taller-sugerencias-titulo">Prueba con una idea</p>
          <div className="taller-sugerencias">
            {SUGERENCIAS.map((idea) => <button key={idea.texto} type="button" className={`taller-sugerencia taller-sugerencia--${idea.tono}`} disabled={ocupado}
              onClick={() => { setTexto(idea.texto); entrada.current?.focus(); }} aria-label={`Usar idea: ${idea.texto}`}>
              <span className="taller-sugerencia-punto" aria-hidden="true" />
              <span className="taller-sugerencia-de">{idea.de}</span>
              <Icono nombre="flecha" className="taller-sugerencia-flecha h-3.5 w-3.5" />
              <span className="taller-sugerencia-a">{idea.a}</span>
            </button>)}
          </div>
          {consentimiento && <p className="mt-4 text-xs text-slate-500">Ya aceptaste que use Gemini de Google para entender tus pedidos (nunca tus archivos). <button type="button" className="font-semibold text-blue-700 underline" onClick={() => aceptarGemini(false)}>Retirar mi permiso</button></p>}
        </div>}
        {mensajes.map((mensaje, index) => {
          const deCapacita = mensaje.de !== 'tu';
          // El nodo de Capacita aparece al inicio de cada turno suyo, no en cada mensaje seguido.
          const avatar = deCapacita && (index === 0 || mensajes[index - 1].de === 'tu');
          return <div key={mensaje.id} className={`taller-mensaje ${deCapacita ? 'is-capacita' : 'is-tu'}`}>
            {deCapacita && <span className={`taller-avatar ${avatar ? '' : 'is-oculto'}`} aria-hidden="true" />}
            <div className="taller-mensaje-cuerpo">{renderMensaje(mensaje)}</div>
          </div>;
        })}
        {ocupado && <p role="status" className="taller-escribiendo"><span className="taller-avatar taller-avatar--pulso" aria-hidden="true" /><span className="taller-puntos" aria-hidden="true"><i /><i /><i /></span>{fase}</p>}
        <div ref={fin} />
      </div>
      {campoActual && <div className="flex items-center justify-between gap-2 px-5 pb-2 text-xs text-slate-600">
        <span className="break-words"><Icono nombre={campoActual.archivo ? 'clip' : 'lapiz'} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Esperando: {campoActual.etiqueta}{campoActual.opcional ? ' (opcional: escribe «no» para seguir sin él)' : ''}</span>
        <button type="button" className="shrink-0 rounded-lg px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50" onClick={() => { setPidiendo(null); entrada.current?.focus(); }}>Pedir otra cosa</button>
      </div>}
      <form onSubmit={enviar} className="taller-compositor">
        <input ref={selector} type="file" className="sr-only" tabIndex={-1} aria-hidden="true"
          accept={campoActual?.archivo ? infoTipo(campoActual.archivo).acepta : 'image/*,.pdf,.docx,.xlsx'}
          onChange={(event) => { recibirArchivo(event.target.files?.[0]); event.target.value = ''; }} />
        <button type="button" className="taller-adjuntar" disabled={ocupado || leyendo} onClick={() => selector.current?.click()}
          aria-label={campoActual?.archivo ? `Subir ${campoActual.etiqueta}` : 'Adjuntar foto, PDF, Word o Excel'} title="Adjuntar archivo"><Icono nombre={leyendo ? 'reloj' : 'clip'} className="h-5 w-5" /></button>
        <label htmlFor="taller-entrada" className="sr-only">Escribe tu necesidad</label>
        <textarea id="taller-entrada" ref={entrada} rows={2} maxLength={2000} value={texto} disabled={ocupado} onChange={(event) => setTexto(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) enviar(event); }}
          placeholder={pendientes.length ? 'Responde a mis preguntas…' : campoActual ? (campoActual.archivo ? `Sube ${campoActual.etiqueta} con el clip` : `Escribe aquí: ${campoActual.etiqueta}`) : 'Ej.: mejora la foto de mi plato y ponle el nombre de mi restaurante…'} />
        <button type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar"><Icono nombre="enviar" className="h-5 w-5" /></button>
      </form>
    </div>
    <aside className="taller-lienzo" aria-label="Taller">
      <div className="taller-cabecera">
        <p className="taller-cabecera-titulo"><span className="taller-cabecera-icono"><Icono nombre="taller" className="h-4 w-4" /></span>Taller</p>
        {(plan || creando) && <p className="taller-cabecera-estado">{creando ? (ESTADOS_NODO[estadoCreacion] || ESTADOS_NODO.creando).texto : run ? ESTADO_RUN[run.status] || run.status : 'Plan listo · toca un paso para ver detalles'}</p>}
      </div>
      <RutaTaller etapa={etapaActual({ conversacion, ocupado, plan, creando, runId })} terminado={run?.status === 'completed'} trabajando={ocupado || Boolean(creando) || Boolean(run && activo(run.status))} />
      <div className="min-h-0 flex-1"><LienzoTaller definicion={plan} creando={creando} estadoCreacion={estadoCreacion} estados={estados} seleccionado={seleccionado} onSeleccionar={setSeleccionado} conectores={conectores} /></div>
      {nodoElegido && <div className="taller-detalle">
        <div className="flex items-start justify-between gap-2">
          <p className="break-words font-semibold">{nodoElegido.label}</p>
          <button type="button" className="text-sm text-slate-500" onClick={() => setSeleccionado(null)} aria-label="Cerrar detalle"><Icono nombre="x" className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-slate-600"><Icono nombre={(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).icono} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />{(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).texto} · {Object.values(nodoElegido.bindings || {}).some((binding) => binding.source !== '$input') ? 'usa el resultado del paso anterior' : 'usa tus datos'}</p>
        {Object.keys(nodoElegido.parameters || {}).length > 0 && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Opciones</p><ResultadoDatos value={nodoElegido.parameters} /></div>}
        {pasoElegido?.output != null && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Lo que produjo</p><ResultadoDatos value={pasoElegido.output} /></div>}
        {pasoElegido?.error && <p className="mt-2 break-words text-sm text-red-700">{explicarError({ steps: [pasoElegido] })}.</p>}
        {conectores.get(nodoElegido.version_id) && <p className="mt-2 text-xs text-sky-800"><Icono nombre={conectores.get(nodoElegido.version_id).ia ? 'chispa' : conectores.get(nodoElegido.version_id).accion ? 'candado' : 'globo'} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Usa {conectores.get(nodoElegido.version_id).proveedor}: solo recibe los datos de este paso.</p>}
      </div>}
    </aside>
  </section>;
}
