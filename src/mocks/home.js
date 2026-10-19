/**
 * Datos falsos para la pantalla de Inicio (Módulo A - Miguel)
 * Se usan hasta que estén listos los endpoints reales:
 *   GET /stats/home, GET /capabilities, GET /workflows
 */

export const mockStats = {
  usuarios_activos: 128,
  ejecuciones_hoy: 42,
  capacidades_publicas: 36,
  workflows_publicos: 18,
};

export const mockCapacidadesDestacadas = [
  {
    id: 'cap-001',
    name: 'Quitar fondo de imagen',
    description: 'Elimina el fondo de cualquier foto y devuelve un PNG transparente.',
    input_type: 'imagen',
    output_type: 'imagen',
    uses_count: 142,
    owner_name: 'Franklin',
  },
  {
    id: 'cap-002',
    name: 'Extraer texto de PDF',
    description: 'Lee un PDF y devuelve todo su contenido en texto limpio.',
    input_type: 'pdf',
    output_type: 'texto',
    uses_count: 89,
    owner_name: 'Fahida',
  },
  {
    id: 'cap-003',
    name: 'Traducir texto',
    description: 'Traduce un texto al idioma destino (es, en, fr).',
    input_type: 'texto',
    output_type: 'texto',
    uses_count: 230,
    owner_name: 'Miguel',
  },
];

export const mockWorkflowsActivos = [
  {
    id: 'wf-001',
    name: 'PDF a resumen en español',
    pasos: ['Extraer texto', 'Traducir', 'Resumir'],
    uses_count: 54,
    owner_name: 'Luis Miguel',
  },
  {
    id: 'wf-002',
    name: 'Foto sin fondo lista para catálogo',
    pasos: ['Quitar fondo', 'Comprimir imagen'],
    uses_count: 31,
    owner_name: 'Franklin',
  },
];
