// CLI Playwright: pruebas interceptadas, sin cambiar perfiles ni fotos reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta expresión de función.
async (page) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const fixture = await page.evaluate(async () => {
    const { api } = await import('/src/api.js');
    const own = await api('/users/me');
    const { perfilDePrueba } = await import('/src/mocks/perfil-real.js');
    return { ...perfilDePrueba, id: own.id, username: own.username };
  });
  let profile = structuredClone(fixture);
  let patchRequests = 0;
  let avatarRequests = 0;
  let failSave = false;
  const checks = [];
  const handler = async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:8000') return route.continue();
    if (!url.pathname.startsWith('/api/users/')) {
      if (['/api/runs', '/api/workflows', '/api/capabilities'].includes(url.pathname)) return route.fulfill({ json: { success: true, data: { items: [], next_cursor: null } } });
      throw new Error(`Petición inesperada en perfil: ${url.pathname}`);
    }
    if (url.pathname.startsWith('/api/users/desconocido')) return route.fulfill({ status: 404, json: { detail: 'Perfil no encontrado' } });
    if (url.pathname.startsWith('/api/users/fallo')) return route.fulfill({ status: 503, json: { detail: 'Proveedor no disponible' } });
    if (request.method() === 'PATCH') {
      patchRequests++;
      if (failSave) return route.fulfill({ status: 503, json: { detail: 'Guardado temporalmente no disponible' } });
      profile = { ...profile, ...request.postDataJSON() };
    }
    if (url.pathname.endsWith('/avatar')) {
      avatarRequests++;
      assert(request.headers()['content-type'].startsWith('multipart/form-data'), 'Avatar no usa multipart');
      profile.avatar_url = '/foto-de-prueba.png';
    }
    if (url.pathname.endsWith('/capabilities')) return route.fulfill({ json: { success: true, data: { items: [], next_cursor: null } } });
    const data = url.pathname === '/api/users/otro' ? { ...profile, id: '22222222-2222-4222-8222-222222222222', username: 'otro' } : profile;
    return route.fulfill({ json: { success: true, data } });
  };
  const patterns = ['**/api/users/**', '**/api/runs?*', '**/api/workflows?*', '**/api/capabilities?*'];
  for (const pattern of patterns) await page.route(pattern, handler);
  try {
    await page.goto('http://127.0.0.1:5173/#perfil/' + encodeURIComponent(profile.username));
    await page.reload();
    await page.getByRole('heading', { name: 'Perfil de prueba', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nombre visible', exact: true }).fill('<b>Nombre</b>');
    await page.getByRole('textbox', { name: /^Bio/ }).fill('<img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: '<b>Nombre</b>', exact: true }).waitFor();
    assert(await page.locator('h1 b').count() === 0, 'Nombre interpretado como HTML');
    assert(patchRequests === 1, 'Guardado duplicado');
    await page.reload();
    await page.getByRole('heading', { name: '<b>Nombre</b>', exact: true }).waitFor();
    checks.push('edición, recarga y texto seguro');

    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await page.getByRole('alert').filter({ hasText: 'La foto debe ser PNG o JPG' }).waitFor();
    assert(await page.getByRole('button', { name: 'Guardar cambios', exact: true }).isDisabled(), 'Se permite foto inválida');
    assert(avatarRequests === 0, 'Se envió foto inválida');
    await page.locator('input[type=file]').setInputFiles({ name: 'good.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7X8AAAAASUVORK5CYII=', 'base64') });
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert(avatarRequests === 1 && patchRequests === 1, 'Foto y texto no usaron una sola petición');
    checks.push('foto inválida bloqueada y foto/texto en una petición');

    failSave = true;
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Guardado temporalmente no disponible' }).waitFor();
    assert(await page.getByRole('dialog').isVisible(), 'Error de guardado cerró el editor');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    checks.push('error de guardado conserva editor sin éxito falso');

    await page.getByRole('button', { name: 'Workflows', exact: true }).last().click();
    await page.getByRole('region', { name: 'Mis workflows privados', exact: true }).waitFor();
    await page.goto('http://127.0.0.1:5173/#perfil/otro');
    await page.reload();
    await page.getByText('@otro', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Editar perfil', exact: true }).count() === 0, 'Perfil ajeno ofrece editar');
    await page.locator('[aria-label="Secciones del perfil"]').getByRole('button', { name: 'Actividad', exact: true }).click();
    await page.getByRole('heading', { name: 'Actividad privada', exact: true }).waitFor();
    assert(await page.getByRole('region', { name: 'Mis ejecuciones privadas', exact: true }).count() === 0, 'Perfil ajeno monta historial privado');
    checks.push('perfil ajeno sin edición y workflows sin datos ficticios');

    await page.goto('http://127.0.0.1:5173/#perfil/desconocido');
    await page.reload();
    await page.getByRole('heading', { name: 'Perfil no encontrado' }).waitFor();
    await page.goto('http://127.0.0.1:5173/#perfil/fallo');
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'Proveedor no disponible' }).waitFor();
    checks.push('404 distinto de fallo del proveedor, sin fallback');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desborde en móvil');
    checks.push('móvil sin desborde');
    return { passed: true, checks, realWrites: 0 };
  } finally {
    for (const pattern of patterns) await page.unroute(pattern, handler);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#perfil/' + encodeURIComponent(fixture.username));
    await page.reload();
  }
}
