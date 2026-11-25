// Los ejemplos de una herramienta nueva, en palabras. Antes la tarjeta mostraba el JSON tal cual
// ({"original":"MUESTRA:pdf",…} → {"documento_marcado":"ARCHIVO",…}): en el modo guiado nadie
// tiene por qué leer JSON ni saber qué es «MUESTRA:pdf».

const MUESTRAS = {
  foto: 'una foto de muestra',
  png: 'una imagen de muestra',
  pdf: 'el PDF de muestra',
  pdf2: 'el PDF de muestra con cambios',
  word: 'el Word de muestra',
  word2: 'el Word de muestra con cambios',
  excel: 'la hoja de Excel de muestra',
};

const nombre = (campo, spec) => (spec?.title || campo.replace(/_/g, ' ')).trim();

function valor(dato) {
  if (typeof dato === 'string' && dato.startsWith('MUESTRA:')) return MUESTRAS[dato.slice(8).toLowerCase()] || 'un archivo de muestra';
  if (dato === 'ARCHIVO') return 'un archivo';
  if (typeof dato === 'boolean') return dato ? 'sí' : 'no';
  if (typeof dato === 'number') return dato.toLocaleString('es-CO');
  if (typeof dato === 'string') return `«${dato.length > 60 ? `${dato.slice(0, 57)}…` : dato}»`;
  if (Array.isArray(dato)) return `${dato.length} elemento${dato.length === 1 ? '' : 's'}`;
  if (dato && typeof dato === 'object') return 'un grupo de datos';
  return 'nada';
}

const lista = (datos, esquema) => Object.entries(datos || {})
  .map(([campo, dato]) => `${nombre(campo, esquema?.properties?.[campo])}: ${valor(dato)}`).join(' · ');

/** { entrega, espera } en frases cortas para la tarjeta «Así sabré que funciona». */
export function ejemploLegible(ejemplo, definicion = {}) {
  return {
    entrega: lista(ejemplo?.inputs, definicion.input_schema) || 'sin datos',
    espera: lista(ejemplo?.expected_output, definicion.output_schema) || 'un resultado válido',
  };
}
