// playwright-cli run-code --filename scripts/maintenance/verify_planner_persistence_browser.js
// Requiere propuesta NUEVA ya importada y consentimiento para guardarla en la cuenta.
// Guarda exactamente un proceso privado; no modifica procesos existentes ni ejecuta.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  await page.getByRole('heading', { name: 'Crear workflow', exact: true }).waitFor();
  if (await page.getByRole('heading', { name: 'Editar workflow', exact: true }).count()) throw new Error('No se permite modificar un proceso existente');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/workflows') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar workflow privado', exact: true }).click();
  const response = await responsePromise;
  const payload = await response.json();
  if (response.status() !== 201) throw new Error(`Guardado rechazado: HTTP ${response.status()}`);
  const original = payload.data;
  await page.getByText('Proceso privado guardado.', { exact: true }).waitFor();
  await page.reload();
  const checks = await page.evaluate(async ({ id, definition }) => {
    const { api } = await import('/src/api.js');
    const current = await api(`/workflows/${id}`);
    const listing = await api('/workflows?limit=100');
    return { same_definition: JSON.stringify(current.definition) === JSON.stringify(definition),
      in_first_page: listing.items.some((row) => row.id === id),
      steps: current.definition.nodes.length };
  }, { id: original.id, definition: original.definition });
  if (!checks.same_definition) throw new Error('La definición cambió al recargar');
  return { save_status: 201, workflow_id: original.id, ...checks, executed: false };
};
