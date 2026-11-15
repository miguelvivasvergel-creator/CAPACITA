// Fixture visual: nunca fallback de API ni evidencia de ejecución real.
export const workflowMock = {
  format_version: 1, name: 'Proceso de texto', description: '',
  input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'], additionalProperties: false },
  nodes: [
    { id: 'limpiar', version_id: '00000000-0000-4000-8000-000000000001', label: 'Limpiar', parameters: {}, values: {}, bindings: { texto: { source: '$input', field: 'texto' } }, x: 300, y: 0 },
    { id: 'transformar', version_id: '00000000-0000-4000-8000-000000000002', label: 'Transformar', parameters: {}, values: {}, bindings: { texto: { source: 'limpiar', field: 'resultado' } }, x: 600, y: 0 },
  ],
  outputs: { resultado: { source: 'transformar', field: 'resultado' } },
};
