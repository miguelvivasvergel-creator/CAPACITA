import { api } from '../api';
import { contarPaginas } from '../utils/dashboard';

export function cargarMetrica(resource, signal) {
  const paths = { capabilities: '/capabilities', workflows: '/workflows', runs: '/runs' };
  if (!paths[resource]) throw new Error('Métrica no disponible.');
  return contarPaginas((cursor, requestSignal) => {
    const query = new URLSearchParams({ limit: '100' });
    if (resource === 'capabilities') query.set('scope', 'mine');
    if (cursor) query.set('cursor', cursor);
    return api(`${paths[resource]}?${query}`, { signal: requestSignal });
  }, signal);
}
