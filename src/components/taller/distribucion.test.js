// Se ejecuta con: node --test src/components/taller/distribucion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALTO_FILA, ANCHO_COLUMNA, conexiones, distribuir, tipoDePaso } from './distribucion.js';

const paso = (id, ...fuentes) => ({ id, bindings: Object.fromEntries(fuentes.map((f, i) => [`d${i}`, { source: f, field: 'x' }])) });

test('las consultas en paralelo se apilan en la misma columna y la IA que las junta va después', () => {
  const posiciones = distribuir({ nodes: [paso('clima'), paso('sol'), paso('festivos'), paso('ia', 'clima', 'sol', 'festivos'),
    paso('telegram', 'ia'), paso('traducir', 'ia'), paso('correo', 'traducir')] });
  const x = (id) => posiciones.get(id).x / ANCHO_COLUMNA;
  assert.deepEqual(['clima', 'sol', 'festivos'].map(x), [1, 1, 1]);
  assert.equal(x('ia'), 2);
  assert.equal(x('traducir'), 3);
  // Los envíos finales (Telegram y correo) quedan juntos en la última columna, junto al Resultado.
  assert.deepEqual([x('telegram'), x('correo')], [4, 4]);
  assert.deepEqual([x('$input'), x('$output')], [0, 5]);
  const ys = ['clima', 'sol', 'festivos'].map((id) => posiciones.get(id).y);
  assert.equal(new Set(ys).size, 3); // no se pisan
  assert.equal(ys.reduce((a, b) => a + b, 0), 0); // centradas en vertical
});

test('una flecha que salta columnas no pasa por detrás de otro paso', () => {
  // ia → telegram salta la columna de "traducir": traducir debe correrse de la línea de esa flecha.
  const posiciones = distribuir({ nodes: [paso('clima'), paso('ia', 'clima'), paso('telegram', 'ia'), paso('traducir', 'ia'),
    paso('correo', 'traducir')] });
  const ia = posiciones.get('ia');
  const telegram = posiciones.get('telegram');
  const traducir = posiciones.get('traducir');
  const lineaEnTraducir = ia.y + ((telegram.y - ia.y) * (traducir.x - ia.x)) / (telegram.x - ia.x);
  assert.ok(Math.abs(traducir.y - lineaEnTraducir) >= ALTO_FILA / 2, 'traducir queda sobre la flecha ia → telegram');
  assert.ok(![...posiciones.keys()].some((id) => id.startsWith('~')), 'los carriles virtuales no se dibujan');
});

test('las conexiones dibujadas incluyen Tus datos, datos entre pasos y Resultado', () => {
  const lista = conexiones({ nodes: [paso('a'), paso('b', 'a')], outputs: { r: { source: 'b', field: 'x' } } });
  assert.deepEqual([...lista.keys()], ['$input>a', 'a>b', 'b>$output']);
});

test('un plan vacío o con un ciclo no rompe el taller', () => {
  assert.deepEqual([...distribuir({ nodes: [] }).keys()].sort(), ['$input', '$output']);
  const ciclo = distribuir({ nodes: [paso('a', 'b'), paso('b', 'a')] });
  assert.ok(ciclo.has('a') && ciclo.has('b'));
});

test('tipo visual de cada paso', () => {
  assert.equal(tipoDePaso(undefined), 'propia');
  assert.equal(tipoDePaso({ ia: true }), 'ia');
  assert.equal(tipoDePaso({ accion: true }), 'accion');
  assert.equal(tipoDePaso({ proveedor: 'Open-Meteo' }), 'consulta');
});
