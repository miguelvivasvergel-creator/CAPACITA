import { useCallback, useEffect, useRef, useState } from 'react';
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
import { ESTADOS_NODO } from './estadosNodo';
import TarjetaPlan from './TarjetaPlan';
import TarjetaInvestigacion from './TarjetaInvestigacion';
import { solucionDeVersion, solucionGuardadaDe, versionLista } from './solucionDirecta';

// Ejemplos de la demo: los que llevan archivo abren el 📎 al tocarlos.
const SUGERENCIAS = [
  { icono: '🍽️', texto: 'Mejora la foto de mi plato y ponle encima el nombre de mi restaurante', archivo: true },
  { icono: '🎨', texto: 'Ponle un filtro vintage cálido a mi foto', archivo: true },
  { icono: '📄', texto: 'Agrégale a mi PDF una portada con un título', archivo: true },
  { icono: '📊', texto: 'Convierte mi Excel de ventas en un informe PDF con los totales', archivo: true },
  { icono: '🔍', texto: 'Compara dos versiones de mi documento Word y márcame todo lo que cambió', archivo: true },
  { icono: '🌦️', texto: '¿Va a llover esta semana en Bogotá? Dime qué días', archivo: false },
  { icono: '🧾', texto: 'Saca la fecha, el total y el proveedor de la foto de mi factura', archivo: true },
  { icono: '📲', texto: 'Mándame por Telegram el pronóstico de lluvia de Bogotá de esta semana', archivo: false },
  { icono: '✍️', texto: 'Cuenta cuántas palabras tiene un texto y dime las más repetidas', archivo: false },
];
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
// Herramientas del catálogo que se parecen a lo pedido (palabras en común con su nombre y
// descripción), para ofrecer usarlas sin IA. Solo las que el chat puede ejecutar directo.
const VACIAS = new Set(['para', 'como', 'quiero', 'necesito', 'hazme', 'dame', 'favor', 'este', 'esta', 'esto', 'todo', 'toda',
  'todos', 'desde', 'sobre', 'tiene', 'puedo', 'puede', 'cada', 'entre', 'hacer', 'herramienta', 'algo', 'otra', 'otro']);
const palabrasDe = (texto) => new Set(String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .split(/[^a-z0-9]+/).filter((palabra) => palabra.length > 3 && !VACIAS.has(palabra)));
function herramientasParecidas(items, objetivo) {
  // «(Adjunté un Excel como entrada.)» lo agrega el chat: no cuenta como parte del pedido.
  const pedido = palabrasDe(objetivo.replace(/\n\(Adjunté [^)]*\)\s*$/, ''));
  if (!pedido.size) return [];
  const vistas = new Set();
  const texto = (item) => `${item.name} ${item.description || ''}`.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  const candidatas = items.map((item) => {
    const propias = palabrasDe(texto(item));
    const comunes = [...pedido].filter((palabra) => propias.has(palabra)).length;
    return { item, propias, puntos: comunes / pedido.size, comunes };
  }).filter(({ item, comunes, puntos }) => comunes >= 2 && puntos >= 0.4 && solucionDeVersion(item))
    .sort((a, b) => b.puntos - a.puntos || String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')))
    .filter(({ item }) => !vistas.has(item.capability_id) && vistas.add(item.capability_id));
  if (!candidatas.length) return [];
  // Si el pedido nombra algo que la mejor herramienta no hace pero el NOMBRE de otra sí («…por
  // Telegram» → «Enviarme por Telegram»), hacen falta varias: mejor que la IA arme el proceso.
  const sobrantes = [...pedido].filter((palabra) => !candidatas[0].propias.has(palabra));
  const otrosNombres = items.filter((item) => item.capability_id !== candidatas[0].item.capability_id)
    .map((item) => palabrasDe(String(item.name || '').replaceAll('_', ' ')));
  if (sobrantes.some((palabra) => otrosNombres.some((nombre) => nombre.has(palabra)))) return [];
  return candidatas.slice(0, 3).map(({ item }) => item);
}

