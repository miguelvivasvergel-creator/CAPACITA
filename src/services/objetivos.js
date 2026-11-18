import { api } from '../api';

export function interpretarObjetivo(objective, clarifications, consent, signal) {
  return api('/objectives/interpret', {
    method: 'POST', body: { objective, clarifications, consent_to_provider: consent }, signal,
  });
}

// «Ponle 30 %» → valores de las opciones. Solo viajan la frase y las opciones, nunca archivos.
export function ajustarOpciones(body, signal) {
  return api('/objectives/adjust', { method: 'POST', body: { ...body, consent_to_provider: true }, signal });
}
