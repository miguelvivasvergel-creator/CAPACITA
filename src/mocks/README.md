# Datos de desarrollo

Los mocks no prueban que exista una implementación. Las rutas reales de catálogo/comunidad/definición no recurren a ellos cuando falla la API.

| Archivo | Consumidor / situación |
| --- | --- |
| definiciones.js | Ejemplo editable que el usuario carga en el formulario; no es respuesta de API. |
| objetivos.js | Necesidad de ejemplo cargada explícitamente; la interpretación siempre llama a IA real, sin fallback. |
| candidatos.js | Fixture visual de desarrollo para candidatos Python; sin fallback ni consumidor en el recorrido real. |
| laboratorio.js | Casos visuales de desarrollo del laboratorio; no sustituyen respuestas de builds ni se ejecutan automáticamente. |
| inicio.js | Fixtures visuales para pruebas interceptadas de Inicio; no fallback. |
| dashboard.js | Fixture visual A4 para resumen de trabajo; sin fallback de métricas. |
| planner.js | Fixture de objetivo del planner; sin fallback de IA ni IDs ejecutables. |
| home.js y users.js | Mocks históricos sin consumidor actual; Inicio usa catálogo autorizado e interpretación real. |
| profile.js | Fixture histórica sin consumidor: perfil conectado a FastAPI, sin fallback. |
| perfil-real.js | Fixture de contrato para pruebas interceptadas de perfil; no se usa en producción. |
| busqueda.js | Fixture de búsqueda para pruebas interceptadas; sin fallback ni consumidor de producción. |
| versiones.js | Fixture visual B3 de versión/ejecución privada; sin fallback ni import en el recorrido real. |
| workflows.js | Fixture visual B4, sin fallback ni versiones ficticias en selector real. |
| runs.js | Ejecución de desarrollo; integración persistente real pendiente. |
| catalog/capabilities.js | Fixture antigua del catálogo, sin consumidor actual. Conservada para desarrollo, fuera del recorrido real. |
| catalog/community.js | Fixture antigua de comunidad/rankings, sin consumidor actual. No reintroducir como fallback de producción. |

Los tests del backend tienen sus datos separados en backend/tests/fixtures/. El ejemplo de definición no calcula resultados: la salida esperada la declara el usuario.
`trabajo.js`: fixtures del espacio de trabajo A, integración con componentes B3 y
reparación de candidatos. Usadas solo por pruebas interceptadas, nunca como
respuesta ni fallback de las APIs reales.
# Historial B5

`historial.js` contiene resultados de fixture para pruebas visuales; nunca se
usa como fallback de la API del historial.
# Experiencia guiada

`guiado.js` contiene contratos, propuestas y herramientas de prueba para la
aceptación interceptada de los modos. No se importa desde el producto ni se usa
para sustituir respuestas de IA, laboratorio o ejecución.
