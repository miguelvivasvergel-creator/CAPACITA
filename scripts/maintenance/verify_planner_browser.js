// Prueba visual con negocio interceptado: sin IA ni escrituras reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  const checks = [];
  const envelope = (data) => ({ success: true, data });
  const versionId = '11111111-1111-4111-8111-111111111111';
  const schema = { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'], additionalProperties: false };
  let optionCalls = 0;
  let modelCalls = 0;
  let mode = 'plan';
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>(type)=>type; window.__vite_plugin_react_preamble_installed__=true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import Planner from '/src/components/capabilities/PlanificarObjetivo.jsx';
    import '/src/index.css';
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Planner,{onCambiarSeccion:(section)=>document.querySelector('#destination').textContent=section}));
  </script><p id="destination"></p></body></html>`;
  const handler = async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/planner/options') {
      optionCalls++;
      return route.fulfill({ json: envelope({ items: mode === 'empty' ? [] : [{ id: versionId, review_hash: 'a'.repeat(64), name: 'Limpiar texto', description: 'Quitar espacios exteriores', visibility: 'private', input_schema: schema, parameter_schema: { type: 'object', properties: {}, additionalProperties: false }, output_schema: schema }], search_truncated: true, next_cursor: null }) });
    }
    if (path === '/api/planner/propose') {
      modelCalls++;
      const request = route.request().postDataJSON();
      if (JSON.stringify(request.version_ids) !== JSON.stringify([versionId]) || !request.consent_to_provider) throw new Error('Selección o consentimiento incorrectos');
      if (request.version_hashes?.[versionId] !== 'a'.repeat(64)) throw new Error('No conserva los contratos revisados');
      if (mode === 'error') return route.fulfill({ status: 502, json: { detail: 'Propuesta incompatible con contratos' } });
      const definition = { format_version: 1, name: 'Limpiar texto', description: 'Para revisar', input_schema: schema,
        nodes: [{ id: 'limpiar', version_id: versionId, label: 'Limpiar', bindings: { texto: { source: '$input', field: 'texto' } }, parameters: {}, values: {} }], outputs: { final: { source: 'limpiar', field: 'texto' } } };
      const proposal = mode === 'clarify' ? { decision: 'clarify', explanation: 'Falta una regla', questions: ['¿Conservar signos?'], missing: [], definition: null }
        : { decision: 'reuse', explanation: 'Una versión para revisar', questions: [], missing: [], definition };
      return route.fulfill({ json: envelope({ proposal, validation: proposal.definition ? { valid: true, order: ['limpiar'] } : null, saved: false, executed: false }) });
    }
    throw new Error(`Petición no autorizada en prueba: ${path}`);
  };
  await page.route('**/planner-qa', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/api/**', handler);
  try {
    await page.goto('http://127.0.0.1:5173/planner-qa');
    const objective = page.getByRole('textbox', { name: 'Objetivo del proceso' });
    await objective.fill('Quitar espacios exteriores del texto');
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByText('Búsqueda parcial.', { exact: false }).waitFor();
    const propose = page.getByRole('button', { name: 'Proponer plan para revisar', exact: true });
    if (!await propose.isDisabled() || modelCalls !== 0 || optionCalls !== 1) throw new Error('Invoca IA antes de selección/consentimiento');
    await page.getByRole('checkbox', { name: 'Limpiar texto · Privada' }).check();
    if (!await propose.isDisabled()) throw new Error('No exige consentimiento');
    await page.getByRole('checkbox', { name: 'Autorizo enviar a Gemini', exact: false }).check();
    await propose.click();
    await page.getByRole('heading', { name: 'Reutilizar una capacidad' }).waitFor();
    await page.getByText('Datos iniciales.texto → texto', { exact: true }).waitFor();
    checks.push('búsqueda sin IA, selección privada y consentimiento explícito');
    await page.getByRole('button', { name: 'Ir al constructor de workflows' }).click();
    await page.locator('#destination').filter({ hasText: 'workflows' }).waitFor();
    checks.push('propuesta revisable con puertos y navegación sin guardado/ejecución');
    await objective.fill('Limpiar texto sin cambiar signos');
    if (await page.getByRole('heading', { name: 'Reutilizar una capacidad' }).count()) throw new Error('Objetivo cambiado conserva propuesta');
    mode = 'clarify';
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Limpiar texto · Privada' }).check();
    await page.getByRole('checkbox', { name: 'Autorizo enviar a Gemini', exact: false }).check();
    await propose.click();
    await page.getByText('¿Conservar signos?', { exact: true }).waitFor();
    if (await page.getByRole('button', { name: 'Copiar propuesta de workflow' }).count()) throw new Error('Aclaración ofrece plan');
    checks.push('editar invalida propuesta; aclaración no simula workflow');
    mode = 'error';
    await propose.click();
    await page.getByText('Propuesta incompatible con contratos', { exact: true }).waitFor();
    checks.push('fallo de contrato conserva formulario y muestra error');
    mode = 'empty';
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByText('No se encontraron versiones habilitadas', { exact: false }).waitFor();
    if (await page.getByRole('button', { name: 'Proponer plan para revisar' }).count()) throw new Error('Vacío permite plan');
    await page.setViewportSize({ width: 390, height: 844 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Desborde móvil');
    await page.screenshot({ path: 'output/playwright/planner-mobile.png', fullPage: true });
    checks.push('vacío sin fallback y móvil sin desborde');
    return { count: checks.length, checks, modelCalls_simulated: modelCalls, real_writes: 0 };
  } finally {
    await page.unroute('**/api/**', handler);
    await page.unroute('**/planner-qa');
  }
}
