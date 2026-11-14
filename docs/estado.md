# Estado del proyecto

Cada persona actualiza su sección al terminar cada bloque de fechas: qué quedó listo, qué falta y qué bloquea.

## Visión y continuidad — 13/11/2026

- **Planificado:** reparto equilibrado entre dos personas y calendario hasta el martes 17/11 en [PLAN_DOS_PERSONAS_MARTES.md](./PLAN_DOS_PERSONAS_MARTES.md). Nombres confirmados: **Miguel (A): objetivos/catálogo/generación; Fahida (B): pruebas/workflows/ejecución**. Sin implementación iniciada por esta tarea.
- **Documentado:** visión acordada, creación y reutilización de capacidades, arquitectura propuesta, aislamiento, conectores, permisos, presupuesto y criterios de aceptación en [VISION_MAESTRA.md](./VISION_MAESTRA.md).
- **Punto de reanudación:** diagnóstico verificado, decisiones, limitaciones y siguiente paso en [CONTEXTO_Y_CONTINUIDAD.md](./CONTEXTO_Y_CONTINUIDAD.md). `AGENTS.md` indica leerlos al iniciar.
- **Validación anterior:** lint con un error de hooks y seis advertencias; sin verificación funcional completa ni inspección del esquema desplegado de Supabase.
- **Pendiente:** implementar progresivamente la visión. El guardado de documentación no implementa los módulos ni autoriza gastos o despliegues.
- Las secciones de módulos inferiores conservan reportes previos del equipo; contrastarlas con el diagnóstico y código antes de tratarlas como funcionalidades integradas.

## Módulo A — Miguel (puerta de entrada)

- **Entrega Git autorizada — 14/11/2026:** preparación de commit detallado del bloque acumulado a miguel. Antes del commit: 25 pruebas HTTP, lint y build pasan (advertencia de bundle); rama al día con origin/miguel. Archivos locales/credenciales excluidos. Comprobar commit/push efectivo en Git; esto no despliega la aplicación.

- **Clonación con contratos en API confirmada — 14/11/2026:** usuario reporta éxito y presencia en Mis capacidades tras reinicio con modelos nuevos y permisos 05. Lectura/clonación operativas según usuario. Preservación exacta de contratos no vacíos probada con proveedor simulado, pendiente comparación remota. Acceso directo ajeno real sigue pendiente; no hay ejecución/publicación habilitada.

- **Contratos autorizados y API activa — 14/11/2026:** usuario confirma 05 aplicado (entrada/salida=true, contador/UPDATE/DELETE=false). API reiniciada; health healthy y OpenAPI incluye ambos contratos. Pendiente probar nuevo clon autenticado y comparación de contratos remotos. 25 pruebas simuladas del cambio pasan; acceso directo ajeno real sigue pendiente.

- **Contratos de clonación corregidos localmente — 14/11/2026:** input_schema/output_schema ahora forman parte de modelos de creación/respuesta/actualización; clonación conserva ambos. Dos regresiones reproducidas antes del cambio; 25 pruebas HTTP con proveedor simulado pasan, incluido 404 ajeno del nuevo clon. db/05_catalog_contract_insert.sql preparado, no aplicado, para insertar esas dos columnas bajo RLS de borradores privados. Aplicar antes de reiniciar API, que sigue con versión anterior sin reload. Sin validación PostgreSQL ni clonación remota del nuevo código aún; no repara clones antiguos ni habilita ejecución.

- **Privacidad en listas con dos cuentas — 14/11/2026:** el usuario confirma que la segunda cuenta no ve el borrador privado de la primera en Mis capacidades/Comunidad. No se verificó aún acceso directo por UUID (404 esperado) ni modificación ajena. Siguiente: preservar contratos input_schema/output_schema al clonar y comprobar acceso directo. No confundir esta prueba de listas con certificación completa de RLS.

