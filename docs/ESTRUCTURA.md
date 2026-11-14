# Organización del repositorio

Actualizado: 14/11/2026. Esta estructura organiza el trabajo existente; no marca
como implementados los módulos pendientes.

## Ubicación de archivos

| Carpeta | Contenido |
| --- | --- |
| `src/pages/` | Pantallas y puntos de entrada de cada módulo. |
| `src/components/auth/` | Formularios y tarjeta de autenticación. |
| `src/components/landing/` | Presentación y fondo animado del acceso. |
| `src/components/capabilities/` | Lista, detalle, tarjetas y marco del catálogo. |
| `src/components/profile/` | Piezas del perfil. |
| `src/components/runs/` | Piezas de ejecución. |
| `src/components/layout/` | Navegación y estructura compartida. |
| `src/components/common/` | Componentes compartidos, como Toast y FileUpload. |
| `src/hooks/` | Comportamiento React reutilizable, como la búsqueda cancelable. |
| `src/services/` | Servicios por recurso; `dotnet.js` identifica explícitamente la integración .NET existente. |
| `src/utils/` | Funciones sin red, como formato y transformación del formulario de definición a contratos. |
| `src/api.js` | Cliente único hacia FastAPI con token de sesión. |
| `src/mocks/` | Datos de desarrollo, separados de las integraciones reales. |
| `src/mocks/catalog/` | Fixtures antiguas de catálogo/comunidad, sin import desde la aplicación actual. |
| `src/index.css` | Estilos globales. Los recursos visuales actuales se dibujan desde componentes; se retiraron assets sin referencias. |
| `backend/api/` | Rutas FastAPI por recurso. |
| `backend/core/` | Configuración, autenticación, visibilidad, respuestas y transporte Supabase. |
| `backend/schemas/` | Contratos Pydantic. |
| `backend/repositories/` | Acceso a persistencia; `memoria.py` sigue siendo almacenamiento de desarrollo de los módulos pendientes. |
| `backend/services/`, `backend/adapters/` | Lógica y adaptadores de ejecución existentes. |
| `backend/services/contract_validation.py` | Validación de contratos/ejemplos sin red; definition_service.py coordina catálogo y guardado. |
| `backend/tests/integration/` | Pruebas a través de interfaces HTTP. |
| `backend/tests/fixtures/` | Proveedor Supabase simulado y datos compartidos; no importar tests desde otros tests. |
| `backend-dotnet/` | Trabajo .NET conservado y aún consumido por algunas pantallas. |
| `db/` | SQL numerado de referencia/migraciones revisadas. |
| `scripts/supabase/` | Configuración local e inspección de Supabase. No mezclar con migraciones automáticas. |
| `scripts/maintenance/` | Auditorías de imports y enlaces, de solo lectura y sin borrado automático. |
| `docs/` | Visión, continuidad, estado, contratos y guías. |
| `docs/referencias/` | Documentos históricos, incluido el PDF original. |
| `docs/historial/` | Fotografías de sesiones/reportes previos; no confundirlas con el estado actual. |

## Movimientos previos — 13/11/2026

| Antes | Ahora |
| --- | --- |
| `src/components/{AuthCard,LoginForm,RegisterForm}.jsx` | Mismos nombres dentro de `src/components/auth/`. |
| `src/components/{HeroSection,NetworkCanvas}.jsx` | Mismos nombres dentro de `src/components/landing/`. |
| `src/components/Toast.jsx` | `src/components/common/Toast.jsx`. |
| `src/pages/Capacidades/{MisCapacidades,DetalleCapacidad,CapacidadesLayout}.jsx` | Mismos nombres dentro de `src/components/capabilities/`. |
| `src/services/CapacitaAPI.js` (imports `capacitaApi`) | `src/services/dotnet.js`, con imports consistentes en todos los sistemas. |
| `backend/tests/test_catalog_api.py` | `backend/tests/integration/test_catalog_api.py`. |
| `scripts/check_supabase_catalog.py` | `scripts/supabase/check_catalog.py`. |
| `scripts/inspect_supabase_schema.py` | `scripts/supabase/inspect_schema.py`. |
| PDF en raíz | `docs/referencias/Plan_Maestro_Capacita_Supabase.pdf`. |

