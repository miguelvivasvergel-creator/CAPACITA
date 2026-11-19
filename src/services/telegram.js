import { api } from '../api';

// Vincular el chat de Telegram de la cuenta (fase 3). El código lo completa el bot.
export const estadoTelegram = () => api('/telegram/status');
export const vincularTelegram = () => api('/telegram/link', { method: 'POST' });
export const desvincularTelegram = () => api('/telegram/link', { method: 'DELETE' });