- **Clonación real confirmada por usuario — 14/11/2026:** el usuario reporta funcionamiento correcto tras habilitar inserción limitada. Lectura y clonación ya no bloqueadas. Pendientes aislamiento con segunda cuenta y conservar input_schema/output_schema al clonar antes de ejecución. Edición, borrado y publicación no habilitados; sin commit/push ni despliegue.

- **Inserción concedida según usuario — 14/11/2026:** tras ejecutar db/04_catalog_draft_insert.sql, verificación nombre/propietario=true, contador/UPDATE/DELETE=false. Pendiente clonación desde Comunidad, copia privada/borrador persistente en Mis capacidades y aislamiento con dos cuentas. No se certifica todavía INSERT funcional ni RLS remoto.

- **Permisos mínimos preparados, no aplicados — 14/11/2026:** inspección del usuario confirma ausencia de INSERT por tabla/columna y de política INSERT. db/04_catalog_draft_insert.sql permite solo insertar borradores privados propios, controla origen visible y contadores cero; grants por columna, sin UPDATE/DELETE/publicación. Pendiente ejecución administrativa y clonación real/privacidad con dos cuentas. Sin validación PostgreSQL real. Contratos input_schema/output_schema existen en BD pero la clonación actual no los conserva: pendiente antes de ejecución.

- **Causa de clone delimitada — 14/11/2026:** Supabase rechaza INSERT con HTTP 403/42501. Pendiente distinguir grant ausente de RLS mediante scripts/supabase/inspect_catalog_write.sql (solo metadatos), preparado para SQL Editor. Sin conexión administrativa ni permisos remotos modificados. La futura corrección debe limitarse a borradores privados propios, sin habilitar publicación.

- **Lectura real confirmada, clonación pendiente — 14/11/2026:** usuario confirma Comunidad cargada; GET comunitario/propio 200 en logs, POST clone 503. Añadido diagnóstico sanitizado del código/estado de Supabase para distinguir permisos, RLS o restricciones. 23 pruebas pasan; diff --check correcto. Pendiente nuevo intento del usuario y análisis antes de preparar escritura; no se modificó BD.

- **Corrección de catálogo — 14/11/2026:** logs reales tras reinicio: Mis capacidades 200; comunidad 500 por category=NULL, visible como CORS en navegador. Reproducido en prueba HTTP y corregido normalizando la categoría ausente sin alterar BD. 23 pruebas simuladas pasan. Pendiente confirmación visual de Comunidad y aislamiento real con dos cuentas.

- **Diagnóstico y corrección local — 14/11/2026:** login confirmado por usuario; catálogo autenticado 503 en API. Supabase inaccesible desde sandbox pero responde fuera; API reiniciada con acceso de red autorizado. Pendiente repetir lectura con usuario. Comunidad migrada desde .NET/mocks al catálogo y clonación reales, con carga/error/reintento y paginación; sin rankings inventados ni confirmación ficticia de clonación. Lint y build pasan (advertencia de bundle); escritura y RLS remoto siguen sin certificar.

- **Reanudación — 14/11/2026:** API y frontend iniciados localmente; health 200, catálogo sin token 401 y 22 pruebas HTTP simuladas pasan. Pendiente que el usuario complete login y comunique lectura del catálogo; no se certifica RLS remoto ni escritura. Sin cambios de código ni datos externos.

- **Lectura concedida — 13/11/2026:** usuario reportó comprobación efectiva SELECT=true para authenticated en profiles y capabilities tras ejecutar SQL. Pendiente probar login y catálogo desde la aplicación y aislamiento con dos cuentas. Escritura no habilitada por este bloque.

- **Preparado, no aplicado — 13/11/2026:** `db/03_catalog_read_access.sql` concede lectura autenticada de profiles/capabilities conservando RLS y políticas existentes. Basado en resultados administrativos aportados por el usuario. Pendiente ejecución, prueba con dos cuentas y diseño de permisos de escritura; no se certifica CRUD remoto.

