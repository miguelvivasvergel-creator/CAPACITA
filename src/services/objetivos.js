import { api } from '../api';

export function interpretarObjetivo(objective, clarifications, consent, signal) {
  return api('/objectives/interpret', {
    method: 'POST', body: { objective, clarifications, consent_to_provider: consent }, signal,
  });
}
