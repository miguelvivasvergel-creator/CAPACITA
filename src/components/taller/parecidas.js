/**
 * Herramientas del catálogo que se parecen a lo pedido, para ofrecer usarlas sin IA en vez de crear
 * otra igual. Compara por RAÍZ de palabra (src/utils/buscar.js): «compara mis documentos» reconoce
 * «comparar_documentos». Sin dependencias de React: se prueba con `node --test`.
 */
import { encaja, raices } from '../../utils/buscar.js';

// Nombres internos en camelCase o snake_case → palabras («compararDocumentos» → «comparar Documentos»).
const legible = (texto) => String(texto || '').replace(/([a-z])([A-Z])/g, '$1 $2');
const contiene = (propias, buscada) => propias.some((propia) => encaja(buscada, propia));

/**
 * @param items versiones disponibles ({ id, capability_id, name, description, created_at })
 * @param objetivo lo que escribió la persona
 * @param usable (item) => si el chat puede ejecutarla directo
 * @returns hasta 3 versiones, la más parecida primero; [] si el pedido necesita varias piezas
 */
export function herramientasParecidas(items, objetivo, usable = () => true) {
  // «(Adjunté un Excel como entrada.)» lo agrega el chat: no cuenta como parte del pedido.
  const pedido = raices(String(objetivo || '').replace(/\n\(Adjunté [^)]*\)\s*$/, '')).filter((r) => r.length >= 3);
  if (!pedido.length) return [];
  const vistas = new Set();
  const candidatas = items.map((item) => {
    const propias = raices(`${legible(item.name)} ${item.description || ''}`);
    const comunes = pedido.filter((buscada) => contiene(propias, buscada)).length;
    return { item, propias, puntos: comunes / pedido.length, comunes };
  // Un pedido de una sola palabra con significado («traducir») también puede encajar.
  }).filter(({ item, comunes, puntos }) => comunes >= Math.min(2, pedido.length) && puntos >= 0.4 && usable(item))
    .sort((a, b) => b.puntos - a.puntos || String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')))
    .filter(({ item }) => !vistas.has(item.capability_id) && vistas.add(item.capability_id));
  if (!candidatas.length) return [];
  // Si el pedido nombra algo que la mejor herramienta no hace pero el NOMBRE de otra sí («…por
  // Telegram» → «Enviarme por Telegram»), hacen falta varias: mejor que la IA arme el proceso.
  const sobrantes = pedido.filter((buscada) => !contiene(candidatas[0].propias, buscada));
  const otrosNombres = items.filter((item) => item.capability_id !== candidatas[0].item.capability_id)
    .map((item) => raices(legible(item.name)));
  if (sobrantes.some((buscada) => otrosNombres.some((nombre) => contiene(nombre, buscada)))) return [];
  return candidatas.slice(0, 3).map(({ item }) => item);
}
