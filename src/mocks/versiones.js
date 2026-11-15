// Fixture de diseño B3. No se importa como respuesta ni fallback del recorrido real.
export const versionPrivadaMock = {
  id: '00000000-0000-4000-8000-000000000001',
  candidate_id: '00000000-0000-4000-8000-000000000002',
  status: 'enabled', profile: 'gvisor-python-stdlib-v1',
};
export const ejecucionPrivadaMock = {
  id: '00000000-0000-4000-8000-000000000003',
  version_id: versionPrivadaMock.id, status: 'completed',
  output: { resultado: 'Árbol' }, report: { cleanup_verified: true },
};
