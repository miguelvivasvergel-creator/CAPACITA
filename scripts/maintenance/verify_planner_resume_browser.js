// Recorrido A con API interceptada: no usa IA, workers ni datos reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  const objective = 'Normalizar espacios y convertir el texto a mayúsculas';
  const { capId, versionId, definition } = await page.evaluate(async () => import('/src/mocks/trabajo.js'));
  let available = false;
  let searches = 0;
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import Inicio from '/src/pages/Inicio.jsx';import Trabajo from '/src/pages/TrabajoCapacidad.jsx';import * as drafts from '/src/utils/plannerDraft.js';import '/src/index.css';
    window.__drafts=drafts;const root=ReactDOM.createRoot(document.getElementById('root'));
    function render(){const work=location.hash==='#work';root.render(React.createElement(work?Trabajo:Inicio,{key:location.hash,id:'${capId}',usuario:{id:location.hash==='#other'?'other':'owner',name:'Prueba'},initialMode:location.hash==='#plan'?'planificar':undefined,onCambiarSeccion:(value)=>{window.__destination=value;location.hash=value==='inicio/planificar'?'plan':'work';}}));}
    addEventListener('hashchange',render);render();
  </script></body></html>`;
  const handler = async (route) => {
    const url = new URL(route.request().url());
    const ok = (data) => route.fulfill({ json: { success: true, data } });
    if (url.pathname === '/api/planner/options') {
      searches++;
      if (route.request().postDataJSON().mode !== 'semantic') throw new Error('No conserva modo semántico');
      return ok({ items: available ? [{ id: versionId, review_hash: 'a'.repeat(64), name: definition.name, description: definition.description, visibility: 'private', input_schema: definition.input_schema, parameter_schema: {}, output_schema: definition.output_schema }] : [], next_cursor: null, search_truncated: false, search_kind: 'semantic' });
    }
    if (route.request().method() !== 'GET') throw new Error('Escritura inesperada en prueba de retorno');
    if (url.pathname === `/api/capabilities/${capId}`) return ok({ id: capId, owner_id: 'owner', name: definition.name, description: definition.description, visibility: 'private', status: 'draft', config: { definition } });
    if (['/api/capabilities', '/api/workflows', '/api/runs'].includes(url.pathname)) return ok({ items: [], next_cursor: null });
    throw new Error(`Petición inesperada ${url.pathname}`);
  };
  await page.route('**/resume-qa', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/api/**', handler);
  try {
    await page.goto('http://127.0.0.1:5173/resume-qa');
    await page.evaluate(() => window.__drafts.limpiarObjetivosPlan());
    await page.reload();
    await page.getByRole('button', { name: 'Planificar un proceso', exact: true }).click();
    await page.getByLabel('Objetivo del proceso', { exact: true }).fill(objective);
    await page.getByRole('combobox', { name: /^Buscar capacidades/ }).selectOption('semantic');
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByRole('button', { name: 'Definir la capacidad que falta', exact: true }).click();
    if (await page.getByLabel('¿Qué quieres resolver?', { exact: true }).inputValue() !== objective) throw new Error('Pierde objetivo al crear');
    if (await page.getByRole('checkbox', { name: 'Confirmo que el objetivo', exact: false }).isChecked()) throw new Error('Hereda consentimiento');
    await page.reload();
    await page.getByRole('button', { name: 'Retomar objetivo pendiente', exact: true }).click();
    if (await page.getByLabel('Objetivo del proceso', { exact: true }).inputValue() !== objective) throw new Error('Pierde objetivo al recargar');
    if (await page.getByRole('combobox', { name: /^Buscar capacidades/ }).inputValue() !== 'semantic') throw new Error('Pierde modo');
    // Simula únicamente la asociación que hace A después de guardar una definición.
    await page.evaluate((id) => { const draft=window.__drafts.leerObjetivoPlan('owner');window.__drafts.guardarObjetivoPlan('owner',{...draft,capabilityId:id});location.hash='work'; }, capId);
    await page.getByRole('button', { name: 'Retomar plan con capacidades disponibles', exact: true }).click();
    await page.getByLabel('Objetivo del proceso', { exact: true }).waitFor();
    if (searches !== 1) throw new Error('Busca automáticamente al retomar');
    available = true;
    await page.getByRole('button', { name: 'Buscar versiones disponibles', exact: true }).click();
    await page.getByRole('checkbox', { name: `${definition.name} · Privada`, exact: true }).waitFor();
    if (await page.getByRole('checkbox', { name: 'Autorizo enviar a Gemini', exact: false }).isChecked()) throw new Error('Consentimiento heredado');
    if (!await page.getByRole('button', { name: 'Proponer plan para revisar', exact: true }).isDisabled()) throw new Error('Propone sin revisar');
    await page.setViewportSize({ width: 390, height: 844 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Desborde móvil');
    await page.evaluate(() => { location.hash='other'; });
    await page.getByRole('button', { name: 'Planificar un proceso', exact: true }).waitFor();
    if (await page.getByRole('complementary', { name: 'Objetivo pendiente' }).count()) throw new Error('Objetivo de otra cuenta');
    await page.evaluate(() => { location.hash='plan'; });
    await page.getByRole('button', { name: 'Descartar objetivo pendiente', exact: true }).click();
    await page.reload();
    if (await page.getByRole('complementary', { name: 'Objetivo pendiente' }).count()) throw new Error('No descarta');
    return { checks: 6, reload: true, return_from_capability: true, fresh_review: true, account_isolation: true, discard: true, mobile: true, model_calls: 0, real_writes: 0 };
  } finally {
    await page.evaluate(() => window.__drafts?.limpiarObjetivosPlan()).catch(() => {});
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#inicio');
  }
}

