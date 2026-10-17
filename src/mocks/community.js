/**
 * Datos falsos para la pantalla de Comunidad (Módulo A - Miguel)
 * Se usan hasta que estén listos los endpoints reales:
 *   GET /community, GET /community/creators, GET /community/popular
 */

export const mockComunidadItems = [
  {
    id: 'cap-001',
    tipo: 'capacidad',
    name: 'Quitar fondo de imagen',
    description: 'Elimina el fondo de cualquier foto y devuelve un PNG transparente.',
    input_type: 'imagen',
    output_type: 'imagen',
    uses_count: 142,
    owner_name: 'Franklin',
    owner_username: 'franklin_dev',
    created_at: '2026-10-02T10:00:00Z',
  },
  {
    id: 'cap-002',
    tipo: 'capacidad',
    name: 'Extraer texto de PDF',
    description: 'Lee un PDF y devuelve todo su contenido en texto limpio.',
    input_type: 'pdf',
    output_type: 'texto',
    uses_count: 89,
    owner_name: 'Fahida',
    owner_username: 'fahida_dev',
    created_at: '2026-10-05T14:30:00Z',
  },
  {
    id: 'wf-001',
    tipo: 'workflow',
    name: 'PDF a resumen en español',
    description: 'Toma un PDF en inglés y entrega un resumen traducido al español.',
    pasos: ['Extraer texto', 'Traducir', 'Resumir'],
    uses_count: 54,
    owner_name: 'Luis Miguel',
    owner_username: 'luismiguel_dev',
    created_at: '2026-10-06T09:15:00Z',
  },
  {
    id: 'cap-003',
    tipo: 'capacidad',
    name: 'Traducir texto',
    description: 'Traduce un texto al idioma destino (es, en, fr).',
    input_type: 'texto',
    output_type: 'texto',
    uses_count: 230,
    owner_name: 'Miguel',
    owner_username: 'miguel_dev',
    created_at: '2026-10-08T09:15:00Z',
  },
  {
    id: 'wf-002',
    tipo: 'workflow',
    name: 'Foto sin fondo para catálogo',
    description: 'Quita el fondo y la deja lista para subir a una tienda.',
    pasos: ['Quitar fondo', 'Comprimir'],
    uses_count: 31,
    owner_name: 'Franklin',
    owner_username: 'franklin_dev',
    created_at: '2026-10-10T18:40:00Z',
  },
];

export const mockCreadoresDestacados = [
  { username: 'franklin_dev', nombre: 'Franklin', usos: 173 },
  { username: 'miguel_dev', nombre: 'Miguel', usos: 230 },
  { username: 'luismiguel_dev', nombre: 'Luis Miguel', usos: 54 },
  { username: 'fahida_dev', nombre: 'Fahida', usos: 89 },
];

export const mockCapacidadesPopulares = [
  { id: 'cap-003', name: 'Traducir texto', uses_count: 230 },
  { id: 'cap-001', name: 'Quitar fondo de imagen', uses_count: 142 },
  { id: 'cap-002', name: 'Extraer texto de PDF', uses_count: 89 },
  { id: 'cap-004', name: 'Resumir texto', uses_count: 65 },
  { id: 'cap-005', name: 'Transcribir audio', uses_count: 44 },
];
