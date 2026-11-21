// Se ejecuta con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coincide, normalizar, parecido, raices } from './buscar.js';

test('normaliza tildes, mayúsculas y guiones bajos', () => {
  assert.equal(normalizar('Comparar_Documentos · Reseñas Ágiles'), 'comparar documentos resenas agiles');
});

test('formas distintas de la misma palabra tienen la misma raíz', () => {
  const misma = (a, b) => assert.deepEqual(raices(a), raices(b), `${a} ↔ ${b}`);
  misma('compara', 'comparar');
  misma('documentos', 'documento');
  misma('traducir', 'traducción');
  misma('enviar', 'envío');
  misma('imágenes', 'imagen');
});

test('la búsqueda encuentra por raíz, por comienzo y exige todas las palabras', () => {
  assert.ok(coincide('comparar_documentos: subraya diferencias', 'compara mis documentos'));
  assert.ok(coincide('Helados del mes', 'hel'));
  assert.ok(coincide('Resumir un PDF largo', 'resumen pdf'));
  assert.ok(coincide('Clima de mañana a Telegram', 'TELEGRAM clima'));
  assert.ok(!coincide('Clima de mañana a Telegram', 'clima correo'));
  assert.ok(coincide('cualquier cosa', '   '));
});

test('el parecido mide qué parte del pedido describe el texto', () => {
  assert.equal(parecido('compara mis documentos', 'comparar_documentos'), 1);
  assert.ok(parecido('quiero el clima de Santa Marta', 'Clima en una ciudad') >= 0.3);
  assert.equal(parecido('hazme un póster', 'Clima en una ciudad'), 0);
  assert.equal(parecido('', 'lo que sea'), 0);
});
