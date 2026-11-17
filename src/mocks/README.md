# Datos de desarrollo

Los mocks no prueban que exista una implementación. Las rutas reales nunca
recurren a ellos cuando falla la API.

| Archivo | Consumidor / situación |
| --- | --- |
| definiciones.js | Ejemplo editable que el usuario carga en el formulario; no es respuesta de API. |
| objetivos.js | Necesidad de ejemplo cargada explícitamente; la interpretación siempre llama a IA real. |
| inicio.js | Fixture de `scripts/maintenance/verify_home_browser.js`. |
| perfil-real.js | Fixture de `scripts/maintenance/verify_profile_browser.js`. |
| busqueda.js | Fixture de `scripts/maintenance/verify_search_browser.js`. |
| guiado.js | Fixture de `scripts/maintenance/verify_guided_browser.js`. |
| trabajo.js | Fixture de `verify_trabajo_browser.js` y `verify_planner_resume_browser.js`. |

Las fixtures de pruebas de pantalla se retiran junto con la pantalla que verifican.
Los tests del backend tienen sus datos separados en `backend/tests/fixtures/`.
