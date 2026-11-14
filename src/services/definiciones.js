import { api } from '../api';

export function comprobarDefinicion(definition) {
  return api('/capabilities/definitions/check', { method: 'POST', body: definition });
}

export function guardarDefinicion(definition, acknowledgeSimilar) {
  return api('/capabilities/definitions', {
    method: 'POST', body: { definition, acknowledge_similar: acknowledgeSimilar },
  });
}
