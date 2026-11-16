import assert from 'node:assert/strict';
import { contarPaginas } from '../../src/utils/dashboard.js';

let calls = [];
const result = await contarPaginas(async (cursor) => {
  calls.push(cursor);
  return cursor ? { items: [{ id: 'a', status: 'completed' }, { id: 'b', status: 'failed' }], next_cursor: null }
    : { items: [{ id: 'a', status: 'completed' }], next_cursor: 'a' };
});
assert.deepEqual(calls, [undefined, 'a']);
assert.deepEqual(result, { count: 2, truncated: false, states: { completed: 1, failed: 1 } });
assert.deepEqual(await contarPaginas(async () => ({ items: [], next_cursor: null })), { count: 0, truncated: false, states: {} });
const partial = await contarPaginas(async () => ({ items: [{ id: 'a' }], next_cursor: 'a' }), undefined, 1);
assert.equal(partial.truncated, true);
await assert.rejects(contarPaginas(async () => ({ items: [], next_cursor: 'repeated' })), /paginación/);
await assert.rejects(contarPaginas(async (cursor) => {
  if (cursor) throw new Error('Servicio caído');
  return { items: [{ id: 'a' }], next_cursor: 'a' };
}), /Servicio caído/);
const controller = new AbortController();
await assert.rejects(contarPaginas(async () => {
  controller.abort();
  return { items: [{ id: 'a' }], next_cursor: null };
}, controller.signal), { name: 'AbortError' });
await assert.rejects(contarPaginas(async () => ({ items: [] })), /inválida/);
console.log('Dashboard: 7 comprobaciones superadas (paginación, duplicados, vacío, límite, errores, cancelación y contrato).');
