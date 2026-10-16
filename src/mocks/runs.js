/**
 * Datos falsos para la pantalla de Ejecución del Módulo D (Fahida).
 * Reemplazan a GET /workflows/{id} (Módulo C) mientras ese endpoint no exista.
 * Los ids, pasos y permisos coinciden con backend/repositories/memoria.py.
 */

export const mockEjecutables = [
  {
    id: 'wf-001',
    tipo: 'workflow',
    name: 'PDF a resumen en español',
    description: 'Extrae el texto de un PDF, lo traduce al español y genera un resumen corto.',
    input_type: 'pdf',
    output_type: 'texto',
    steps: [
      { name: 'Extraer texto de PDF', input_type: 'pdf', output_type: 'texto' },
      { name: 'Traducir texto multilingüe', input_type: 'texto', output_type: 'texto' },
      { name: 'Resumir texto', input_type: 'texto', output_type: 'texto' },
    ],
    required_permissions: [
      'Procesar el documento que subas',
      'Enviar el texto a un servicio de traducción',
      'Generar un resumen con inteligencia artificial',
    ],
  },
  {
    id: 'wf-002',
    tipo: 'workflow',
    name: 'Fotos de producto limpias',
    description: 'Quita el fondo de una foto de producto para usarla en la tienda.',
    input_type: 'imagen',
    output_type: 'imagen',
    steps: [{ name: 'Quitar fondo de imagen', input_type: 'imagen', output_type: 'imagen' }],
    required_permissions: ['Procesar la imagen que subas'],
  },
  {
    id: 'wf-003',
    tipo: 'workflow',
    name: 'Traducir y resumir',
    description: 'Traduce un texto al español y luego genera un resumen corto.',
    input_type: 'texto',
    output_type: 'texto',
    steps: [
      { name: 'Traducir texto multilingüe', input_type: 'texto', output_type: 'texto' },
      { name: 'Resumir texto', input_type: 'texto', output_type: 'texto' },
    ],
    required_permissions: [
      'Enviar el texto a un servicio de traducción',
      'Generar un resumen con inteligencia artificial',
    ],
  },
  {
    id: 'wf-010',
    tipo: 'workflow',
    name: 'Contrato a resumen',
    description: 'Lee un contrato en PDF y devuelve un resumen con los puntos importantes.',
    input_type: 'pdf',
    output_type: 'texto',
    steps: [
      { name: 'Extraer texto de PDF', input_type: 'pdf', output_type: 'texto' },
      { name: 'Resumir texto', input_type: 'texto', output_type: 'texto' },
    ],
    required_permissions: [
      'Procesar el documento que subas',
      'Generar un resumen con inteligencia artificial',
    ],
  },
];

/** Busca un workflow o capacidad falsa por tipo e id. */
export function obtenerEjecutableMock(tipo, id) {
  return mockEjecutables.find((item) => item.tipo === tipo && item.id === id) || null;
}
