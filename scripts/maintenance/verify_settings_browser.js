// Auth simulado en página aislada: no cambia correos, contraseñas ni sesiones reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  const html = `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>(type)=>type;window.__vite_plugin_react_preamble_installed__=true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import Configuracion from '/src/pages/Configuracion.jsx';import {supabase} from '/src/services/supabase.js';import '/src/index.css';
    const original=supabase.auth.updateUser;window.__restoreSettings=()=>{supabase.auth.updateUser=original;};
    window.__settingsMode='network';window.__settingsCalls=[];
    supabase.auth.updateUser=async(values)=>{window.__settingsCalls.push(Object.keys(values));if(window.__settingsMode==='network')throw new Error('Fixture transport failed');if(window.__settingsMode==='reject')return {error:{message:'Solicitud rechazada por el proveedor'}};return {error:null,data:{user:{}}};};
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Configuracion,{usuario:{email:'persona@example.test'},onCerrarSesion:()=>{window.__settingsClosed=true;}}));
  </script></body></html>`;
  await page.route('**/settings-qa', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  try {
    await page.goto('http://127.0.0.1:5173/settings-qa');
    await page.locator('input[type=email]').fill('nuevo@example.test');
    await page.getByRole('button', { name: 'Guardar correo', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'No se pudo contactar' }).waitFor({ timeout: 3000 });
    if (await page.getByRole('button', { name: 'Guardar correo', exact: true }).isDisabled()) throw new Error('Red caída deja controles bloqueados');
    await page.evaluate(() => { window.__settingsMode = 'reject'; });
    await page.getByRole('button', { name: 'Guardar correo', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Solicitud rechazada' }).waitFor();
    await page.evaluate(() => { window.__settingsMode = 'success'; });
    await page.getByRole('button', { name: 'Guardar correo', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Cambio solicitado' }).waitFor();
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Guardar contraseña', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Contraseña actualizada' }).waitFor();
    if (await page.getByLabel('Nueva contraseña', { exact: true }).inputValue()) throw new Error('Conserva la contraseña después de guardar');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    if (!await page.evaluate(() => window.__settingsClosed)) throw new Error('Cerrar sesión no llama al contenedor');
    await page.setViewportSize({ width: 390, height: 844 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('Desborde móvil');
    return { checks: 5, network_recovered: true, provider_rejection_visible: true, explicit_success: true, password_cleared: true, mobile: true, real_auth_changes: 0 };
  } finally {
    await page.evaluate(() => window.__restoreSettings?.()).catch(() => {});
    await page.unroute('**/settings-qa');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:5173/#inicio');
  }
}
