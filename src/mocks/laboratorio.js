// Casos falsos para diseñar el editor del laboratorio. Sin fallback de red.
export const casosLaboratorio = [
  { name: 'Acentos y espacios interiores', inputs: { texto: '  Árbol  azul  ' }, parameters: {}, expected_output: { resultado: 'Árbol  azul' }, expect_rejection: false },
  { name: 'Falta texto', inputs: {}, parameters: {}, expected_output: null, expect_rejection: true },
];
