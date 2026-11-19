// Lógica pura de la vista previa: qué se puede ajustar, valores iniciales y ajustes
// directos («ponle 30 %») que no necesitan IA. Lo ambiguo se le pregunta a Gemini.
import { esArchivo } from '../../utils/archivos';

const NUMERO = /(-?\d+(?:[.,]\d+)?)\s*(%|por ?ciento)?/gi;
// Comparativos y frases relativas: los interpreta la IA, no una regla fija.
const RELATIVO = /\b(m[aá]s|menos|mitad|doble|poco|bastante|sube|s[uú]bele|baja|b[aá]jale|aumenta|reduce|quita|agrega)\b/i;
const sinAcentos = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const etiquetaDe = (nombre) => nombre.replaceAll('_', ' ').replace(/^./, (letra) => letra.toUpperCase());

// Escala desde el contrato (minimum/maximum) o desde la descripción («de 0 a 100»).
function escala(spec) {
  const desc = sinAcentos(spec.description || '');
  // «de 0 a 100», «entre 0 y 1», «de 0.0 (sin efecto) a 1.0 (máxima)».
  const rango = desc.match(/(?:de|entre)\s+(-?\d+(?:[.,]\d+)?)(?:\s*\([^)]{0,40}\))?\s+(?:a|y|hasta)\s+(-?\d+(?:[.,]\d+)?)/);
  const leer = (valor) => (valor === undefined ? undefined : Number(String(valor).replace(',', '.')));
  return {
    min: spec.minimum ?? leer(rango?.[1]),
    max: spec.maximum ?? leer(rango?.[2]),
  };
}

// Un color: texto cuyo nombre o descripción habla de color (o hexadecimal) y sin lista fija.
const esColor = (nombre, spec) => spec.type === 'string' && !spec.enum && /colou?r|hex/i.test(`${nombre} ${spec.description || ''}`);
export const HEX = /^#[0-9a-f]{6}$/i;

/** Archivos que la persona puede agregar si quiere (logo, fondo, plantilla propia). */
export function archivosOpcionales(definition) {
  const schema = definition.input_schema || {};
  return Object.entries(schema.properties || {}).filter(([nombre, spec]) => esArchivo(spec) && !schema.required?.includes(nombre))
    .map(([nombre, spec]) => ({ nombre, media: spec.contentMediaType || 'image/png', etiqueta: spec.title || etiquetaDe(nombre), descripcion: spec.description || '' }));
}

/** Opciones editables: los parámetros y las entradas que no son archivos. */
export function opcionesEditables(definition) {
  const lista = [];
  for (const [origen, schema] of [['parametro', definition.parameter_schema], ['entrada', definition.input_schema]]) {
    for (const [nombre, spec] of Object.entries(schema?.properties || {})) {
      if (esArchivo(spec) || !['number', 'integer', 'string', 'boolean'].includes(spec.type)) continue;
      lista.push({ nombre, origen, tipo: spec.type, etiqueta: spec.title || etiquetaDe(nombre), descripcion: spec.description || '', opciones: spec.enum,
        color: esColor(nombre, spec), ...escala(spec) });
    }
  }
  return lista;
}

/** Valores de partida: los del ejemplo de la definición (sin los archivos). */
export function valoresIniciales(definition, opciones) {
  const ejemplo = definition.examples?.[0] || {};
  const valores = { parametro: {}, entrada: {} };
  for (const opcion of opciones) {
    const fuente = opcion.origen === 'parametro' ? ejemplo.parameters : ejemplo.inputs;
    let valor = fuente?.[opcion.nombre];
    if (valor === undefined) valor = opcion.tipo === 'boolean' ? false : opcion.tipo === 'string' ? (opcion.opciones?.[0] ?? '') : (opcion.min ?? 0);
    valores[opcion.origen][opcion.nombre] = valor;
  }
  return valores;
}

/** «Ponle 30 %», «intensidad 40»: un número claro para una opción clara. Si no, null. */
export function ajusteDirecto(texto, opciones, parametros) {
  // «bájale al 50 %» fija un valor; «bájale un poco» es relativo y lo decide la IA.
  if (RELATIVO.test(texto) && !/\b(?:al|a|en|hasta)\s+-?\d/i.test(texto)) return null;
  const numeros = [...texto.matchAll(NUMERO)];
  if (numeros.length !== 1) return null;
  const numericas = opciones.filter((opcion) => opcion.origen === 'parametro' && ['number', 'integer'].includes(opcion.tipo));
  const frase = sinAcentos(texto);
  let elegidas = numericas.filter((opcion) => sinAcentos(`${opcion.etiqueta} ${opcion.nombre}`).split(/[^a-z]+/).some((palabra) => palabra.length > 3 && frase.includes(palabra)));
  if (elegidas.length !== 1) elegidas = numericas.length === 1 ? numericas : [];
  if (elegidas.length !== 1) return null;
  const [opcion] = elegidas;
  const porcentaje = Boolean(numeros[0][2]);
  let valor = Number(numeros[0][1].replace(',', '.'));
  const escalaUno = opcion.max !== undefined ? opcion.max <= 1 : typeof parametros[opcion.nombre] === 'number' && parametros[opcion.nombre] <= 1;
  if (porcentaje && escalaUno) valor /= 100;
  if (opcion.tipo === 'integer') valor = Math.round(valor);
  if ((opcion.min !== undefined && valor < opcion.min) || (opcion.max !== undefined && valor > opcion.max)) return null;
  return { parametros: { ...parametros, [opcion.nombre]: valor }, explicacion: `Puse ${opcion.etiqueta.toLowerCase()} en ${valor}${porcentaje && !escalaUno ? ' %' : ''}.` };
}

/** Texto corto con los valores de un intento: «Intensidad: 30 · Tono: cálido». */
export function resumenValores(valores, opciones) {
  return opciones.map((opcion) => {
    const valor = valores[opcion.origen]?.[opcion.nombre];
    return `${opcion.etiqueta}: ${typeof valor === 'boolean' ? (valor ? 'sí' : 'no') : valor}`;
  }).join(' · ');
}
