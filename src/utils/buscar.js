/**
 * Búsqueda en español para la biblioteca y para reconocer en el chat una herramienta que ya existe.
 * Compara por RAÍZ de palabra, sin tildes ni mayúsculas: «compara mis documentos» encuentra
 * «comparar_documentos», «resumen» encuentra «resumir» y «hel» encuentra «Helados del mes» mientras se
 * escribe. Sin dependencias: se prueba con `node --test`.
 */

// Palabras que no dicen qué hace una herramienta: se ignoran al comparar.
const VACIAS = new Set(['a', 'al', 'algo', 'cada', 'como', 'con', 'cual', 'dame', 'de', 'del', 'desde', 'e', 'el', 'en', 'entre', 'es',
  'esa', 'ese', 'eso', 'esta', 'este', 'esto', 'favor', 'hacer', 'hazme', 'herramienta', 'la', 'las', 'le', 'lo', 'los', 'me', 'mi',
  'mis', 'necesito', 'o', 'otra', 'otro', 'para', 'por', 'puede', 'puedes', 'puedo', 'que', 'quiero', 'se', 'sobre', 'su', 'sus',
  'te', 'tiene', 'toda', 'todo', 'todos', 'tu', 'tus', 'u', 'un', 'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo']);

// De la más larga a la más corta: se quita la primera que deje una raíz de al menos 3 letras.
const SUFIJOS = ['aciones', 'iciones', 'amiento', 'imiento', 'ciones', 'acion', 'icion', 'mente', 'iendo', 'ando', 'adas', 'idas',
  'ados', 'idos', 'enes', 'cion', 'ada', 'ida', 'ado', 'ido', 'ar', 'er', 'ir', 'en', 'as', 'es', 'os', 'a', 'e', 'o', 's'];

/** Texto en minúsculas, sin tildes y con `_`/`-` como espacios (los nombres internos usan guion bajo). */
export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

export function raiz(palabra) {
  for (const sufijo of SUFIJOS) {
    if (palabra.endsWith(sufijo) && palabra.length - sufijo.length >= 3) return palabra.slice(0, -sufijo.length);
  }
  return palabra;
}

/** Raíces de las palabras con significado de un texto (sin repetir). */
export function raices(texto) {
  return [...new Set(normalizar(texto).split(' ').filter((palabra) => palabra && !VACIAS.has(palabra)).map(raiz))];
}

// Una raíz buscada encaja con una del texto si es su comienzo (se está escribiendo) o si comparten
// la raíz completa (comparación ↔ comparar).
export const encaja = (buscada, delTexto) => delTexto.startsWith(buscada) || (buscada.length >= 4 && delTexto.length >= 4 && buscada.startsWith(delTexto));

/** ¿El texto contiene TODAS las palabras buscadas? Una búsqueda vacía lo deja pasar todo. */
export function coincide(texto, busqueda) {
  const buscadas = raices(busqueda);
  if (!buscadas.length) return true;
  const delTexto = raices(texto);
  return buscadas.every((buscada) => delTexto.some((propia) => encaja(buscada, propia)));
}

/** Parecido entre un pedido y un texto, de 0 a 1: parte de las palabras del pedido que aparecen en el texto. */
export function parecido(pedido, texto) {
  const buscadas = raices(pedido).filter((r) => r.length >= 3);
  if (!buscadas.length) return 0;
  const delTexto = raices(texto);
  return buscadas.filter((buscada) => delTexto.some((propia) => encaja(buscada, propia))).length / buscadas.length;
}
