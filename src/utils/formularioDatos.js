// Un objeto sin additionalProperties (como los que escribe el planner) se acepta: el
// formulario solo llena los campos declarados y el backend valida con el esquema real.
export function admiteFormulario(schema, depth = 0) {
  if (!schema || depth > 6 || ['$ref', 'oneOf', 'anyOf', 'allOf', 'not', 'if', 'patternProperties'].some(key => key in schema)) return false;
  if (schema.enum) return schema.enum.every(value => value === null || ['string', 'boolean', 'number'].includes(typeof value));
  if (schema.type === 'object') return [undefined, false].includes(schema.additionalProperties) && Object.values(schema.properties || {}).every(value => admiteFormulario(value, depth + 1));
  if (schema.type === 'array') return admiteFormulario(schema.items, depth + 1);
  return ['string', 'number', 'integer', 'boolean'].includes(schema.type);
}
export function datosIniciales(schema, depth = 0) {
  if(depth>6)return undefined;
  if (schema?.type === 'object') return Object.fromEntries(Object.entries(schema.properties || {}).filter(([key]) => schema.required?.includes(key)).map(([key, spec]) => [key, datosIniciales(spec,depth+1)]));
  if (schema?.enum) return undefined;
  if (schema?.type === 'array') return [];
  if (schema?.type === 'boolean') return false;
  return undefined;
}
export function nombreCampo(name, schema) { return schema.title || name.replaceAll('_', ' '); }

// Un único dato simple (texto o número) se puede pedir como mensaje del chat.
export function campoUnico(schema) {
  const propiedades = Object.entries(schema?.properties || {});
  if (schema?.type !== 'object' || propiedades.length !== 1 || !admiteFormulario(schema)) return null;
  const [[nombre, spec]] = propiedades;
  if (!['string', 'number', 'integer'].includes(spec.type) || spec.enum || spec.format) return null;
  const descripcion = spec.description && spec.description.length <= 80 ? spec.description.replace(/\.$/, '') : '';
  return { nombre, tipo: spec.type, etiqueta: spec.title || descripcion || nombre.replaceAll('_', ' ') };
}

// Orden de lectura; el backend sigue validando y fijando el orden de ejecución.
export function pasosEnOrden(nodes) {
  const pending=[...nodes],ordered=[],done=new Set();
  while(pending.length){
    const index=pending.findIndex(node=>Object.values(node.bindings||{}).every(binding=>binding.source==='$input'||done.has(binding.source)));
    if(index<0)return nodes;
    const [node]=pending.splice(index,1);ordered.push(node);done.add(node.id);
  }
  return ordered;
}
