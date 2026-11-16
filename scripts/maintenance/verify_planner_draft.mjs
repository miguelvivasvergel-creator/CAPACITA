import assert from 'node:assert/strict';
import { guardarObjetivoPlan, leerObjetivoPlan, descartarObjetivoPlan, limpiarObjetivosPlan } from '../../src/utils/plannerDraft.js';

class MemoryStorage {
  rows = new Map();
  get length() { return this.rows.size; }
  key(index) { return [...this.rows.keys()][index] ?? null; }
  getItem(key) { return this.rows.get(key) ?? null; }
  setItem(key, value) { this.rows.set(key, value); }
  removeItem(key) { this.rows.delete(key); }
}
const storage = new MemoryStorage();
const objective = 'Normalizar un texto y convertirlo a mayúsculas';
const value = { objective, mode: 'semantic', consent: true, selected: ['private-version'], result: { executed: true } };
const saved = guardarObjetivoPlan('A', value, storage, 1000);
assert.equal(leerObjetivoPlan('A', storage, 1001).objective, objective);
assert.equal(saved.mode, 'semantic');
assert.equal(saved.consent, undefined);
assert.equal(saved.selected, undefined);
assert.equal(saved.result, undefined);
assert.equal(leerObjetivoPlan('B', storage, 1001), null);
const id = '11111111-1111-4111-8111-111111111111';
guardarObjetivoPlan('A', { ...value, capabilityId: id }, storage, 1000);
assert.equal(leerObjetivoPlan('A', storage, 1001).capabilityId, id);
assert.equal(guardarObjetivoPlan('A', { ...value, capabilityId: '../other' }, storage, 1000), null);
assert.equal(leerObjetivoPlan('A', storage, 49 * 60 * 60 * 1000), null);
assert.equal(storage.length, 0);
guardarObjetivoPlan('A', value, storage, 1000);
storage.setItem(storage.key(0), '{malformed');
assert.equal(leerObjetivoPlan('A', storage, 1001), null);
const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
assert.equal(guardarObjetivoPlan('A', value, blocked), null);
assert.equal(leerObjetivoPlan('A', blocked), null);
guardarObjetivoPlan('A', value, storage, 1000);
guardarObjetivoPlan('B', value, storage, 1000);
storage.setItem('unrelated-auth-key', 'keep');
limpiarObjetivosPlan('B', storage);
assert.equal(leerObjetivoPlan('A', storage, 1001), null);
assert.equal(leerObjetivoPlan('B', storage, 1001).objective, objective);
descartarObjetivoPlan('B', storage);
assert.equal(leerObjetivoPlan('B', storage, 1001), null);
guardarObjetivoPlan('B', value, storage, 1000);
limpiarObjetivosPlan(null, storage);
assert.equal(storage.length, 1);
assert.equal(storage.getItem('unrelated-auth-key'), 'keep');
console.log('Planner draft: contexto, aislamiento, vinculación, expiración, datos dañados, almacenamiento bloqueado, cambio de cuenta y cierre de sesión correctos.');
