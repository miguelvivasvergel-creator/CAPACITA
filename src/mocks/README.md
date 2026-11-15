# Datos de desarrollo

Los mocks no prueban que exista una implementación. Las rutas reales de catálogo/comunidad/definición no recurren a ellos cuando falla la API.

| Archivo | Consumidor / situación |
| --- | --- |
| definiciones.js | Ejemplo editable que el usuario carga en el formulario; no es respuesta de API. |
| objetivos.js | Necesidad de ejemplo cargada explícitamente; la interpretación siempre llama a IA real, sin fallback. |
| candidatos.js | Fixture visual de desarrollo para candidatos Python; sin fallback ni consumidor en el recorrido real. |
| laboratorio.js | Casos visuales de desarrollo del laboratorio; no sustituyen respuestas de builds ni se ejecutan automáticamente. |
| versiones.js | Fixture visual B3 de versión/ejecución privada; sin fallback ni import en el recorrido real. |
| workflows.js | Fixture visual B4, sin fallback ni versiones ficticias en selector real. |
| home.js y users.js | Inicio de desarrollo; planner/estadísticas reales pendientes. |
| profile.js | Fallback heredado de perfiles; migración pendiente, no aceptación de datos reales. |
| runs.js | Ejecución de desarrollo; integración persistente real pendiente. |
| catalog/capabilities.js | Fixture antigua del catálogo, sin consumidor actual. Conservada para desarrollo, fuera del recorrido real. |
| catalog/community.js | Fixture antigua de comunidad/rankings, sin consumidor actual. No reintroducir como fallback de producción. |

Los tests del backend tienen sus datos separados en backend/tests/fixtures/. El ejemplo de definición no calcula resultados: la salida esperada la declara el usuario.