En el bloque anterior se retiraron `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg` y el
componente vacío `ContenedorCapacidad.jsx` tras comprobar que no tenían
consumidores. No se borraron mocks, backend .NET, archivos personales de `.claude/`
ni recursos visuales propios.

`CrearCapacidad.jsx` conserva su ubicación y propiedad funcional de Fahida.
La limpieza mecánica quitó un import sin uso en ese placeholder y una constante
sin uso de FileUpload, sin implementar ni transferir sus funcionalidades. Los
componentes de catálogo trasladados siguen siendo de Miguel según el reparto.

## Organización actual — 14/11/2026

| Antes | Ahora |
| --- | --- |
| Helpers del formulario mezclados con HTTP en services/definiciones.js | HTTP en el mismo servicio; helpers sin red en utils/definiciones.js. |
| Validación y persistencia mezcladas en definition_service.py | Validación compartida en contract_validation.py, orquestación en definition_service.py. |
| SupabaseFixture y constantes dentro de test_catalog_api.py | backend/tests/fixtures/supabase_catalog.py, usado por ambos módulos de tests. |
| Mocks capabilities.js y community.js sin consumidores actuales | src/mocks/catalog/, conservados como fixtures históricas de UI. |
| Continuidad/estado/guía A mezclaban reportes actuales y obsoletos | Guías actuales resumidas, originales completos en docs/historial/. |

Retirados tras comprobar referencias: WeatherForecast.cs, WeatherForecastController.cs
y CAPACITA.API.http de la plantilla .NET; src/assets/hero.png, public/icons.svg y
public/favicon.svg; tres exports HTTP de comunidad .NET ya sin consumidores;
once .gitkeep de carpetas no vacías. Se mantienen los placeholders de carpetas
realmente vacías (workflows) y los archivos de integración pendientes de B.

Se retiraron snapshots/logs .playwright-cli y archivos temporales de preview/pruebas
en output/playwright. Solo se conserva la captura final local ignorada. No se
borraron .env, .claude, node_modules, .venv, SQL, migraciones, lógica .NET ni
memoria/adaptadores de los módulos pendientes.

La auditoría enumera por separado lo inactivo intencional: FileUpload.jsx,
CrearCapacidad.jsx de B y fixtures de src/mocks/catalog/. Un archivo sin import
no se considera automáticamente inútil. Consulta el inventario de mocks y el
punto exacto de reanudación en CONTEXTO_Y_CONTINUIDAD.md.

El build .NET previo a la limpieza está bloqueado por SDK 9.0.305 frente a
net10.0 (NETSDK1045); no se modificó el framework para hacer pasar la revisión.

Verificación tras organizar: 32 pruebas HTTP simuladas, lint y build correctos;
auditoría de imports sin rutas rotas ni inactivos sin clasificar; enlaces locales
de 14 documentos correctos. API reiniciada, health 200 y rutas de definición en
OpenAPI. La prueba autenticada del formulario nuevo sigue pendiente.

## Convenciones

- Componentes y pantallas en PascalCase, servicios y hooks con nombres claros y
  capitalización idéntica en imports y archivos.
- No crear un segundo cliente FastAPI. Para integrar recursos nuevos, usar `api()`.
- Mantener DTO/contratos fuera de las pantallas y persistencia fuera de los routers.
- No migrar ni borrar .NET por organización: requiere reemplazar y verificar sus consumidores.
- No esconder fallos de servicios reales mediante resultados ficticios. Identificar mocks de desarrollo.
- Un entorno Python `.venv/` en raíz; `node_modules/`, `dist/`, cachés y resultados locales fuera de Git.
- `.env` y `backend/.env` son locales. Los ejemplos versionados no contienen valores reales.
- `.vscode/settings.json` contiene solo ajustes compartidos del proyecto: evita analizar los scripts PostgreSQL con MSSQL/T-SQL. Las demás preferencias personales de VS Code siguen ignoradas; no guardar conexiones ni credenciales ahí.
- Antes de mover un archivo, revisar referencias, actualizar imports/enlaces y verificar lint/build o las pruebas afectadas.

El índice de documentación está en [docs/README.md](README.md). La propiedad
de archivos y los contratos siguen rigiéndose por el plan A/B, con estos
movimientos documentados.
