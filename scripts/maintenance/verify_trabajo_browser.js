// Componentes A y B reales, respuestas interceptadas: sin Gemini, SQL ni runs reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  const checks = [];
  const { capId, versionId, definition, candidate } = await page.evaluate(async () => import('/src/mocks/trabajo.js'));
  let mode = 'own';
  let writes = 0;
  const html = (component) => `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import Component from '/src/pages/${component}.jsx';import '/src/index.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Component,{id:'${capId}',usuario:{id:'owner',name:'Prueba'},onCambiarSeccion:()=>{}}));
  </script></body></html>`;
  const handler = async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const ok = (data) => route.fulfill({ json: { success: true, data } });
    if (path === `/api/capabilities/${capId}`) {
      if (mode === 'error') return route.fulfill({ status: 503, json: { detail: 'Catálogo desconectado' } });
      return ok({ id: capId, owner_id: mode === 'other' ? 'other' : 'owner', name: definition.name,
        description: definition.description, visibility: mode === 'other' ? 'public' : 'private', status: 'draft', config: { definition } });
    }
    if (path.endsWith('/candidates/check')) return ok({ definition_hash: 'a'.repeat(64), matches: { items: [], next_cursor: null } });
    if (path.endsWith('/candidates')) return ok({ items: [candidate], next_cursor: null });
    if (path === '/api/versions') return ok({ items: [{ id: versionId, status: 'enabled' }], next_cursor: null });
    if (path === '/api/runs' && req.method() === 'POST') {
      writes++;
      const data = req.postDataJSON();
      if (data.version_id !== versionId || !req.headers()['idempotency-key'] || 'capability_id' in data) throw new Error('No usa el contrato B3');
      return ok({ id: 'run-fixture', status: 'completed', output: { resultado: data.inputs.texto.trim() }, report: {} });
    }
    if (path.endsWith('/repair')) {
      writes++;
      if (!req.postDataJSON().consent_to_provider) throw new Error('Reparación sin consentimiento');
      return ok({ ...candidate, id: '44444444-4444-4444-8444-444444444444' });
    }
    if (path === '/api/planner/options') return ok({ items: [], next_cursor: null, search_truncated: false });
    if (['/api/capabilities', '/api/workflows', '/api/runs'].includes(path)) return ok({ items: [], next_cursor: null });
    throw new Error(`Petición inesperada: ${req.method()} ${path}`);
  };
  await page.route('**/trabajo-qa', (route) => route.fulfill({ contentType: 'text/html', body: html('TrabajoCapacidad') }));
  await page.route('**/inicio-transfer-qa', (route) => route.fulfill({ contentType: 'text/html', body: html('Inicio') }));
  await page.route('**/api/**', handler);
  try {
    await page.goto('http://127.0.0.1:5173/trabajo-qa');
    await page.getByRole('heading', { name: definition.name, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Revisar catálogo y cargar candidatos', exact: true }).click();
    await page.locator('summary').filter({ hasText: 'Python · borrador' }).click();
    await page.getByRole('button', { name: 'Cargar versiones guardadas', exact: true }).click();
    await page.getByRole('button', { name: 'Uso permitido · 33333333', exact: true }).click();
    await page.getByRole('textbox', { name: 'Datos de entrada (JSON)', exact: true }).fill('{"texto":"  Árbol diferente  "}');
    await page.getByRole('button', { name: 'Ejecutar con estos datos', exact: true }).click();
    await page.getByText('Completada', { exact: true }).waitFor();
    await page.locator('pre').filter({ hasText: 'Árbol diferente' }).waitFor();
    checks.push('A integra componente B3 y contrato por version_id con idempotencia');
    await page.getByText('Proponer una corrección del código', { exact: true }).click();
    await page.getByRole('textbox', { name: 'Observación sin datos sensibles', exact: true }).fill('Conservar los acentos y los espacios interiores');
    const repair = page.getByRole('button', { name: 'Generar otro candidato para probar', exact: true });
    if (!await repair.isDisabled()) throw new Error('No exige consentimiento para reparación');
    await page.getByRole('checkbox', { name: 'Autorizo enviar a Gemini esta observación', exact: false }).check();
    await repair.click();
    await page.getByText('Corrección guardada como candidato nuevo.', { exact: false }).waitFor();
    checks.push('reparación explícita genera otro candidato sin heredar pruebas');
    mode = 'error';
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'Catálogo desconectado' }).waitFor();
    if (await page.getByRole('heading', { name: definition.name }).count()) throw new Error('Error presenta fallback');
    mode = 'other';
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.getByText('El uso de versiones de otro autor todavía requiere el contrato de publicación', { exact: false }).waitFor();
    if (await page.getByText('Preparar implementación Python', { exact: true }).count()) throw new Error('Ofrece código ajeno');
    checks.push('error sin mocks y definición ajena sin acceso a candidatos privados');
    await page.goto('http://127.0.0.1:5173/inicio-transfer-qa');
    await page.getByRole('button', { name: 'Planificar un proceso', exact: true }).click();
    const objective = 'Necesito normalizar espacios de un texto';
    await page.getByRole('textbox', { name: 'Objetivo del proceso', exact: true }).fill(objective);
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByRole('button', { name: 'Definir la capacidad que falta', exact: true }).click();
    if (await page.getByRole('textbox', { name: '¿Qué quieres resolver?', exact: true }).inputValue() !== objective) throw new Error('Pierde objetivo');
    if (await page.getByRole('checkbox', { name: 'Confirmo que el objetivo', exact: false }).isChecked()) throw new Error('Hereda consentimiento');
    await page.setViewportSize({ width: 390, height: 844 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Desborde móvil');
    await page.screenshot({ path: 'output/playwright/trabajo-transfer-mobile.png', fullPage: true });
    checks.push('pieza faltante pasa a definición conservando objetivo, sin consentimiento heredado');
    return { checks, count: checks.length, writes_simulated: writes, real_writes: 0 };
  } finally {
    await page.unroute('**/api/**', handler);
    await page.unroute('**/trabajo-qa'); await page.unroute('**/inicio-transfer-qa');
  }
}
