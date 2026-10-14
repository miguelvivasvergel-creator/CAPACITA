/**
 * Datos falsos para la pantalla de Ejecución del Módulo D (Fahida).
 * Cada "ejecutable" es un workflow o una capacidad con sus pasos y permisos.
 */
import imagenEjemplo from '../assets/hero.png';

export const mockEjecutables = [
  {
    id: 'wf-001',
    tipo: 'workflow',
    name: 'PDF a resumen en español',
    description: 'Extrae el texto de un PDF, lo traduce al español y genera un resumen corto.',
    input_type: 'pdf',
    output_type: 'texto',
    steps: [
      { name: 'Extraer texto', input_type: 'pdf', output_type: 'texto' },
      { name: 'Traducir', input_type: 'texto', output_type: 'texto' },
      { name: 'Resumir', input_type: 'texto', output_type: 'texto' },
    ],
    required_permissions: [
      'Procesar el documento que subas',
      'Enviar el texto a un servicio de traducción',
      'Generar un resumen con inteligencia artificial',
    ],
    resultado: {
      output_text:
        'El contrato establece un periodo de prueba de 3 meses, un salario mensual fijo y la posibilidad de trabajo remoto dos días por semana. Cualquiera de las partes puede terminarlo con 15 días de aviso.',
    },
  },
  {
    id: 'wf-002',
    tipo: 'workflow',
    name: 'Fotos de producto limpias',
    description: 'Quita el fondo de una foto de producto para usarla en la tienda.',
    input_type: 'imagen',
    output_type: 'imagen',
    steps: [{ name: 'Quitar fondo', input_type: 'imagen', output_type: 'imagen' }],
    required_permissions: ['Procesar la imagen que subas'],
    resultado: { output_url: imagenEjemplo },
  },
  {
    id: 'wf-010',
    tipo: 'workflow',
    name: 'Contrato a resumen',
    description: 'Lee un contrato en PDF y devuelve un resumen con los puntos importantes.',
    input_type: 'pdf',
    output_type: 'texto',
    steps: [
      { name: 'Extraer texto', input_type: 'pdf', output_type: 'texto' },
      { name: 'Resumir', input_type: 'texto', output_type: 'texto' },
    ],
    required_permissions: [
      'Procesar el documento que subas',
      'Generar un resumen con inteligencia artificial',
    ],
    resultado: {
      output_text: 'Resumen: duración de 12 meses, pago a 30 días y cláusula de confidencialidad.',
    },
  },
];

/** Busca un workflow o capacidad falsa por tipo e id. */
export function obtenerEjecutableMock(tipo, id) {
  return mockEjecutables.find((item) => item.tipo === tipo && item.id === id) || null;
}
