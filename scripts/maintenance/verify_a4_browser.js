// playwright-cli run-code --filename scripts/maintenance/verify_a4_browser.js
// Monta componentes reales; API interceptada, sin credenciales ni escrituras reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  const checks = [];
  const envelope = (data) => ({ success: true, data });
  let mode = 'normal';
  let clones = 0;
  const item = { id: '11111111-1111-4111-8111-111111111111', owner_id: 'other', owner_username: 'autora',
    name: 'Capacidad pública', description: '<img src=x onerror=alert(1)> Texto de prueba',
    category: 'Texto', visibility: 'public', status: 'published', input_type: 'texto', output_type: 'texto',
    version: '1.0.0', permissions: [], config: {}, input_schema: {}, output_schema: {} };
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import Inicio from '/src/pages/Inicio.jsx';
    import Comunidad from '/src/pages/Comunidad.jsx';
    import '/src/index.css';
    function Harness() {
      const [section,setSection]=React.useState('inicio');
      return React.createElement(React.Fragment,null,
        React.createElement('button',{onClick:()=>setSection('inicio')},'Inicio QA'),
        React.createElement('button',{onClick:()=>setSection('comunidad')},'Comunidad QA'),
        React.createElement('p',{id:'destination'},section),
        section==='inicio'?React.createElement(Inicio,{usuario:{id:'owner',name:'Prueba'},onCambiarSeccion:setSection}):
        section==='comunidad'?React.createElement(Comunidad,{_usuario:{id:'owner'},onCambiarSeccion:setSection}):null);
    }
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Harness));
  </script></body></html>`;
  const handler = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname.endsWith('/clone')) {
      clones += 1;
      return route.fulfill({ json: envelope({ ...item, name: 'Copia privada' }) });
    }
    if (request.method() !== 'GET') throw new Error('Escritura inesperada');
    if (url.pathname === '/api/workflows' && mode === 'error') return route.fulfill({ status: 503, json: { detail: 'Workflow no disponible' } });
    let data = { items: [], next_cursor: null };
    if (url.pathname === '/api/capabilities') {
      if (url.searchParams.get('scope') === 'mine') data.items = [{ id: 'own', status: 'draft' }];
      else if (url.searchParams.get('q') === 'vacío') data.items = [];
      else if (url.searchParams.get('q') === 'error') return route.fulfill({ status: 503, json: { detail: 'Catálogo no disponible' } });
      else data = url.searchParams.has('cursor') ? { items: [item, { ...item, id: 'second', name: 'Segunda capacidad' }], next_cursor: null } : { items: [item], next_cursor: item.id };
    }
    if (url.pathname === '/api/runs') data = url.searchParams.has('cursor') ? { items: [{ id: 'r1', status: 'completed' }, { id: 'r2', status: 'failed' }], next_cursor: null } : { items: [{ id: 'r1', status: 'completed' }], next_cursor: 'r1' };
    return route.fulfill({ json: envelope(data) });
  };
  await page.route('**/dashboard-qa', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/api/**', handler);
  try {
    await page.goto('http://127.0.0.1:5173/dashboard-qa');
    const summary = page.getByRole('region', { name: 'Tu trabajo en Capacita' });
    await summary.getByRole('button', { name: 'Actualizar resumen', exact: true }).waitFor();
    const runs = summary.locator('article').filter({ has: page.getByRole('heading', { name: 'Mis ejecuciones', exact: true }) });
    if (!await runs.getByText('2', { exact: true }).count()) throw new Error('No suma páginas o duplica runs');
    checks.push('resumen con paginación real del cliente y duplicados descartados');
    mode = 'error';
    await summary.getByRole('button', { name: 'Actualizar resumen', exact: true }).click();
    await summary.getByText('No disponible: Workflow no disponible', { exact: true }).waitFor();
    await runs.getByText('2', { exact: true }).waitFor();
    checks.push('fallo parcial conserva otras métricas y no inventa cero');
    await page.getByRole('button', { name: 'Comunidad QA', exact: true }).click();
    await page.getByRole('heading', { name: item.name, exact: true }).waitFor();
    if (await page.locator('article img').count()) throw new Error('Contenido de usuario interpretado como HTML');
    await page.getByRole('button', { name: 'Cargar más capacidades públicas' }).click();
    await page.getByRole('heading', { name: 'Segunda capacidad', exact: true }).waitFor();
    if (await page.locator('article').count() !== 2) throw new Error('Comunidad duplicó filas');
    checks.push('comunidad paginada, texto literal y sin duplicados');
    await page.getByRole('button', { name: `Ver ${item.name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Abrir capacidad →', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
    await page.getByRole('button', { name: `Clonar ${item.name}`, exact: true }).click();
    await page.getByText('“Copia privada” guardada como borrador privado en Mis capacidades.', { exact: true }).waitFor();
    if (clones !== 1) throw new Error('Clonación duplicada');
    checks.push('detalle y clonación explícita interceptada');
    const search = page.getByRole('textbox', { name: 'Buscar capacidades públicas' });
    await search.fill('vacío');
    await page.getByRole('button', { name: 'Buscar en comunidad', exact: true }).click();
    await page.getByText('No hay capacidades públicas para esta búsqueda.', { exact: true }).waitFor();
    await search.fill('error');
    await page.getByRole('button', { name: 'Buscar en comunidad', exact: true }).click();
    await page.getByText('No se pudo cargar la comunidad: Catálogo no disponible', { exact: true }).waitFor();
    checks.push('estados vacío y error sin fallback');
    await search.fill('');
    await page.getByRole('button', { name: 'Buscar en comunidad', exact: true }).click();
    await page.getByRole('heading', { name: item.name, exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Desborde móvil');
    await page.screenshot({ path: 'output/playwright/a4-comunidad-mobile.png', fullPage: true });
    await page.getByRole('button', { name: '@autora', exact: true }).click();
    await page.locator('#destination').filter({ hasText: 'perfil/autora' }).waitFor();
    checks.push('móvil sin desborde y navegación al perfil público');
    return { checks, count: checks.length, real_writes: 0 };
  } finally {
    await page.unroute('**/api/**', handler);
    await page.unroute('**/dashboard-qa');
  }
}
