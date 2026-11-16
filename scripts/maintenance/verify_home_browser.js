// Ejecutar con playwright-cli run-code --filename desde una sesión autenticada.
// Todas las respuestas de negocio se interceptan: no consume IA ni escribe datos reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta expresión de función.
async (page) => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const checks = [];
  const envelope = data => ({ success: true, message: 'Fixture de prueba', data });
  const { fixture, definition } = await page.evaluate(async () => {
    const { paginaInicio } = await import('/src/mocks/inicio.js');
    const { ejemploDefinicion } = await import('/src/mocks/definiciones.js');
    const { prepararDefinicion } = await import('/src/utils/definiciones.js');
    return { fixture: paginaInicio, definition: prepararDefinicion(ejemploDefinicion) };
  });
  let objectiveCalls = 0;
  let writes = 0;
  const scopes = new Set();
  let slowRoute;
  let receivedSlow;
  const slowReceived = new Promise(resolve => { receivedSlow = resolve; });
  const handler = async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/objectives/interpret') {
      objectiveCalls++;
      return route.fulfill({ json: envelope({
        interpretation: { decision: 'define', explanation: 'Definición propuesta para revisar.', questions: [] },
        definition, definition_hash: 'a'.repeat(64), matches: { items: [], next_cursor: null },
        search_kind: 'text', search_truncated: false, implementation_verified: false,
      }) });
    }
    if (request.method() !== 'GET') {
      writes++;
      return route.fulfill({ status: 500, json: { detail: 'Escritura inesperada en prueba' } });
    }
    if (['/api/runs', '/api/workflows'].includes(url.pathname)) return route.fulfill({ json: envelope({ items: [], next_cursor: null }) });
    if (url.pathname !== '/api/capabilities') return route.continue();
    scopes.add(url.searchParams.get('scope'));
    const q = url.searchParams.get('q');
    if (q === 'lenta') { slowRoute = route; receivedSlow(); return; }
    if (q === 'error') return route.fulfill({ status: 503, json: { detail: 'Catálogo temporalmente no disponible' } });
    if (q === 'vacía') return route.fulfill({ json: envelope({ items: [], next_cursor: null }) });
    const item = { ...fixture.items[0], name: q || fixture.items[0].name };
    if (q === 'páginas') {
      if (!url.searchParams.has('cursor')) return route.fulfill({ json: envelope({ items: [item], next_cursor: item.id }) });
      return route.fulfill({ json: envelope({ items: [item, { ...item, id: '33333333-3333-4333-8333-333333333333', name: 'Segundo resultado' }], next_cursor: null }) });
    }
    return route.fulfill({ json: envelope({ items: [item], next_cursor: null }) });
  };
  await page.route('**/api/**', handler);
  try {
    await page.goto('http://127.0.0.1:5173/#inicio');
    await page.reload();
    await page.getByRole('heading', { name: '¿Qué quieres resolver hoy?' }).waitFor();
    await page.getByRole('heading', { name: 'Normalizar espacios', exact: true }).waitFor();
    assert(await page.getByText('Usuarios activos', { exact: true }).count() === 0, 'Estadísticas ficticias visibles');
    assert(await page.getByText('PLAN PROPUESTO', { exact: true }).count() === 0, 'Planner ficticio visible');
    checks.push('catálogo autorizado sin estadísticas ni plan ficticios');
    await page.getByRole('button', { name: 'Ver Normalizar espacios', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Ejecución pendiente', exact: true }).isDisabled(), 'Detalle ofrece ejecución sin integración');
    await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    await page.getByRole('combobox', { name: 'Mostrar' }).selectOption('mine');
    await page.getByRole('heading', { name: 'Normalizar espacios', exact: true }).waitFor();
    assert(scopes.has('mine'), 'Filtro de propiedad no llegó a API');
    checks.push('detalle honesto y filtro propio enviado al backend');

    await page.getByRole('button', { name: 'Buscar capacidades', exact: true }).click();
    const search = page.getByRole('textbox', { name: 'Buscar en el catálogo autorizado' });
    const submit = page.locator('form').filter({ has: search }).getByRole('button', { name: 'Buscar', exact: true });
    const query = async text => { await search.fill(text); await submit.click(); };
    await query('páginas');
    await page.getByRole('button', { name: 'Cargar más capacidades' }).waitFor();
    await page.getByRole('button', { name: 'Cargar más capacidades' }).click();
    await page.getByRole('heading', { name: 'Segundo resultado', exact: true }).waitFor();
    assert(await page.getByRole('region', { name: 'Capacidades del catálogo' }).locator('article').count() === 2, 'Paginación duplicó resultados');
    checks.push('búsqueda y paginación sin duplicados');

    await query('vacía');
    await page.getByText('No hay capacidades para esta búsqueda.', { exact: false }).waitFor();
    assert(await page.getByRole('region', { name: 'Capacidades del catálogo' }).locator('article').count() === 0, 'Vacío conserva resultados anteriores');
    await query('error');
    await page.getByRole('alert').filter({ hasText: 'Catálogo temporalmente no disponible' }).waitFor();
    assert(await page.getByRole('region', { name: 'Capacidades del catálogo' }).locator('article').count() === 0, 'Error presenta fallback de capacidades');
    checks.push('vacío y error sin fallback');

    await query('lenta');
    await slowReceived;
    await query('rápida');
    await page.getByRole('heading', { name: 'rápida', exact: true }).waitFor();
    await slowRoute.fulfill({ json: envelope(fixture) }).catch(() => {});
    assert(await page.getByRole('heading', { name: 'rápida', exact: true }).count() === 1, 'Respuesta obsoleta reemplazó búsqueda');
    checks.push('respuesta anterior no reemplaza consulta nueva');

    const html = '<img src=x onerror=alert(1)>';
    await query(html);
    await page.getByRole('heading', { name: html, exact: true }).waitFor();
    assert(await page.locator('article img').count() === 0, 'Contenido de usuario interpretado como HTML');
    checks.push('contenido mostrado como texto');

    await page.getByRole('button', { name: 'Describir un objetivo', exact: true }).click();
    const interpret = page.getByRole('button', { name: 'Buscar e interpretar necesidad', exact: true });
    await page.getByRole('textbox', { name: '¿Qué quieres resolver?' }).fill('Quitar espacios exteriores de un texto conservando espacios interiores.');
    assert(await interpret.isDisabled(), 'IA disponible sin consentimiento');
    assert(objectiveCalls === 0, 'Consumo IA antes de consentimiento');
    await page.getByRole('checkbox', { name: /Confirmo que el objetivo/ }).check();
    await interpret.click();
    await page.getByRole('button', { name: 'Usar propuesta en el formulario' }).click();
    assert(await page.getByRole('textbox', { name: 'Nombre', exact: true }).inputValue() === definition.name, 'Propuesta no llegó al formulario');
    assert(writes === 0, 'Propuesta se guardó sin confirmación');
    assert(objectiveCalls === 1, 'Interpretación llamó IA más de una vez');
    checks.push('consentimiento, interpretación y formulario sin autoguardado');

    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Desborde horizontal móvil');
    checks.push('ancho móvil sin desborde');
    return { passed: true, checks, realProviderCalls: 0, realWrites: 0 };
  } finally {
    if (slowRoute) await slowRoute.abort().catch(() => {});
    await page.unroute('**/api/**', handler);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
  }
}
