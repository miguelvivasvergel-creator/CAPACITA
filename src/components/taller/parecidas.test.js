// Se ejecuta con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { herramientasParecidas } from './parecidas.js';

const version = (capability_id, name, description, created_at = '2026-11-20') => ({ id: `v-${capability_id}`, capability_id, name, description, created_at });
const comparar = version('c1', 'comparar_documentos', 'Compara dos documentos y subraya las diferencias');
const traducir = version('c2', 'Traducir texto', 'Traduce un texto a otro idioma');
const clima = version('c3', 'Clima en una ciudad', 'Consulta el pronóstico del tiempo');
const telegram = version('c4', 'Enviarme por Telegram', 'Manda un mensaje a tu Telegram');
const catalogo = [comparar, traducir, clima, telegram];

test('reconoce una herramienta existente aunque el pedido use otras formas de las palabras', () => {
  assert.deepEqual(herramientasParecidas(catalogo, 'compara mis documentos'), [comparar]);
  assert.deepEqual(herramientasParecidas(catalogo, 'necesito una traducción de este texto'), [traducir]);
  assert.deepEqual(herramientasParecidas(catalogo, 'Quiero comparar dos documentos PDF'), [comparar]);
});

test('un pedido de una sola palabra con significado también la encuentra', () => {
  assert.deepEqual(herramientasParecidas(catalogo, 'traducir'), [traducir]);
});

test('no ofrece nada si el pedido no se parece o necesita varias piezas', () => {
  assert.deepEqual(herramientasParecidas(catalogo, 'hazme un póster para mi heladería'), []);
  // El clima existe, pero «…por Telegram» es otra herramienta: la IA debe combinar ambas.
  assert.deepEqual(herramientasParecidas(catalogo, 'el clima de mañana enviado por Telegram'), []);
});

test('solo ofrece las que el chat puede usar y una por herramienta (la más reciente)', () => {
  const vieja = version('c1', 'comparar_documentos', 'Compara documentos', '2026-11-01');
  assert.deepEqual(herramientasParecidas([vieja, comparar], 'compara documentos'), [comparar]);
  assert.deepEqual(herramientasParecidas(catalogo, 'compara documentos', (item) => item !== comparar), []);
});
