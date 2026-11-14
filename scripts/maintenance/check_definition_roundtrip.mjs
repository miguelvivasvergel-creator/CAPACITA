// Comprueba que cargar/revisar una propuesta visual conserva contratos y ejemplo.
import assert from 'node:assert/strict';
import { definicionAFormulario, prepararDefinicion } from '../../src/utils/definiciones.js';

const definition = {
  name: 'Comprobar contrato visual', description: 'Referencia de integración entre propuesta y formulario.',
  category: 'Datos', input_type: 'datos', output_type: 'datos',
  input_schema: {
    type: 'object', properties: {
      texto: { type: 'string', description: 'Texto con acentos' },
      cantidad: { type: 'integer' }, activo: { type: 'boolean' },
      valores: { type: 'array', items: { type: 'number' } },
      opciones: { type: 'object' },
    }, required: ['texto', 'valores'], additionalProperties: false,
  },
  parameter_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  output_schema: { type: 'object', properties: { resultado: { type: 'array', items: { type: 'object' } } }, required: ['resultado'], additionalProperties: false },
  constraints: ['Conservar acentos'], required_permissions: [], resources: [], failure_cases: ['Rechazar tipos incorrectos'],
  examples: [{ inputs: { texto: 'Árbol', valores: [1, 2.5] }, parameters: {}, expected_output: { resultado: [{ valor: 'Árbol' }] } }],
};
assert.deepEqual(prepararDefinicion(definicionAFormulario(definition)), definition);
console.log('OK: propuesta visual → formulario → definición conserva contratos, campos opcionales, listas, objetos y ejemplo.');
