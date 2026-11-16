// Escenarios interceptados de búsqueda; no consume IA ni escribe registros reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa la expresión de función.
async (page) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(async () => (await import('/src/mocks/busqueda.js')).respuestaBusqueda);
  const requests = [];
  let slowRoute, seenSlow;
  const slowReceived = new Promise(resolve => { seenSlow = resolve; });
  const handler = async route => {
    const payload = route.request().postDataJSON();
    requests.push(payload);
    if (payload.query === 'lenta') { slowRoute = route; seenSlow(); return; }
    if (payload.query === 'error' || payload.query === 'sinmodelo' && payload.mode === 'semantic') return route.fulfill({ status: 503, json: { detail: 'Modelo temporalmente no disponible' } });
    const data = structuredClone(fixture);
    data.mode = payload.mode;
    data.semantic_scanned = payload.mode === 'semantic' ? 1 : 0;
    if (payload.query === 'vacía') { data.capabilities.items = []; data.profiles.items = []; }
    else if (payload.query === 'páginas') {
      data.capabilities.next_cursor = payload.capabilities_cursor ? null : 'next-page';
      if (payload.capabilities_cursor) data.capabilities.items.push({ ...data.capabilities.items[0], id: '33333333-3333-4333-8333-333333333333', name: 'Otro resultado' });
    } else data.capabilities.items[0].name = payload.query;
    if (payload.kind === 'capabilities') data.profiles = { items: [], next_cursor: null };
    return route.fulfill({ json: { success: true, data } });
  };
  await page.route('**/api/search', handler);
  const checks = [];
  try {
    await page.goto('http://127.0.0.1:5173/#buscar/páginas');
    await page.reload();
    await page.getByRole('button', { name: 'Más capacidades', exact: true }).click();
    await page.getByRole('heading', { name: 'Otro resultado', exact: true }).waitFor();
    assert(await page.getByRole('region', { name: 'Capacidades encontradas' }).locator('article').count() === 2, 'Resultados duplicados en paginación');
    assert(requests.some(request => request.capabilities_cursor === 'next-page'), 'Cursor no enviado');
    checks.push('paginación real con deduplicación');
    await page.getByRole('button', { name: 'Ver Otro resultado', exact: true }).click();
    assert(!await page.getByRole('button', { name: 'Abrir capacidad →', exact: true }).isDisabled(), 'Detalle no ofrece abrir el trabajo con la capacidad');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    checks.push('detalle del resultado sin ejecución ficticia');

    await page.getByRole('combobox', { name: 'Método' }).selectOption('semantic');
    await page.getByText('1 capacidades visibles comparadas localmente.', { exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Capacidades', exact: true }).selectOption('mine');
    await page.getByText('1 capacidades visibles comparadas localmente.', { exact: true }).waitFor();
    assert(requests.some(request => request.mode === 'semantic' && request.scope === 'mine'), 'Método/propiedad no llegaron a API');
    checks.push('modo semántico y filtro propio al servidor');

    const query = async text => {
      await page.getByRole('textbox', { name: 'Consulta', exact: true }).fill(text);
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    };
    await query('vacía');
    await page.getByText('Sin capacidades para esta búsqueda.', { exact: true }).waitFor();
    await query('error');
    await page.getByRole('alert').filter({ hasText: 'Modelo temporalmente no disponible' }).waitFor();
    assert(await page.getByRole('region', { name: 'Capacidades encontradas' }).count() === 0, 'Error conserva resultados viejos');
    checks.push('vacío y fallo sin fallback');
    await page.getByRole('button', { name: 'Usar búsqueda textual', exact: true }).click();
    assert(await page.getByRole('combobox', { name: 'Método' }).inputValue() === 'text', 'Cambio explícito a texto no conservó método');
    await query('sinmodelo');
    await page.getByRole('heading', { name: 'sinmodelo', exact: true }).waitFor();
    checks.push('cambio explícito a texto cuando falla el modelo');

    await page.setViewportSize({ width: 1440, height: 900 });
    const global = page.getByRole('textbox', { name: 'Buscar capacidades y personas', exact: true });
    await global.fill('lenta');
    await slowReceived;
    await global.fill('rápida');
    const suggestions = page.getByRole('region', { name: 'Sugerencias de búsqueda' });
    await suggestions.getByRole('button', { name: /rápida/ }).waitFor();
    await slowRoute.fulfill({ json: { success: true, data: fixture } }).catch(() => {});
    assert(await suggestions.getByRole('button', { name: /rápida/ }).count() === 1, 'Respuesta obsoleta cambió sugerencias');
    checks.push('autocompletado descarta respuesta obsoleta');

    const html = '<img src=x onerror=alert(1)>';
    await global.fill(html);
    await suggestions.getByRole('button', { name: new RegExp('img src=x') }).waitFor();
    assert(await suggestions.locator('img').count() === 0, 'Sugerencia interpreta HTML');
    await global.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desborde móvil');
    checks.push('contenido como texto y móvil sin desborde');
    return { passed: true, checks, realWrites: 0 };
  } finally {
    if (slowRoute) await slowRoute.abort().catch(() => {});
    await page.unroute('**/api/search', handler);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#inicio');
    await page.reload();
  }
}
