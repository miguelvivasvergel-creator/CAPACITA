# Datos de desarrollo

Los mocks no prueban que exista una implementación. Las rutas reales de catálogo/comunidad/definición no recurren a ellos cuando falla la API.

| Archivo | Consumidor / situación |
| --- | --- |
| definiciones.js | Ejemplo editable que el usuario carga en el formulario; no es respuesta de API. |
| home.js y users.js | Inicio de desarrollo; planner/estadísticas reales pendientes. |
| profile.js | Fallback heredado de perfiles; migración pendiente, no aceptación de datos reales. |
| runs.js | Ejecución de desarrollo; integración persistente real pendiente. |
| catalog/capabilities.js | Fixture antigua del catálogo, sin consumidor actual. Conservada para desarrollo, fuera del recorrido real. |
| catalog/community.js | Fixture antigua de comunidad/rankings, sin consumidor actual. No reintroducir como fallback de producción. |

Los tests del backend tienen sus datos separados en backend/tests/fixtures/. El ejemplo de definición no calcula resultados: la salida esperada la declara el usuario.