- **Ajuste tras inspección real — 13/11/2026:** Supabase usa `profiles` con `display_name`/`bio`. Auth, gateway, relaciones de catálogo, frontend y scripts locales corregidos. 22 pruebas HTTP simuladas, lint y build pasan (advertencia de bundle). Permisos de catálogo y RLS/grants de profiles aún pendientes; sin cambios remotos ni prueba con dos cuentas.

- **Implementado localmente — 13/11/2026:** validación del token con Supabase Auth, repositorio persistente del catálogo mediante PostgREST con token de usuario, filtros `visible_to`, CRUD autorizado, paginación y clonación privada como borrador. UI de listas/clonación conectada sin fallback mock. Detalle y límites en [modulo-a-identidad-catalogo.md](./modulo-a-identidad-catalogo.md).
- **Validado:** 20 pruebas HTTP con proveedor simulado; arranque/OpenAPI y rechazo sin token; lint sin errores ni advertencias tras limpieza; build correcto con advertencia de tamaño. No equivale a probar CRUD/RLS de Supabase real.
- **Falta:** verificar esquema/grants/RLS y CRUD con dos cuentas reales; integrar formulario de Fahida, versiones/pruebas/habilitación y motor; migrar perfiles históricos. No hay generación ni ejecución real nuevas en este bloque.
- **Conexión configurada:** `.env` y `backend/.env` locales apuntan al mismo proyecto existente; clave pública, sin service_role. Auth settings remoto responde 200.
- **Bloquea la integración de datos:** metadatos no disponibles a la clave pública; `perfiles` no expuesta/no localizada (404/PGRST205), `capabilities` sin permiso anónimo (401/42501), contrato completo 400. Falta conexión administrativa a Supabase y dos cuentas de prueba. No se aplicaron migraciones, alteraron datos remotos ni desplegó la aplicación.
- **Organización:** Auth, landing y catálogo agrupados; imports .NET consistentes; scripts Supabase y tests de integración separados; PDF histórico en `docs/referencias/`; plantillas sin uso retiradas y cachés/configuración local ignoradas. Mapa en [ESTRUCTURA.md](./ESTRUCTURA.md). Backend .NET y mocks pendientes conservados.

## Módulo B — Franklin (capacidades y búsqueda semántica)

- **Listo:**
- **Falta:**
- **Bloquea:**

## Módulo C — Luis Miguel (workflows y Planner)

- **Listo:**
- **Falta:**
- **Bloquea:**

## Módulo D — Fahida (perfil, permisos y ejecución)

- **Listo:**
  - Conexión con el backend (`src/api.js`), `.env.example`, `AGENTS.md` y README.
  - Perfil propio y público con pestañas Capacidades / Workflows / Actividad y "Editar perfil".
  - `GET /users/{username}`, `PATCH /users/me`, `POST /users/me/avatar`, `GET /users/{username}/activity`.
  - Tabla `runs` y buckets `avatars` / `outputs` (`db/02_runs.sql`).
  - `adapters/base.py`, registro `ADAPTERS` y `adapters/mock.py` (listo para que cada quien agregue su adaptador).
  - `POST /runs`, `GET /runs/{id}`, `GET /runs?workflow_id=&limit=` con motor en segundo plano.
  - Modal de Permisos y pantalla de Ejecución conectados: consultan `GET /runs/{id}` cada 1,5 s.
- **Falta:** integración 12–14 oct con los módulos A, B y C.
- **Bloquea:**
  - `core/auth.py` y `core/visibility.py` son temporales (usuario de prueba `fahida`) hasta que Luis Miguel entregue los reales.
  - Ejecutar con archivo necesita `POST /files` de Franklin en main, y que registre el dueño del archivo en `ARCHIVOS`.
  - Los datos viven en memoria (`repositories/memoria.py`) hasta conectar Supabase.
