# Organización del repositorio

Actualizado: 13/11/2026. Esta estructura organiza el trabajo existente; no marca
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
| `src/api.js` | Cliente único hacia FastAPI con token de sesión. |
| `src/mocks/` | Datos de desarrollo, separados de las integraciones reales. |
| `src/assets/`, `public/` | Recursos visuales conservados; no guardar resultados privados. |
| `backend/api/` | Rutas FastAPI por recurso. |
| `backend/core/` | Configuración, autenticación, visibilidad, respuestas y transporte Supabase. |
| `backend/schemas/` | Contratos Pydantic. |
| `backend/repositories/` | Acceso a persistencia; `memoria.py` sigue siendo almacenamiento de desarrollo de los módulos pendientes. |
| `backend/services/`, `backend/adapters/` | Lógica y adaptadores de ejecución existentes. |
| `backend/tests/integration/` | Pruebas a través de interfaces HTTP. |
| `backend-dotnet/` | Trabajo .NET conservado y aún consumido por algunas pantallas. |
| `db/` | SQL numerado de referencia/migraciones revisadas. |
| `scripts/supabase/` | Configuración local e inspección de Supabase. No mezclar con migraciones automáticas. |
| `docs/` | Visión, continuidad, estado, contratos y guías. |
| `docs/referencias/` | Documentos históricos, incluido el PDF original. |

## Movimientos del bloque de limpieza

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

Se retiraron `src/App.css`, `src/assets/react.svg`, `src/assets/vite.svg` y el
componente vacío `ContenedorCapacidad.jsx` tras comprobar que no tenían
consumidores. No se borraron mocks, backend .NET, archivos personales de `.claude/`
ni recursos visuales propios.

`CrearCapacidad.jsx` conserva su ubicación y propiedad funcional de Fahida.
La limpieza mecánica quitó un import sin uso en ese placeholder y una constante
sin uso de FileUpload, sin implementar ni transferir sus funcionalidades. Los
componentes de catálogo trasladados siguen siendo de Miguel según el reparto.

## Convenciones

- Componentes y pantallas en PascalCase, servicios y hooks con nombres claros y
  capitalización idéntica en imports y archivos.
- No crear un segundo cliente FastAPI. Para integrar recursos nuevos, usar `api()`.
- Mantener DTO/contratos fuera de las pantallas y persistencia fuera de los routers.
- No migrar ni borrar .NET por organización: requiere reemplazar y verificar sus consumidores.
- No esconder fallos de servicios reales mediante resultados ficticios. Identificar mocks de desarrollo.
- Un entorno Python `.venv/` en raíz; `node_modules/`, `dist/`, cachés y resultados locales fuera de Git.
- `.env` y `backend/.env` son locales. Los ejemplos versionados no contienen valores reales.
- Antes de mover un archivo, revisar referencias, actualizar imports/enlaces y verificar lint/build o las pruebas afectadas.

El índice de documentación está en [docs/README.md](README.md). La propiedad
de archivos y los contratos siguen rigiéndose por el plan A/B, con estos
movimientos documentados.
