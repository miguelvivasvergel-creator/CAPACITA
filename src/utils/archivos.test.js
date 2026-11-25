import test from 'node:test';
import assert from 'node:assert/strict';
import { describirAdjuntos, sirvePara, tomarAdjunto } from './archivos.js';

const PDF = 'application/pdf', JPG = 'image/jpeg';
const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const archivo = (name, type = '') => ({ name, type });

test('describe tipos y cantidades de los adjuntos, sin nombres', () => {
  assert.equal(describirAdjuntos([]), '');
  assert.equal(describirAdjuntos([archivo('a.pdf', PDF)]), 'un PDF');
  assert.equal(describirAdjuntos([archivo('v1.pdf', PDF), archivo('v2.PDF', PDF)]), '2 PDF');
  assert.equal(describirAdjuntos([archivo('a.pdf'), archivo('logo.png', 'image/png'), archivo('b.pdf')]), 'una foto y 2 PDF');
  assert.equal(describirAdjuntos([archivo('a.docx'), archivo('b.xlsx'), archivo('c.zip')]), 'un documento Word, un Excel y un archivo');
});

test('cada campo toma, en orden, el primer adjunto que le sirve', () => {
  const lista = [archivo('logo.png', 'image/png'), archivo('v1.pdf'), archivo('v2.pdf')];
  const primero = tomarAdjunto(lista, PDF);
  assert.equal(primero.archivo.name, 'v1.pdf');
  const segundo = tomarAdjunto(primero.resto, PDF);
  assert.equal(segundo.archivo.name, 'v2.pdf');
  const foto = tomarAdjunto(segundo.resto, JPG);
  assert.equal(foto.archivo.name, 'logo.png');
  assert.deepEqual(foto.resto, []);
});

test('si ningún adjunto sirve, no se toma nada y la lista queda igual', () => {
  const lista = [archivo('v1.pdf')];
  const nada = tomarAdjunto(lista, WORD);
  assert.equal(nada.archivo, null);
  assert.equal(nada.resto, lista);
  assert.equal(sirvePara(archivo('foto.jpg', JPG), PDF), false);
  assert.equal(sirvePara(archivo('cualquiera.bin'), 'application/octet-stream'), true);
  assert.equal(sirvePara(null, PDF), false);
});
