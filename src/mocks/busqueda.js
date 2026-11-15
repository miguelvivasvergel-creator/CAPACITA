// Fixture exclusiva para pruebas interceptadas. Sin fallback de búsqueda.
import { paginaInicio } from './inicio';

export const respuestaBusqueda = {
  mode: 'text', semantic_available: true, semantic_scanned: 0, semantic_truncated: false,
  workflow_search_available: false,
  capabilities: { items: paginaInicio.items, next_cursor: null },
  profiles: { items: [{ id: '22222222-2222-4222-8222-222222222222', username: 'persona_prueba', display_name: 'Persona de prueba', bio: 'Automatización de tareas', avatar_url: null, created_at: null, stats: {} }], next_cursor: null },
};
