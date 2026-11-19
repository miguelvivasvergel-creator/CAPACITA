import { api } from '../../api';

/**
 * Usar una herramienta ya creada sin pasar por la IA: se convierte en una solución de un
 * solo paso (las entradas obligatorias vienen de la persona y las salidas obligatorias son el
 * resultado). Así se reutiliza el flujo probado del chat: pedir datos, aprobar y ejecutar.
 */
const PASO = 'herramienta';

// Valor inicial válido para una opción obligatoria (el chat permite cambiarlo después).
// Los booleanos incluir_… quedan encendidos: las secciones de un informe salen por defecto.
function valorInicial(nombre, spec = {}) {
  if (spec.default !== undefined) return spec.default;
  if (spec.enum?.length) return spec.enum[0];
  if (spec.type === 'boolean') return /^incluir|^mostrar/i.test(nombre);
  if (spec.type === 'number' || spec.type === 'integer') return spec.minimum ?? 0;
  if (spec.type === 'string') return /colou?r|hex/i.test(`${nombre} ${spec.description || ''}`) ? '#1E3A8A' : '';
  return undefined;
}

/** null si los contratos no permiten armarla (por ejemplo, sin salidas obligatorias). */
export function solucionDeVersion(version) {
  const entrada = version.input_schema || {}, salida = version.output_schema || {};
  const requeridas = entrada.required || [], salidas = salida.required || [];
  if (!requeridas.length || !salidas.length || entrada.type !== 'object') return null;
  const properties = Object.fromEntries(requeridas.map((campo) => [campo, entrada.properties?.[campo] || {}]));
  const opciones = version.parameter_schema?.properties || {};
  const parameters = {};
  for (const nombre of version.parameter_schema?.required || []) {
    const valor = valorInicial(nombre, opciones[nombre]);
    if (valor !== undefined) parameters[nombre] = valor;
  }
  const nombre = (version.name || 'Mi herramienta').slice(0, 80);
  return {
    format_version: 1,
    name: nombre.length >= 3 ? nombre : `${nombre} · uso`,
    description: `Usar mi herramienta «${nombre}».`.slice(0, 500),
    input_schema: { type: 'object', properties, required: requeridas, additionalProperties: false },
    nodes: [{ id: PASO, version_id: version.id, label: nombre, parameters, values: {},
      bindings: Object.fromEntries(requeridas.map((campo) => [campo, { source: '$input', field: campo }])), x: 0, y: 0 }],
    outputs: Object.fromEntries(salidas.map((campo) => [campo, { source: PASO, field: campo }])),
  };
}

// Recorre como máximo 3 páginas de 100 (suficiente para una cuenta de estudiante).
async function recorrer(ruta, visitar) {
  let cursor = null;
  for (let pagina = 0; pagina < 3; pagina++) {
    const page = await api(`${ruta}?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const item of page.items) if (visitar(item)) return item;
    if (!page.next_cursor) return null;
    cursor = page.next_cursor;
  }
  return null;
}

/** Versión habilitada más reciente de una herramienta (capacidad) o null si aún no está lista. */
export async function versionLista(capacidadId) {
  let elegida = null;
  await recorrer('/workflows/available-versions', (item) => {
    if (item.capability_id === capacidadId && (!elegida || String(item.created_at) > String(elegida.created_at))) elegida = item;
    return false;
  });
  return elegida;
}

/** Solución guardada de un solo paso con esa versión, para no crear copias al reutilizarla. */
export const solucionGuardadaDe = (versionId) => recorrer('/workflows', (row) =>
  row.definition?.nodes?.length === 1 && row.definition.nodes[0].version_id === versionId);

/** ids de herramientas con una versión lista para usar (para marcarlas en la lista). */
export async function herramientasListas() {
  const listas = new Set();
  await recorrer('/workflows/available-versions', (item) => { listas.add(item.capability_id); return false; });
  return listas;
}

/** Nombres para la lista de resultados: { versión → herramienta, solución → nombre }. */
export async function nombresDeResultados() {
  const nombres = new Map();
  await Promise.allSettled([
    recorrer('/workflows/available-versions', (item) => { nombres.set(item.id, item.name); return false; }),
    recorrer('/workflows', (row) => { if (row.definition?.name) nombres.set(row.id, row.definition.name); return false; }),
  ]);
  return nombres;
}
