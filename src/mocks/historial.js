// Fixtures de desarrollo/pruebas; nunca sustituyen respuestas de la API.
export const historialFixture = {
  items: [{ id: '11111111-1111-4111-8111-111111111111', workflow_id: '22222222-2222-4222-8222-222222222222', workflow_revision: 1,
    status: 'completed', created_at: '2026-11-15T12:00:00Z', updated_at: '2026-11-15T12:00:03Z',
    output: { resultado: '<img src=x onerror=alert(1)> Árbol' },
    report: { steps: [{ id: 'limpiar', label: 'Limpiar texto', status: 'completed', output: { resultado: 'Árbol' } }] } }],
  next_cursor: null,
};
