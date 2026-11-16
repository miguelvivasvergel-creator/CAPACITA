// Fixtures de desarrollo del espacio A/B3; nunca se importan como fallback de red.
export const capId = '11111111-1111-4111-8111-111111111111';
export const candidateId = '22222222-2222-4222-8222-222222222222';
export const versionId = '33333333-3333-4333-8333-333333333333';
const schema = { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'], additionalProperties: false };
export const definition = { name: 'Normalizar prueba', description: 'Quitar espacios', input_schema: schema,
  parameter_schema: { type: 'object', properties: {}, additionalProperties: false },
  output_schema: { ...schema, properties: { resultado: { type: 'string' } }, required: ['resultado'] },
  examples: [{ inputs: { texto: '  Árbol  ' }, parameters: {}, expected_output: { resultado: 'Árbol' } }] };
export const candidate = { id: candidateId, provider: 'gemini', model: 'fixture', manifest: { definition,
  artifact_hash: 'a'.repeat(64), proposal: { source: 'def run(inputs, parameters): return inputs' } } };
