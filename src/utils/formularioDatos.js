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

// Datos que el chat sabe pedir como mensajes, uno por uno: textos, números y archivos.
// Devuelve los campos obligatorios en orden (archivos primero) o null si hace falta formulario.
const NOMBRE_ARCHIVO = (media) => (media.startsWith('image/') ? 'Tu foto' : media === 'application/pdf' ? 'Tu PDF'
  : media.includes('word') ? 'Tu documento Word' : media.includes('sheet') ? 'Tu Excel' : 'Tu archivo');

export function camposChat(schema) {
  const propiedades = Object.entries(schema?.properties || {});
  if (schema?.type !== 'object' || !propiedades.length || propiedades.length > 6 || !admiteFormulario(schema)) return null;
  const simple = ([, spec]) => spec.contentEncoding === 'base64' || (['string', 'number', 'integer'].includes(spec.type) && !spec.enum && !spec.format);
  if (!propiedades.every(simple)) return null;
  const campos = propiedades.filter(([nombre]) => schema.required?.includes(nombre)).map(([nombre, spec]) => {
    const archivo = spec.contentEncoding === 'base64' ? spec.contentMediaType || 'application/octet-stream' : null;
    // «Imagen JPEG codificada en base64» no le dice nada a una persona: se nombra el archivo.
    const tecnica = /base ?64|codificad|encoded|mime/i.test(spec.description || '');
    const descripcion = spec.description && spec.description.length <= 80 && !(archivo && tecnica) ? spec.description.replace(/\.$/, '') : '';
    return { nombre, tipo: spec.type, archivo,
      etiqueta: spec.title || descripcion || (archivo ? NOMBRE_ARCHIVO(archivo) : nombre.replaceAll('_', ' ')) };
  });
  return campos.length ? [...campos.filter((c) => c.archivo), ...campos.filter((c) => !c.archivo)] : null;
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
