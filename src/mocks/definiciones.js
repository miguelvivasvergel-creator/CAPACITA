// Ejemplo editable del formulario. Nunca se usa como respuesta de la API.
export const ejemploDefinicion = {
  name: 'Normalizar espacios de un texto',
  description: 'Quitar los espacios del inicio y final de un texto, conservando su contenido y sus acentos.',
  category: 'Texto', input_type: 'texto', output_type: 'texto',
  inputs: [{ id: 'ejemplo-entrada', name: 'texto', description: 'Texto que se quiere normalizar', type: 'string', required: true }],
  parameters: [],
  outputs: [{ id: 'ejemplo-salida', name: 'resultado', description: 'Texto sin espacios en los extremos', type: 'string', required: true }],
  constraints: 'Conservar los acentos y los espacios interiores.',
  required_permissions: '', resources: '',
  failure_cases: 'Rechazar una entrada que no contenga texto.',
  example_inputs: '{"texto": "  Árbol de café  "}',
  example_parameters: '{}',
  example_output: '{"resultado": "Árbol de café"}',
};
