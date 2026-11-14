// Construcción de contratos y ejemplos del formulario; sin llamadas HTTP.
// Solo para propuestas del formato visual acotado del intérprete, no esquemas arbitrarios.
export function definicionAFormulario(definition) {
  const fields = (schema) => Object.entries(schema.properties).map(([name, property]) => ({
    id: crypto.randomUUID(), name, type: property.type, description: property.description || '',
    required: schema.required.includes(name),
    ...(property.type === 'array' ? { itemsType: property.items.type } : {}),
  }));
  const example = definition.examples[0];
  return {
    name: definition.name, description: definition.description, category: definition.category,
    input_type: definition.input_type, output_type: definition.output_type,
    inputs: fields(definition.input_schema), parameters: fields(definition.parameter_schema), outputs: fields(definition.output_schema),
    ...Object.fromEntries(['constraints', 'required_permissions', 'resources', 'failure_cases'].map((key) => [key, definition[key].join('\n')])),
    example_inputs: JSON.stringify(example.inputs, null, 2),
    example_parameters: JSON.stringify(example.parameters, null, 2),
    example_output: JSON.stringify(example.expected_output, null, 2),
  };
}

export function camposAContrato(campos) {
  const names = campos.map((campo) => campo.name.trim());
  if (names.some((name) => !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(name))) {
    throw new Error('Cada campo necesita un nombre de hasta 64 letras, números o guiones bajos, empezando por una letra.');
  }
  if (new Set(names).size !== names.length) throw new Error('No repitas nombres de campo dentro del mismo contrato.');
  return {
    type: 'object',
    properties: Object.fromEntries(campos.map((campo, index) => [names[index], {
      type: campo.type,
      ...(campo.description.trim() ? { description: campo.description.trim() } : {}),
      ...(campo.type === 'array' ? { items: { type: campo.itemsType || 'string' } } : {}),
    }])),
    required: campos.filter((campo) => campo.required).map((campo) => campo.name.trim()),
    additionalProperties: false,
  };
}

function ejemploObjeto(text, label) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error(`El ejemplo de ${label} debe ser JSON válido.`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`El ejemplo de ${label} debe ser un objeto JSON.`);
  return value;
}

export function prepararDefinicion(form) {
  const lines = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    name: form.name, description: form.description, category: form.category,
    input_type: form.input_type, output_type: form.output_type,
    input_schema: camposAContrato(form.inputs), parameter_schema: camposAContrato(form.parameters), output_schema: camposAContrato(form.outputs),
    constraints: lines(form.constraints), required_permissions: lines(form.required_permissions),
    resources: lines(form.resources), failure_cases: lines(form.failure_cases),
    examples: [{
      inputs: ejemploObjeto(form.example_inputs, 'entrada'),
      parameters: ejemploObjeto(form.example_parameters, 'parámetros'),
      expected_output: ejemploObjeto(form.example_output, 'salida esperada'),
    }],
  };
}
