import { api } from '../api';

// investigacion: lo que ya se investigó al empezar la conversación (texto), para no buscar otra vez.
export function interpretarObjetivo(objective, clarifications, consent, signal, investigacion = null) {
  return api('/objectives/interpret', {
    method: 'POST', body: { objective, clarifications, consent_to_provider: consent, ...(investigacion ? { research_summary: investigacion } : {}) }, signal,
  });
}

// Antes de hacer nada: busca en Google cómo se hace bien lo pedido. null si no se pudo.
export function investigar(objective, signal) {
  return api('/objectives/research', { method: 'POST', body: { objective, consent_to_provider: true }, signal });
}

// «Ponle 30 %» → valores de las opciones. Solo viajan la frase y las opciones, nunca archivos.
export function ajustarOpciones(body, signal) {
  return api('/objectives/adjust', { method: 'POST', body: { ...body, consent_to_provider: true }, signal });
}
