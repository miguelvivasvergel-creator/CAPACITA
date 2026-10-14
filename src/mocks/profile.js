/**
 * Datos falsos de perfiles para desarrollo del Módulo D (Fahida).
 * Misma forma que devolverá GET /users/{username} y GET /users/{username}/activity.
 * La actividad NUNCA trae entradas, salidas ni ids de archivos.
 */

export const mockPerfiles = [
  {
    username: 'franklin_dev',
    display_name: 'Franklin',
    bio: 'Me gusta automatizar todo lo que tenga que ver con imágenes y documentos.',
    avatar_url: null,
    created_at: '2026-09-20T10:00:00Z',
    stats: { public_capabilities: 2, public_workflows: 2, runs: 37, clones: 30 },
    capabilities: [
      {
        id: 'cap-001',
        name: 'Quitar fondo de imagen',
        description: 'Elimina el fondo de una fotografía JPG o PNG y devuelve un PNG con transparencia.',
        input_type: 'imagen',
        output_type: 'imagen',
        visibility: 'public',
        uses_count: 142,
      },
      {
        id: 'cap-002',
        name: 'Extraer texto de PDF',
        description: 'Extrae todo el contenido de texto de un PDF digital, listo para traducir o resumir.',
        input_type: 'pdf',
        output_type: 'texto',
        visibility: 'public',
        uses_count: 89,
      },
    ],
    workflows: [
      {
        id: 'wf-001',
        name: 'PDF a resumen en español',
        description: 'Extrae el texto de un PDF, lo traduce al español y genera un resumen corto.',
        steps: ['Extraer texto', 'Traducir', 'Resumir'],
        visibility: 'public',
        uses_count: 64,
      },
      {
        id: 'wf-002',
        name: 'Fotos de producto limpias',
        description: 'Quita el fondo de una foto de producto para usarla en la tienda.',
        steps: ['Quitar fondo'],
        visibility: 'public',
        uses_count: 21,
      },
    ],
    activity: [
      {
        id: 'run-101',
        workflow_id: 'wf-001',
        workflow_name: 'PDF a resumen en español',
        steps: ['Extraer texto', 'Traducir', 'Resumir'],
        status: 'completed',
        started_at: '2026-10-03T14:20:00Z',
        duration_ms: 8400,
      },
      {
        id: 'run-102',
        workflow_id: 'wf-002',
        workflow_name: 'Fotos de producto limpias',
        steps: ['Quitar fondo'],
        status: 'running',
        started_at: '2026-10-03T15:02:00Z',
        duration_ms: null,
      },
      {
        id: 'run-103',
        workflow_id: 'wf-001',
        workflow_name: 'PDF a resumen en español',
        steps: ['Extraer texto', 'Traducir', 'Resumir'],
        status: 'failed',
        started_at: '2026-10-02T09:45:00Z',
        duration_ms: 3100,
      },
    ],
  },
  {
    username: 'miguel_ui',
    display_name: 'Miguel',
    bio: 'Diseño interfaces y traduzco cosas en mis ratos libres.',
    avatar_url: null,
    created_at: '2026-09-18T08:30:00Z',
    stats: { public_capabilities: 1, public_workflows: 0, runs: 12, clones: 45 },
    capabilities: [
      {
        id: 'cap-003',
        name: 'Traducir texto multilingüe',
        description: 'Traduce texto a inglés, español, francés o alemán manteniendo el sentido.',
        input_type: 'texto',
        output_type: 'texto',
        visibility: 'public',
        uses_count: 230,
      },
    ],
    workflows: [],
    activity: [],
  },
];

/**
 * Perfil propio de ejemplo: incluye también lo privado, porque es tuyo.
 * Se completa con el nombre y avatar real del usuario conectado.
 */
export const mockPerfilPropio = {
  bio: 'Me encargo de que los workflows se ejecuten bien y de forma segura.',
  created_at: '2026-09-22T12:00:00Z',
  stats: { public_capabilities: 1, public_workflows: 1, runs: 9, clones: 4 },
  capabilities: [
    {
      id: 'cap-010',
      name: 'Extraer texto',
      description: 'Convierte un PDF en texto plano. Si el PDF es escaneado, intenta leerlo con OCR.',
      input_type: 'pdf',
      output_type: 'texto',
      visibility: 'public',
      uses_count: 18,
    },
    {
      id: 'cap-011',
      name: 'Limpiar CSV',
      description: 'Quita filas vacías y espacios sobrantes de una tabla CSV.',
      input_type: 'datos',
      output_type: 'datos',
      visibility: 'private',
      uses_count: 3,
    },
  ],
  workflows: [
    {
      id: 'wf-010',
      name: 'Contrato a resumen',
      description: 'Lee un contrato en PDF y devuelve un resumen con los puntos importantes.',
      steps: ['Extraer texto', 'Resumir'],
      visibility: 'public',
      uses_count: 9,
    },
  ],
  activity: [
    {
      id: 'run-201',
      workflow_id: 'wf-010',
      workflow_name: 'Contrato a resumen',
      steps: ['Extraer texto', 'Resumir'],
      status: 'completed',
      started_at: '2026-10-04T11:10:00Z',
      duration_ms: 5200,
    },
  ],
};

/** Busca un perfil falso por username; si es el propio, usa los datos del usuario conectado. */
export function obtenerPerfilMock(username, usuarioActual) {
  if (usuarioActual && username === usuarioActual.username) {
    return {
      ...mockPerfilPropio,
      username: usuarioActual.username,
      display_name: usuarioActual.name,
      avatar_url: usuarioActual.avatar_url,
    };
  }
  return mockPerfiles.find((perfil) => perfil.username === username) || null;
}