// Pasos que consultan un servicio externo (sello 🌐): version_id → proveedor («Open-Meteo»).
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
  archivo: 'el archivo (no se pudo leer o pesa más de 4,5 MB)',
};
// Respuestas de la IA que no dependen de un dato concreto.
const DETALLES_IA = {
  contenido_bloqueado: 'La IA no quiso procesar ese contenido (lo marcó como sensible). Prueba con otro texto o foto',
  respuesta_muy_larga: 'La respuesta de la IA salía demasiado larga. Prueba con un texto más corto',
  telegram_no_vinculado: 'Primero conecta tu Telegram en Configuración (sección «Telegram») y vuelve a ejecutarlo',
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
  if (paso?.error === 'connector_input') return `Revisa ${DATO[paso.detail] || 'los datos'} en el paso «${paso.label}»`;
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
  // Qué pasos del plan son conectores (sello 🌐); se recalcula cada vez que cambian las opciones.
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
      abrirSolucion(guardada.definition, guardada, `Abrí tu solución «${guardada.definition.name}». Revisa sus pasos en el taller; te pido los datos para usarla 👇`);
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
          ? 'Esta herramienta no entrega un resultado que el chat pueda mostrarte, así que no puedo usarla desde aquí. Cuéntame qué necesitas y busco o creo una que sí sirva 👇'
          : 'Esta herramienta todavía no tiene una versión probada que se pueda usar. Cuéntame qué necesitas y busco o creo una que sí funcione 👇' });
        return;
      }
      fijarOpciones([version]);
      const guardada = await solucionGuardadaDe(version.id).catch(() => null);
      const ajena = version.owner_id && usuario?.id && version.owner_id !== usuario.id;
      abrirSolucion(guardada?.definition || definicion, guardada,
        `Abrí ${ajena ? 'la herramienta de la comunidad' : 'tu herramienta'} «${version.name}». No necesito la IA para usarla: te pido los datos y la ejecuto 👇`);
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
    if (solucion.current.incierta) throw new Error('No pudimos confirmar si la solución se guardó. Revísala en Soluciones antes de crear otra copia.');
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
      agregar({ de: 'capacita', tipo: 'texto', texto: `Si quieres personalizarla, sube ${campo.etiqueta} (${infoTipo(campo.archivo).nombre}) con el botón 📎. Es opcional: si no, escribe «no» 👇` });
      return;
    }
    agregar({ de: 'capacita', tipo: 'texto', texto: campo.archivo ? `${inicio}: ${campo.etiqueta} (${infoTipo(campo.archivo).nombre}). Súbelo con el botón 📎 de abajo 👇` : `${inicio}: ${campo.etiqueta}${campo.ayuda ? ` (${campo.ayuda})` : ''}. Escríbelo abajo 👇` });
  }

  // Tras ejecutar, un dato nuevo vuelve a empezar la recogida para ejecutarla otra vez.
  const estadoParaDato = () => (pidiendo.indice >= pidiendo.campos.length ? { ...pidiendo, indice: 0, datos: {} } : pidiendo);

  function recibirDato(valor) {
    const estado = estadoParaDato(), campo = estado.campos[estado.indice];
    agregar({ de: 'tu', tipo: 'texto', texto: valor }); setTexto('');
    if (campo.archivo) {
      if (campo.opcional && SALTAR.test(valor)) { pedirSiguiente({ ...estado, indice: estado.indice + 1 }); return; }
      setPidiendo(estado);
      agregar({ de: 'capacita', tipo: 'texto', texto: campo.opcional ? `Para ${campo.etiqueta} súbelo con el botón 📎, o escribe «no» si prefieres seguir sin él.` : `Aquí necesito un archivo: ${campo.etiqueta}. Súbelo con el botón 📎 de abajo 👇` });
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
      agregar({ de: 'capacita', tipo: 'texto', texto: `Ahora necesito: ${campo.etiqueta}. Escríbelo abajo 👇` });
      return;
    }
    // Aún no hay solución: se guarda y se usa cuando la solución pida un archivo.
    setAdjunto(archivo);
    agregar({ de: 'tu', tipo: 'archivo', nombre: archivo.name, vista: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null });
    agregar({ de: 'capacita', tipo: 'texto', texto: 'Recibí tu archivo 👍. Cuéntame qué quieres hacer con él.' });
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
        setFase('⏳ Esperando turno con la IA (unos segundos)…');
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
    setFase('🔎 Antes de crearla, investigo en internet cómo se hace bien…');
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
      const opciones = await buscarOpcionesPlan(completo, controller.signal);
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
        abrirSolucion(definicion, null, `Uso «${version.name}», la herramienta que acabamos de crear. Te pido los datos 👇`);
        return true;
      };
      if (soloCatalogo(estado) && !recienCreadas.current.length) {
        // Reutilizar sin IA: si hay herramientas que encajan con lo que escribió, se ofrecen.
        const atajos = herramientasParecidas(items, objetivo);
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
      setFase(`Encontré ${items.length} herramienta${items.length === 1 ? '' : 's'} posibles. Armando tu proceso…`);
      let proposal;
      try {
        ({ proposal } = await proponerPlan(completo, items.slice(0, 12), controller.signal));
      } catch (cause) {
        // Si no logra combinar bien tus herramientas (contratos que no encajan), diseña una nueva
        // en vez de dejarte con un error. Cuota, permisos y cancelación sí se informan.
        if (controller.signal.aborted || cause.status !== 502) throw cause;
        if (usarRecienCreada()) return;
        await disenar(objetivo, 'No logré combinar tus herramientas. Con lo que investigué, diseño una nueva…', true);
        return;
      }
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
        if (usarRecienCreada()) return;
        await disenar(objetivo, 'Ninguna de tus herramientas sirve para esto. Con lo que investigué, diseño una nueva…', true);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        agregar({ de: 'capacita', tipo: 'error', texto: `${cause.message} Tu conversación sigue aquí; puedes volver a intentarlo.` }); falloEnCola();
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
    agregar({ de: 'capacita', tipo: 'texto', texto: `Voy a crear y probar las ${items.length} herramientas una por una. Al final armo tu solución con todas 💪` });
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
        agregar({ de: 'capacita', tipo: 'error', texto: cause.status === 429 && (cause.retryAfter || 0) <= 15 ? 'Vas muy rápido 🙂. Espera unos segundos y vuelve a escribirlo.' : cause.message });
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
    agregar({ de: 'capacita', tipo: 'texto', texto: `${explicacion} Uso el mismo archivo; confirma para ver cómo queda 👇` });
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
        agregar({ de: 'capacita', tipo: 'texto', texto: `✅ Lista. Sigo con la siguiente (quedan ${cola.current.length + 1})…` });
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
      agregar({ de: 'capacita', tipo: 'texto', texto: '¡Guardada en tus herramientas privadas! 🎉 Descarga el resultado desde la tarjeta. Para usarla otra vez con otro archivo, búscala en «Herramientas» y toca «Usar ahora»: no hará falta esperar a la IA.' });
      return;
    }
    agregar({ de: 'capacita', tipo: 'texto', texto: '¡La herramienta nueva quedó probada y lista! Vuelvo a armar tu solución con ella…' });
    const estado = { ...conversacion, ruta: 'buscar', metaDefinir: null, mejorando: undefined };
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
        <p className="mt-1 text-sm text-slate-600">Para entender tu necesidad usaré la IA de Google Gemini. Le enviaré lo que escribas en esta conversación y los nombres y contratos de las herramientas que encuentre (incluidas tus privadas). Nunca tus datos de ejecución ni código. Para diseñar herramientas nuevas también puede buscar en Google cómo se hace bien la tarea (solo con lo que escribas; nunca tus archivos). Evita escribir datos sensibles: el nivel gratuito puede usar el contenido para mejorar sus productos.</p>
        <button type="button" disabled={consentimiento || ocupado} onClick={() => { aceptarGemini(true); if (mensaje.alAceptar) mensaje.alAceptar(); else resolver(mensaje.estado); }} className="mt-3 min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{consentimiento ? 'Aceptado' : 'Acepto, continuar'}</button>
      </div>;
      case 'investigacion': return <TarjetaInvestigacion investigacion={mensaje.investigacion} clase={tarjeta} />;
      case 'preguntas': return <div className={tarjeta}>
        <p className="font-semibold">Necesito aclarar algo</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{mensaje.preguntas.map((pregunta, index) => <li key={index} className="break-words">{pregunta}</li>)}</ul>
        <p className="mt-2 text-xs text-slate-500">Respóndeme abajo en un solo mensaje.</p>
      </div>;
      case 'atajo': return <div className={tarjeta}>
        <p className="font-semibold">🧰 Ya tienes algo que puede servir</p>
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
      case 'faltan': return <div className={tarjeta}>
        <p className="font-semibold">🛠️ Me falta una herramienta para resolverlo</p>
        <p className="mt-1 text-sm text-slate-600">Puedo crearla, probarla en un entorno aislado y dejarla lista para ti. No estará disponible hasta superar las pruebas.</p>
        <ul className="mt-3 space-y-2">{mensaje.faltan.map((item, index) => <li key={index} className="rounded-xl bg-amber-50 p-3">
          <p className="break-words text-sm">{item}</p>
          <button type="button" disabled={ocupado} onClick={() => crearFaltante(item)} className="mt-2 min-h-11 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Créala</button>
        </li>)}</ul>
        {mensaje.faltan.length > 1 && <div className="mt-3 border-t border-slate-200 pt-3">
          <button type="button" disabled={ocupado} onClick={() => crearTodas(mensaje.faltan)} className="min-h-11 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">⚡ Créalas todas ({mensaje.faltan.length})</button>
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
      {[['chat', '💬 Chat'], ['taller', '🧩 Taller']].map(([valor, etiqueta]) => <button key={valor} type="button" role="tab" aria-selected={vistaMovil === valor} onClick={() => setVistaMovil(valor)}>{etiqueta}</button>)}
    </div>
    <div className="taller-chat">
      <div className="taller-mensajes" aria-live="polite">
        {vacio && <div className="taller-bienvenida">
          <p className="text-sm font-semibold text-blue-700">Hola, {usuario?.name?.split(' ')[0] || 'bienvenida'} 👋</p>
          <h1>¿Qué necesitas resolver hoy?</h1>
          <p>Cuéntamelo con tus palabras. Busco las herramientas que ya existen, creo las que falten y te muestro el proceso armándose a la derecha.</p>
          {consentimiento && <p className="mt-2 text-xs text-slate-500">Ya aceptaste que use Gemini de Google para entender tus pedidos (nunca tus archivos). <button type="button" className="font-semibold text-blue-700 underline" onClick={() => aceptarGemini(false)}>Retirar mi permiso</button></p>}
          <div className="mt-4 flex flex-col gap-2">{SUGERENCIAS.map((sugerencia) => <button key={sugerencia.texto} type="button" className="taller-sugerencia" onClick={() => {
            setTexto(sugerencia.texto);
            if (sugerencia.archivo && !adjunto) selector.current?.click(); else entrada.current?.focus();
          }}><span aria-hidden="true">{sugerencia.icono}</span> {sugerencia.texto}{sugerencia.archivo && <span className="ml-1 text-xs text-slate-500">· 📎 con tu archivo</span>}</button>)}</div>
        </div>}
        {mensajes.map((mensaje) => <div key={mensaje.id} className="taller-mensaje">{renderMensaje(mensaje)}</div>)}
        {ocupado && <p role="status" className="taller-escribiendo"><span className="taller-puntos" aria-hidden="true"><i /><i /><i /></span>{fase}</p>}
        <div ref={fin} />
      </div>
      {campoActual && <div className="flex items-center justify-between gap-2 px-1 pb-1 text-xs text-slate-600">
        <span className="break-words">{campoActual.archivo ? '📎' : '✍️'} Esperando: {campoActual.etiqueta}{campoActual.opcional ? ' (opcional: escribe «no» para seguir sin él)' : ''}</span>
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
      <div className="min-h-0 flex-1"><LienzoTaller definicion={plan} creando={creando} estadoCreacion={estadoCreacion} estados={estados} seleccionado={seleccionado} onSeleccionar={setSeleccionado} conectores={conectores} /></div>
      {nodoElegido && <div className="taller-detalle">
        <div className="flex items-start justify-between gap-2">
          <p className="break-words font-semibold">{nodoElegido.label}</p>
          <button type="button" className="text-sm text-slate-500" onClick={() => setSeleccionado(null)} aria-label="Cerrar detalle">✕</button>
        </div>
        <p className="mt-1 text-xs text-slate-600">{(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).icono} {(ESTADOS_NODO[estados[nodoElegido.id]] || ESTADOS_NODO.espera).texto} · {Object.values(nodoElegido.bindings || {}).some((binding) => binding.source !== '$input') ? 'usa el resultado del paso anterior' : 'usa tus datos'}</p>
        {Object.keys(nodoElegido.parameters || {}).length > 0 && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Opciones</p><ResultadoDatos value={nodoElegido.parameters} /></div>}
        {pasoElegido?.output != null && <div className="mt-2 text-sm"><p className="text-xs font-semibold text-slate-500">Lo que produjo</p><ResultadoDatos value={pasoElegido.output} /></div>}
        {pasoElegido?.error && <p className="mt-2 break-words text-sm text-red-700">{explicarError({ steps: [pasoElegido] })}.</p>}
        {conectores.get(nodoElegido.version_id) && <p className="mt-2 text-xs text-sky-800">{conectores.get(nodoElegido.version_id).ia ? '✨' : conectores.get(nodoElegido.version_id).accion ? '🔒' : '🌐'} Usa {conectores.get(nodoElegido.version_id).proveedor}: solo recibe los datos de este paso.</p>}
      </div>}
    </aside>
  </section>;
}
