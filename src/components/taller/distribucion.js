/**
 * Posición de cada nodo del taller por CAPAS según sus conexiones (no por su número de paso):
 * columna = profundidad en el grafo, así las consultas que van en paralelo quedan apiladas en la misma
 * columna y se ve qué alimenta a qué (Tus datos → consultas → IA que junta → envíos → Resultado).
 * Una conexión que salta columnas reserva un "carril" (nodo virtual) en cada columna que atraviesa, así
 * ningún paso queda encima de una flecha ajena. Dentro de cada columna se ordenan por la altura media de
 * quienes les dan datos (menos cruces) y se centran en vertical. Sin dependencias: se prueba con `node --test`.
 */
export const ANCHO_COLUMNA = 290;
export const ALTO_FILA = 150;

/** Conexiones del mapa (las mismas que se dibujan): datos entre pasos, Tus datos → pasos sin entradas y pasos → Resultado. */
export function conexiones(definicion) {
  const lista = new Map();
  const agregar = (source, target) => lista.set(`${source}>${target}`, { source, target });
  for (const node of definicion?.nodes || []) {
    const bindings = Object.values(node.bindings || {});
    for (const binding of bindings) agregar(binding.source, node.id);
    if (!bindings.length) agregar('$input', node.id);
  }
  for (const binding of Object.values(definicion?.outputs || {})) agregar(binding.source, '$output');
  return lista;
}

export function distribuir(definicion) {
  const nodos = definicion?.nodes || [];
  const ids = new Set(nodos.map((node) => node.id));
  const fuentes = new Map(nodos.map((node) => [node.id, [...new Set(Object.values(node.bindings || {})
    .map((binding) => binding.source).filter((source) => ids.has(source)))]]));
  const nivel = new Map([['$input', 0]]);
  const calcular = (id, visitando = new Set()) => {
    if (nivel.has(id)) return nivel.get(id);
    if (visitando.has(id)) return 1; // un ciclo no debería existir: no se cuelga
    visitando.add(id);
    const previos = fuentes.get(id) || [];
    const valor = previos.length ? 1 + Math.max(...previos.map((p) => calcular(p, visitando))) : 1;
    nivel.set(id, valor);
    return valor;
  };
  nodos.forEach((node) => calcular(node.id));
  const ultimo = nodos.length ? Math.max(...nodos.map((node) => nivel.get(node.id))) : 0;
  // Los pasos finales (nadie depende de ellos: los envíos) van todos en la última columna, junto al
  // Resultado: así su flecha al Resultado no cruza por detrás de otro paso.
  const usados = new Set([...fuentes.values()].flat());
  nodos.filter((node) => !usados.has(node.id)).forEach((node) => nivel.set(node.id, ultimo));
  nivel.set('$output', ultimo + 1);

  // Grafo de capas: cada conexión que salta columnas pasa por un nodo virtual en cada columna intermedia.
  const orden = new Map(nodos.map((node, indice) => [node.id, indice]));
  orden.set('$output', nodos.length);
  const previos = new Map([...nivel.keys()].map((id) => [id, []]));
  for (const { source, target } of conexiones(definicion).values()) {
    if (!nivel.has(source) || !nivel.has(target) || nivel.get(target) <= nivel.get(source)) continue;
    let anterior = source;
    for (let n = nivel.get(source) + 1; n < nivel.get(target); n += 1) {
      const virtual = `~${source}>${target}#${n}`;
      nivel.set(virtual, n);
      orden.set(virtual, orden.get(target) ?? nodos.length);
      previos.set(virtual, [anterior]);
      anterior = virtual;
    }
    previos.get(target).push(anterior);
  }

  const columnas = new Map();
  for (const [id, n] of nivel) columnas.set(n, [...(columnas.get(n) || []), id]);
  const posiciones = new Map();
  for (const n of [...columnas.keys()].sort((a, b) => a - b)) {
    const fila = columnas.get(n);
    const altura = (id) => {
      const ys = (previos.get(id) || []).map((p) => posiciones.get(p)?.y).filter((y) => y !== undefined);
      return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
    };
    fila.sort((a, b) => altura(a) - altura(b) || (orden.get(a) ?? 0) - (orden.get(b) ?? 0));
    fila.forEach((id, i) => posiciones.set(id, { x: n * ANCHO_COLUMNA, y: (i - (fila.length - 1) / 2) * ALTO_FILA }));
  }
  for (const id of [...posiciones.keys()]) if (id.startsWith('~')) posiciones.delete(id);
  return posiciones;
}

/** Tipo visual de un paso según su conector (consulta, IA, envío) o herramienta propia. */
export function tipoDePaso(conector) {
  if (!conector) return 'propia';
  if (conector.ia) return 'ia';
  if (conector.accion) return 'accion';
  return 'consulta';
}
