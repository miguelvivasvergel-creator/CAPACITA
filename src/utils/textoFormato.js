/** Lectura del formato mínimo de la IA (mismas reglas que backend/connectors/formato.py). */
const TITULO = /^(#{1,6})\s+(.+?)\s*#*$/;
const VINETA = /^[-*•]\s+(.*)$/;
const NUMERO = /^(\d{1,3})[.)]\s+(.*)$/;
const CITA = /^>\s?(.*)$/;
const FILA = /^\|.*\|$/;
const SEPARADOR = /^\|?(\s*:?-{3,}:?\s*\|)+\s*(:?-{3,}:?\s*)?\|?$/;
const REGLA = /^(-{3,}|\*{3,}|_{3,}|—{2,})$/;
export const MARCAS = /\*\*(?=\S)(.+?)(?<=\S)\*\*|(?<![\p{L}\p{N}_*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\p{L}\p{N}_*])/gu;

const celdas = (linea) => linea.trim().replace(/^\||\|$/g, '').split('|').map((celda) => celda.trim());
const especial = (linea) => [TITULO, FILA, CITA, VINETA, NUMERO, REGLA].some((patron) => patron.test(linea));
const sinAsteriscos = (texto) => texto.replace(/^\*+|\*+$/g, '').trim();

export function bloques(texto) {
  const lineas = String(texto ?? '').replace(/\r\n?/g, '\n').split('\n').map((linea) => linea.trim());
  const salida = [];
  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    const titulo = TITULO.exec(linea);
    if (!linea) {
      i += 1;
    } else if (titulo) {
      salida.push({ tipo: 'titulo', nivel: Math.min(titulo[1].length, 3), texto: sinAsteriscos(titulo[2]) });
      i += 1;
    } else if (REGLA.test(linea)) {
      salida.push({ tipo: 'regla' });
      i += 1;
    } else if (FILA.test(linea)) {
      let filas = [];
      while (i < lineas.length && FILA.test(lineas[i])) { filas.push(lineas[i]); i += 1; }
      let encabezado = null;
      if (filas.length > 1 && SEPARADOR.test(filas[1])) { encabezado = celdas(filas[0]); filas = filas.slice(2); }
      salida.push({ tipo: 'tabla', encabezado, filas: filas.filter((fila) => !SEPARADOR.test(fila)).map(celdas) });
    } else if (CITA.test(linea)) {
      const items = [];
      while (i < lineas.length && CITA.test(lineas[i])) { items.push(CITA.exec(lineas[i])[1].trim()); i += 1; }
      salida.push({ tipo: 'cita', items: items.filter(Boolean) });
    } else if (VINETA.test(linea) || NUMERO.test(linea)) {
      const [patron, tipo] = VINETA.test(linea) ? [VINETA, 'lista'] : [NUMERO, 'numerada'];
      const items = [];
      while (i < lineas.length && lineas[i] && patron.test(lineas[i])) {
        const partes = patron.exec(lineas[i]);
        items.push(partes[partes.length - 1].trim());
        i += 1;
      }
      salida.push({ tipo, items });
    } else {
      const parrafo = [];
      while (i < lineas.length && lineas[i] && !(parrafo.length && especial(lineas[i]))) { parrafo.push(lineas[i]); i += 1; }
      // «Lunes 24:» justo antes de una lista es un subtítulo, aunque no lleve «###».
      const siguiente = lineas[i] || '';
      if (parrafo.length === 1 && parrafo[0].endsWith(':') && parrafo[0].length <= 70 && (VINETA.test(siguiente) || NUMERO.test(siguiente))) {
        salida.push({ tipo: 'titulo', nivel: 3, texto: sinAsteriscos(parrafo[0].slice(0, -1)) });
      } else {
        salida.push({ tipo: 'parrafo', items: parrafo });
      }
    }
  }
  return salida;
}

// ¿Vale la pena interpretarlo? Un texto corrido sin marcas se deja como estaba.
export const tieneFormato = (texto) => typeof texto === 'string' && (/\*\*\S/.test(texto)
  || bloques(texto).some((bloque) => bloque.tipo !== 'parrafo'));

/**
 * Quita del texto que la IA escribe para la persona lo que solo entiende el sistema: identificadores
 * de versión (e2c5be52-6246-…), comillas de código y prefijos de contrato (values.instruccion). La IA
 * los copia del catálogo que recibe; en el chat se veían como «códigos raros».
 */
const UUID = /\s*[([]?\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b[)\]]?/gi;
export const limpiarMensaje = (texto) => String(texto ?? '')
  .replace(UUID, '')
  .replace(/`+/g, '')
  .replace(/\b(?:values|bindings|parameters|inputs|outputs)\.(?=[a-z])/gi, '')
  .replace(/\bversion_id\b/gi, 'versión')
  .replace(/\s*\(\s*\)/g, '')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/ ([,.;:])/g, '$1')
  .trim();
