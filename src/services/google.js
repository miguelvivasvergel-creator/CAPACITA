import { api } from '../api';

// Conectar la cuenta de Google (fase 6): Gmail (a uno mismo), Drive (solo lo que crea Capacita) y Calendar.
export const estadoGoogle = () => api('/google/status');
export const iniciarGoogle = () => api('/google/connect', { method: 'POST' });
export const completarGoogle = (code, state) => api('/google/complete', { method: 'POST', body: { code, state } });
export const desconectarGoogle = () => api('/google/link', { method: 'DELETE' });
