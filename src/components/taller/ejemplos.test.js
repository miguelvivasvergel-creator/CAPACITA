// Se ejecuta con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ejemploLegible } from './ejemplos.js';

test('el ejemplo de comparar PDF se lee en palabras, sin JSON ni MUESTRA:', () => {
  const ejemplo = { inputs: { original: 'MUESTRA:pdf', nueva: 'MUESTRA:pdf2' },
    expected_output: { documento_marcado: 'ARCHIVO', cambios: 2, palabras_agregadas: 8 } };
  const { entrega, espera } = ejemploLegible(ejemplo);
  assert.equal(entrega, 'original: el PDF de muestra · nueva: el PDF de muestra con cambios');
  assert.equal(espera, 'documento marcado: un archivo · cambios: 2 · palabras agregadas: 8');
  assert.ok(!`${entrega}${espera}`.includes('MUESTRA') && !`${entrega}${espera}`.includes('{'));
});

test('usa el título del campo si lo tiene y abrevia textos largos', () => {
  const definicion = { input_schema: { properties: { texto: { title: 'Texto a traducir' } } } };
  const { entrega, espera } = ejemploLegible({ inputs: { texto: 'x'.repeat(80), formal: true }, expected_output: {} }, definicion);
  assert.match(entrega, /^Texto a traducir: «x{57}…» · formal: sí$/);
  assert.equal(espera, 'un resultado válido');
});
