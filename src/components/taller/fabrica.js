// Lógica pura de la fábrica: casos de prueba, cuándo corregir y qué contarle a la IA.
// El informe del entorno aislado nunca trae la salida del código; solo pistas seguras.
import { conMuestras } from '../../utils/archivos';

const CORREGIBLES = new Set(['output_mismatch', 'candidate_error', 'invalid_json_output', 'timeout', 'output_limit', 'memory_limit']);
const MOTIVOS = {
  output_mismatch: 'devolvió un resultado distinto al esperado',
  candidate_error: 'terminó con una excepción',
  invalid_json_output: 'no devolvió un dict JSON válido',
  timeout: 'superó el tiempo límite de ejecución',
  output_limit: 'produjo una salida demasiado grande',
  memory_limit: 'superó el límite de memoria',
};

// Los archivos de los ejemplos ("MUESTRA:foto"…) se cambian por archivos reales de prueba.
export const casosDesdeEjemplos = (ejemplos) => Promise.all(ejemplos.map(async (ejemplo, index) => ({
  name: `Ejemplo ${index + 1}`, inputs: await conMuestras(ejemplo.inputs), parameters: ejemplo.parameters || {},
  expected_output: ejemplo.expected_output, expect_rejection: false,
})));

// Solo vale la pena corregir el código si cada fallo se debe al código, no al entorno o al ejemplo.
export function pruebaReparable(build) {
  const fallidos = (build.report?.cases || []).filter((caso) => !caso.passed);
  return build.status === 'failed' && !build.report?.error && fallidos.length > 0
    && fallidos.every((caso) => CORREGIBLES.has(caso.reason));
}

export function observacionPruebas(definicion, build) {
  const json = (valor) => JSON.stringify(valor ?? {});
  const partes = (build.report?.cases || []).filter((caso) => !caso.passed).map((caso) => {
    const ejemplo = definicion.examples?.[caso.index] || {};
    let detalle = MOTIVOS[caso.reason] || caso.reason;
    if (caso.error_type) detalle += ` (${caso.error_type})`;
    if (caso.reason === 'output_mismatch') {
      detalle += caso.schema_valid === false ? '; la salida no cumple output_schema'
        : `; campos con valor distinto: ${(caso.mismatched_fields || []).join(', ') || 'no identificados'}`;
    }
    return `Ejemplo ${caso.index + 1}: entradas ${json(ejemplo.inputs)}, parámetros ${json(ejemplo.parameters)}, salida esperada ${json(ejemplo.expected_output)}. El código ${detalle}.`;
  });
  return `Las pruebas en el entorno aislado fallaron. ${partes.join(' ')} ${JSON.stringify(definicion.examples || []).includes('MUESTRA:') ? 'MUESTRA:x en las entradas es un archivo real en base64; ARCHIVO en la salida exige base64 válido del contentMediaType. ' : ''}Corrige el código para cumplir los ejemplos y el contrato completo.`.slice(0, 1500);
}
