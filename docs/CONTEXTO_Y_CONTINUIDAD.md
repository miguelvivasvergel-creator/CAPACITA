# Capacita — contexto y continuidad

Actualizado: 13 de noviembre de 2026, America/Bogota.

## Lectura inicial

Este archivo permite retomar el proyecto sin depender del historial de chat. Leer también `VISION_MAESTRA.md`, `estado.md` y `../AGENTS.md`; verificar el código y Git antes de actuar. El documento registra acuerdos de conversación, no certifica despliegues ni servicios activos.

## Punto exacto donde quedamos

### Preparación de entrega a la rama miguel — 14/11/2026

El usuario autorizó subir el bloque acumulado al repositorio con un commit detallado. Rama miguel y origin/miguel sincronizadas tras fetch (0/0 antes del commit). Verificación de entrega: 25 pruebas HTTP pasan, lint pasa, build pasa con advertencia de bundle mayor de 500 kB. Se excluyen .env, backend/.env, .claude y sesiones .playwright-cli mediante .gitignore. El commit reúne identidad real, catálogo PostgREST, UI de catálogo/comunidad sin fallback mock, clonación privada con contratos, SQL 03–05, pruebas, reorganización y documentación. Push pendiente al escribir esta nota; verificar resultado de Git y no confundirlo con despliegue. Los SQL se incluyen para trazabilidad; aplicación administrativa reportada por el usuario. Pendientes acceso directo ajeno real y comparación remota de contratos no vacíos; generación, sandbox y motor real no implementados por este bloque.

### Clonación con API actual confirmada — 14/11/2026

Tras aplicar 05 y reiniciar la API con input_schema/output_schema, el usuario confirmó que la nueva clonación funciona y aparece en Mis capacidades. Se registra como validación funcional del recorrido con el código actual. No se compararon todavía contratos no vacíos entre original y copia: su preservación exacta está cubierta por pruebas HTTP simuladas, no verificada remotamente. Bloque de lectura/clonación operativo según usuario. Pendientes: acceso directo ajeno real (404 esperado), comparación remota de contratos no vacíos y siguiente bloque A de definición estructurada/candidatos según plan, sin confundir borrador clonado con implementación ejecutable. Edición/borrado/publicación remotos y motor real siguen pendientes. Sin commit/push ni despliegue.

### Contratos autorizados y API reiniciada — 14/11/2026

El usuario aplicó db/05_catalog_contract_insert.sql y compartió verificación: contrato_entrada/contrato_salida=true; contador/UPDATE/DELETE=false. Se reinició la API sin reload, con acceso de red autorizado, para cargar los modelos nuevos. Verificación local: health=healthy y OpenAPI de CapabilityCreate incluye input_schema/output_schema. Las 25 pruebas del cambio ya habían pasado; no se repitieron sin cambios nuevos. Pendiente nueva clonación autenticada tras este reinicio y comparar contratos del original/copia; no afirmar conservación remota de contratos no vacíos todavía. Los logs de la instancia anterior sí confirmaron POST clone 201 y lecturas 200 del bloque previo. Sin commit/push ni despliegue.

### Conservación de contratos implementada localmente — 14/11/2026

Ante «y ahora», se continuó el bloque pendiente de conservar contratos al clonar. Dos pruebas HTTP reprodujeron primero la pérdida de input_schema/output_schema y el rechazo de esos campos al crear. Se añadieron ambos objetos a CapabilityBase/CapabilityUpdate: el clonado existente los copia y la API los devuelve. Se comprobó persistencia en proveedor simulado, origen sin mutar, copia privada/borrador y 404 para otra identidad en la prueba. 25 pruebas HTTP pasan; no demuestra validación semántica de JSON Schema ni ejecución real.

Se preparó db/05_catalog_contract_insert.sql para conceder INSERT solo de input_schema/output_schema existentes, manteniendo la política de borrador privado de 04; comprueba RLS/presencia de esa política y aborta si hay otras políticas de inserción no inspeccionadas. No aplicado ni validado contra PostgreSQL real. API local sigue ejecutando la versión anterior sin reload: aplicar 05 antes de reiniciarla para evitar rechazos de INSERT. Siguiente: usuario ejecuta 05 y comparte verificación; reiniciar API y comprobar nueva clonación con contratos. Los clones antiguos no se modifican. Acceso directo ajeno real sigue pendiente; la prueba de listas con dos cuentas sí fue confirmada. Sin commit/push ni despliegue.

### Privacidad de listas comprobada por dos cuentas — 14/11/2026

El usuario abrió una segunda cuenta siguiendo la prueba de Mis capacidades/Comunidad y confirmó que no ve el borrador privado clonado por la primera. Evidencia funcional aportada por el usuario: ausencia del clon en las listas de otra cuenta. No equivale a verificar acceso directo por UUID (debe devolver 404), intentos de modificación ni todas las políticas RLS. Lectura, clonación y aislamiento en listas confirmados por el usuario. Siguiente bloque: conservar input_schema/output_schema al clonar y comprobar 404 para acceso directo ajeno. Edición, borrado, publicación y ejecución real siguen pendientes. Sin commit/push ni despliegue.

### Clonación confirmada por el usuario — 14/11/2026

Tras habilitar la inserción limitada con db/04_catalog_draft_insert.sql, el usuario confirmó «funciona correctamente» al probar el recorrido de clonación desde Comunidad hacia Mis capacidades. Se registra como validación funcional aportada por el usuario, sin afirmar inspección independiente de cada atributo o prueba con dos cuentas. Lectura y clonación dejan de estar bloqueadas por los errores de esta sesión. Pendientes: comprobar aislamiento del borrador con segunda cuenta; preservar input_schema/output_schema reales al clonar antes de integrar ejecución; edición/borrado y publicación siguen sin habilitar. Siguiente bloque recomendado: privacidad con dos cuentas y corrección de preservación de contratos del clon. No se hicieron commit/push ni despliegue.

### Inserción concedida, prueba de clonación pendiente — 14/11/2026

El usuario ejecutó db/04_catalog_draft_insert.sql y compartió su comprobación: puede_insertar_nombre=true, puede_insertar_propietario=true, puede_insertar_contador=false, puede_editar_tabla=false y puede_borrar_tabla=false. Es evidencia administrativa aportada por el usuario, no prueba funcional de INSERT ni de RLS con dos cuentas. Siguiente paso: pulsar Clonar borrador una vez desde Comunidad, confirmar que la copia aparece en Mis capacidades como privada/borrador y recargar para comprobar persistencia. Si falla, revisar diagnóstico de Supabase en la API. Pendiente aislamiento con segunda cuenta y preservación de input_schema/output_schema antes de integrar ejecución real. No afirmar que la clonación está verificada todavía.

### Inserción de borradores preparada, sin aplicar — 14/11/2026

El usuario aportó inspección administrativa: USAGE/SELECT true, INSERT de tabla y de todas las columnas false, RLS activo y única política capabilities_select (propias o públicas publicadas). Columnas reales incluyen input_schema/output_schema jsonb no nulos con default {}, permissions text[] y contadores no nulos default 0. Se preparó db/04_catalog_draft_insert.sql: grants por columna compatibles con el payload actual y política INSERT para borradores privados propios con contadores cero y origen de clon visible. No concede actualización, borrado, publicación ni escritura de contadores. Abortará si aparecen políticas INSERT/ALL distintas de la preparada. No aplicado ni probado contra PostgreSQL real. Siguiente paso: usuario ejecuta script en el mismo proyecto, comparte verificación y clona una vez; comprobar copia en Mis capacidades y privacidad con otra cuenta. El backend actual no copia input_schema/output_schema al clonar; quedan defaults: pendiente preservar contratos antes de integrar ejecución real.

### Rechazo de escritura identificado — 14/11/2026

Tras repetir el usuario la clonación, diagnóstico: POST /rest/v1/capabilities devuelve HTTP 403, código PostgreSQL 42501. Confirma rechazo de autorización de escritura; el código por sí solo no distingue grant INSERT ausente de política RLS. La lectura autenticada sigue respondiendo 200. Se preparó scripts/supabase/inspect_catalog_write.sql: solo metadatos de permisos efectivos por tabla/columna, defaults, RLS/políticas y constraints. No hay herramienta administrativa Supabase conectada en esta sesión. Pendiente que el usuario ejecute esa inspección en el SQL Editor del mismo proyecto y comparta resultados antes de preparar permisos mínimos de inserción de borradores propios. No conceder publicación ni escritura general para resolver clone. No se aplicaron cambios remotos.

### Lectura confirmada y clonación pendiente — 14/11/2026

El usuario confirmó que Comunidad carga. Logs reales: catálogo comunitario y propio 200; POST de clonación 503. La escritura no se habilitó en el bloque de lectura anterior. Para distinguir permisos/RLS/constraints se añadió logging mínimo en core/supabase.py: método, ruta permitida, estado HTTP y código alfanumérico del proveedor; sin cuerpos, tokens ni payloads. 23 pruebas simuladas pasan y git diff --check pasa. Se solicitó un nuevo intento de clonar tras recargar API para capturar el código; pendiente ese diagnóstico antes de preparar permisos. No hay corrección de escritura remota ni cambios SQL aplicados.

### Diagnóstico de login y catálogo — 14/11/2026

Tras reiniciar, logs reales confirman Mis capacidades 200. Comunidad llegó a Supabase pero produjo 500 por category=NULL en cuatro filas; el navegador lo presentó como CORS porque la excepción no llevaba esa cabecera. Reproducido con prueba HTTP antes de corregir: ResponseValidationError. El repositorio ahora representa categoría nula como «Sin categoría» sin escribir en BD. Las 23 pruebas HTTP simuladas pasan tras el ajuste. Pendiente recarga del usuario para confirmar catálogo comunitario real y prueba con segunda cuenta. React DevTools es un aviso informativo.

El usuario confirmó login real, pero Mis capacidades/catálogo devolvían error y Comunidad mostraba ejemplos. Logs de FastAPI: GET de catálogo autenticado 503. La comprobación sin filas de Supabase falló por conexión dentro del sandbox; fuera respondió HTTP 401 a la consulta anónima (no demuestra lectura autenticada). Se reinició la API fuera del sandbox con acceso de red autorizado. Pendiente repetir catálogo con sesión real; no se certifica aún lectura ni RLS.

Comunidad usaba API .NET con fallback mock, rankings fijos y clonación que solo mostraba un toast. Se conectó a listarCapacidades/clonarCapacidad vía src/api.js, con paginación, carga/error/reintento y clonación confirmada por API como borrador. Sin ranking ficticio ni workflows simulados. Escritura remota sigue pendiente de permisos; los fallos de clonación se muestran. Validación: lint y build pasan; build advierte bundle mayor de 500 kB. Sin SQL remoto, commit ni push.

### Reanudación y arranque local — 14/11/2026

Se retomó la verificación de lectura autenticada tras los permisos confirmados por el usuario. API iniciada en http://127.0.0.1:8000 y Vite en http://127.0.0.1:5173. Health devuelve 200 y catálogo sin token devuelve 401. Las 22 pruebas HTTP con proveedor simulado pasan; aparece advertencia de deprecación Starlette/httpx. La apertura automatizada con Playwright falló por EACCES al acceder a npm; el reintento fuera del sandbox tampoco produjo resultado verificable y se interrumpió. Se solicitó al usuario abrir la aplicación, iniciar sesión sin compartir credenciales y comunicar el resultado del catálogo. Pendiente lectura real, RLS con dos cuentas y permisos de escritura. Sin cambios de código, SQL remoto, commit ni push.


### Lectura concedida por el usuario — 13/11/2026

El usuario ejecutó el bloque de habilitación de lectura de `db/03_catalog_read_access.sql` y compartió `lectura_profiles=true` y `lectura_capabilities=true` para authenticated. Se registra como verificación administrativa aportada por el usuario, no como prueba de login, RLS con dos cuentas o CRUD real. Siguiente paso: iniciar API/frontend y comprobar lectura autenticada desde la aplicación; permisos de escritura siguen pendientes.

### Corrección de lectura preparada, sin aplicar — 13/11/2026

El usuario compartió RLS/políticas/grants de profiles: RLS activo, SELECT con qual true y UPDATE del dueño, pero sin SELECT/UPDATE a nivel de tabla para authenticated. Se preparó `db/03_catalog_read_access.sql`: conserva/activa RLS, concede USAGE de public y SELECT de profiles/capabilities solo a authenticated, sin alterar políticas ni conceder escritura. La política existente de profiles permite leer los perfiles de otros usuarios autenticados; capabilities conserva dueño o pública publicada. El script incluye comprobación de privilegios sin leer filas. No se aplicó remotamente ni se verificó con PostgreSQL real. Siguiente paso: usuario ejecuta el script en el proyecto correcto, comparte comprobación y se prueba login/catálogo con dos cuentas. CRUD remoto sigue pendiente de políticas/permisos de escritura y protección de publicación/contadores. Los privilegios TRUNCATE/REFERENCES/TRIGGER reportados anteriormente siguen sin modificar.

### Compatibilidad con profiles corregida localmente — 13/11/2026

El usuario confirmó columnas de `profiles`: id, username, display_name, bio, avatar_url, created_at y updated_at. Se corrigieron Auth y su lista de rutas permitidas, relaciones PostgREST del catálogo, lecturas/normalización del frontend y scripts de diagnóstico para usar `profiles`, `display_name` y `bio`. Se conservan las claves de metadata de registro existentes; no se inspeccionó aún el trigger que crea perfiles. La fixture ahora rechaza rutas desconocidas y hay dos pruebas de regresión nuevas. Validación: 22 pruebas HTTP simuladas pasan; lint correcto; build correcto con advertencia de bundle mayor de 500 kB. No se modificó Supabase ni se certificó login/CRUD remoto. Falta recibir RLS, políticas y grants de `profiles`, comprobar privilegios por columna y preparar permisos mínimos de catálogo antes de validar con dos cuentas. Sin commit/push.

### Esquema administrativo recibido — 13/11/2026

El usuario compartió resultados del SQL Editor: existen `profiles`, `capabilities`, `files`, `run_steps`, `runs`, `workflows` y `v_public_activity`. La FK `capabilities_owner_id_fkey` referencia `profiles(id)`, no `perfiles`. El código local de Auth, frontend y relación del catálogo aún usa `perfiles`: incompatibilidad confirmada, pendiente de corregir tras conocer columnas de `profiles`. Capabilities tiene RLS activo y solo se reportó una política SELECT (dueño o pública publicada). Los grants de tabla reportados para anon/authenticated/service_role son REFERENCES/TRIGGER/TRUNCATE, sin SELECT/INSERT/UPDATE/DELETE; no se inspeccionaron grants por columna ni roles heredados. No se modificó la BD. Se corrigió el script de inspección para consultar `profiles`; pendiente recibir columnas, RLS, políticas, grants y constraints de esa tabla antes de preparar corrección de aplicación y permisos.

### Verificación tras reinicio — 13/11/2026

Se retomó la sesión y se confirmó que los cambios locales siguen en `miguel`, sin commit. Las 20 pruebas HTTP con proveedor simulado vuelven a pasar. La consulta remota de metadatos, ejecutada con acceso de red autorizado, confirma Auth settings 200, metadatos 401, perfiles 404/PGRST205 y capabilities 401/42501. No se leyeron filas ni modificaron datos externos. Supabase aparece disponible como plugin, pero no instalado; sigue pendiente conectar acceso administrativo o ejecutar `scripts/supabase/inspect_catalog.sql` en el SQL Editor del proyecto y revisar sus resultados. No se puede certificar el esquema ni RLS con estas comprobaciones públicas.

### Conexión y limpieza autorizadas — 13/11/2026

Miguel pidió completar la conexión del catálogo a Supabase y organizar los archivos. Se configuraron `.env` y `backend/.env` locales con la URL y clave pública que ya tenía el frontend; coincidencia confirmada y archivos ignorados por Git. Se retiró el fallback de proyecto fijo del código frontend para que la configuración sea explícita.

Pruebas remotas sin filas ni escrituras: Auth settings 200; metadatos OpenAPI 401; `perfiles` 404/PGRST205 (no expuesta/no localizada); `capabilities` 401/42501 (permiso denegado a consulta anónima); contrato con relación/columnas 400. Esto requiere inspección administrativa, no justifica abrir permisos ni demuestra que las tablas no existan. Se buscó y sugirió la integración Supabase; instalación/conexión aún sin confirmar. No se pidió ni expuso ningún secreto.

Se organizaron componentes auth/landing/common/capabilities, el cliente .NET pasó a `services/dotnet.js` con imports consistentes, búsquedas comparten `hooks/useBusqueda.js`, scripts en `scripts/supabase/` y pruebas en `backend/tests/integration/`. PDF conservado en `docs/referencias/`. Se retiraron cuatro archivos sin consumidores. No se borró `.claude/`, .NET ni mocks pendientes. `CrearCapacidad` sigue siendo de Fahida; solo se retiró un import sin uso. Detalle de movimientos en `ESTRUCTURA.md`.

Validación de la limpieza: 20 pruebas HTTP pasan y build correcto (advertencia de tamaño de bundle); lint sin errores ni advertencias. Sin validación CRUD/RLS real ni login de prueba aún. No se aplicaron migraciones ni se alteraron datos remotos.

Siguiente paso: confirmar conexión administrativa Supabase, inspeccionar tablas/grants/RLS y corregir incompatibilidades con esquema real antes de crear tablas o aplicar migraciones; después probar con dos cuentas. La limpieza local no depende de ese acceso. Guía de arranque actualizada en README; entorno Python único `.venv/` en raíz. Sin commit/push de estos cambios.

### Reanudación autorizada — 13/11/2026

El usuario, Miguel (Persona A), autorizó empezar el bloque de identidad real y catálogo persistente, exigiendo código limpio y buenas prácticas de seguridad. Las restricciones históricas de no implementar que aparecen más abajo corresponden a la conversación anterior y quedan sustituidas para este bloque, sin autorizar gastos, despliegues ni publicación.

Se implementó localmente Auth mediante `GET /auth/v1/user`, consultas PostgREST con token del usuario y clave pública, `visible_to` en origen y resultados, CRUD/paginación y clonación como borrador. Se conectaron las listas/clonación de React a `src/api.js`, sin fallback mock ni mensajes de ejecución ficticia. Se conserva el formulario/laboratorio asignado a Fahida sin editar.

Validación: 20 pruebas HTTP con proveedor simulado pasan; arranque/OpenAPI (13 rutas), health 200 y catálogo/runs sin token 401; lint sin errores y seis advertencias previas; build correcto con advertencia de bundle. El verificador de esquema se detuvo por falta de configuración de Supabase. No hay prueba remota de persistencia/RLS ni recorrido autenticado de navegador.

No se aplicó SQL ni se modificaron datos externos. Sigue pendiente conectar el motor en memoria con el catálogo real y migrar las rutas históricas de perfiles; no mutar el diccionario de `get_current_user` para persistir perfiles. Publicar por esta API devuelve 409 hasta implementar versiones probadas; el esquema histórico permite cambios directos por Data API y debe endurecerse antes de habilitar ejecución/publicación reales.

Siguiente paso: Miguel configura `backend/.env` con URL y clave pública del mismo proyecto del frontend (no enviar tokens/secretos por el chat), se inspeccionan columnas/grants/políticas y se prueba con dos cuentas. Guía y contrato para B en `modulo-a-identidad-catalogo.md`. Rama `miguel`; `.claude/` se conservó. Sin commit/push por este bloque.

### Contexto anterior

El usuario aceptó la visión final descrita en `VISION_MAESTRA.md`, pidió guardarla y después solicitó repartir el trabajo de forma equilibrada y muy detallada entre dos personas para el martes. Confirmó los nombres: **Miguel = Persona A** (objetivos, catálogo y generación) y **Fahida = Persona B** (pruebas aisladas, workflows y ejecución). `PLAN_DOS_PERSONAS_MARTES.md` contiene contratos, propiedad de archivos, calendario, riesgos y aceptación. Después autorizó subir la documentación a la rama `miguel` para que Fahida la consulte. La disponibilidad horaria aún debe confirmarse. Sigue pendiente implementar la visión; esta autorización no inicia la ejecución de módulos ni el despliegue de la aplicación.

Antes, el usuario pidió inspección sin cambios de código. Se inspeccionó el repositorio, se entregó diagnóstico y se discutieron producto, creación de capacidades, aislamiento, conectores y presupuesto. No se implementaron esos módulos durante la conversación.

## Intención y correcciones del usuario

- Quiere un mundo abierto de capacidades digitales para necesidades de distintos campos, con participación de personas que sepan o no programar.
- La búsqueda previa es dentro de las capacidades existentes del sistema; no una búsqueda general de herramientas en internet como requisito de cada creación.
- Cuando falta una capacidad, la IA puede generar código nuevo desde una especificación; el programa debe poder probarlo y ejecutarlo mediante infraestructura controlada.
- La analogía del usuario es un compilador que prepara lo producido por la IA. La propuesta técnica concreta es una cadena de preparación y pruebas más un ejecutor aislado.
- Marketing, inventarios, documentos y educación son ejemplos, no límites temáticos.
- El asistente trabaja mediante capacidades existentes o creadas y puede conectarse a servicios externos autorizados.
- El diferenciador aceptado: una necesidad resuelta puede convertirse en una capacidad versionada y compartida, aumentando lo que la comunidad puede hacer.
- Presupuesto estudiantil bajo. Mantener la visión; controlar consumo y concurrencia, aprovechar software gratuito y créditos. No confundir servicios gratuitos limitados con operación ilimitada.
- Entrega mencionada: "el martes"; en conversación se interpretó como 17/11/2026. Fecha y modalidad deben confirmarse si vuelven a ser relevantes. No existe una garantía de completar toda la visión para esa fecha.

## Estado de Git observado

- Repositorio: https://github.com/miguelvivasvergel-creator/CAPACITA.git
- Carpeta: `C:\Users\USER\Documents\CAPACITA`.
- Rama observada: `miguel`.
- Antes del diagnóstico se descargó origin y actualizó miguel mediante fast-forward a `a016a62658911cc6627b90a180b8973b17eafed5`, entonces igual a origin/main.
- Había una carpeta `.claude/` sin seguimiento, conservada. No sobrescribirla ni incluirla automáticamente.
- Volver a consultar Git: este estado es una referencia histórica.

## Diagnóstico verificado por lectura de código

### Frontend

- React 19, Vite, Tailwind 3, JavaScript, SDK de Supabase. React Router está declarado, pero App usa hash e historial manual.
- `src/App.jsx`: sesión, navegación y renderizado por secciones. `src/main.jsx`: entrada.
- `src/components/LoginForm.jsx`, `RegisterForm.jsx`, `AuthCard.jsx` y `src/services/supabase.js`: integración real con signUp, signInWithPassword, OAuth Google, getSession, signOut y consulta de perfiles.
- Preservar Auth. No se verificó el recorrido con una cuenta real ni la configuración efectiva del proveedor.
- `src/pages/Inicio.jsx`: estadísticas y destacados mock; el supuesto planner produce el mismo plan fijo y ejecutar muestra un alert.
- `src/pages/Capacidades/Capacidades.jsx`: catálogo comunitario mock y capacidades propias en estado de React, no persistentes.
- `CrearCapacidad.jsx`: placeholder, sin formulario funcional.
- `Workflows.jsx`: estructura visual; nuevo workflow sin acción, conteo estático; constructor pendiente.
- Hay componentes de perfiles, permisos, archivos y ejecución aprovechables.
- `src/api.js`: cliente FastAPI que adjunta token; `src/services/CapacitaAPI.js`: cliente .NET distinto.
- `perfil.js` consulta .NET y luego FastAPI/mocks. `ejecucion.js` también tiene respaldo mock.
- Importaciones con `capacitaApi` no coinciden en capitalización con `CapacitaAPI.js`, riesgo en Linux.

### Backend Python

- FastAPI y Pydantic. Routers registrados: health, capabilities, files, users, runs.
- `backend/core/auth.py`: identidad fija de demo; no valida JWT de Supabase.
- `backend/core/visibility.py`: filtro de listas, todavía sin integración de datos reales.
- `backend/api/capabilities.py`: CRUD y búsqueda textual sobre MOCK_DB, usuario fijo diferente del usado por auth; similaridad por palabras, no semántica.
- `backend/repositories/memoria.py`: perfiles, capacidades, workflows, ejecuciones y archivos de desarrollo.
- Catálogo y motor usan listas diferentes. Crear en el catálogo no registra automáticamente en el motor.
- `backend/api/files.py`: valida extensión/tamaño y devuelve UUID; no almacena contenido, no autentica propietario y no registra ARCHIVOS.
- Runs exige propietario del archivo en ARCHIVOS: recorrido de subida/ejecución no está integrado.
- `backend/services/run_engine.py`: secuencial con BackgroundTasks, pasa una salida al siguiente adaptador, sin contratos completos ni persistencia.
- `backend/adapters/__init__.py`: solo MockAdapter. El resultado es ficticio.
- No se observó router planner/workflows registrado, DAG real ni generación de implementaciones.
- Las capacidades pueden anunciar adaptadores no registrados. Publicación y ejecución deben validar disponibilidad real.
- `requirements.txt` enumera FastAPI, uvicorn, Pydantic y pydantic-settings; revisar dependencias de carga de archivos y futuras integraciones antes de instalar.

### Backend .NET

- Existe ASP.NET Core con EF Core y SQL Server, modelos y seeder propios.
- Se usa desde búsqueda, comunidad y perfiles; convive con Supabase y Python sin una identidad y persistencia unificadas.
- Propuesta: consolidar la ruta principal en FastAPI/Supabase por coherencia con la visión y código de ejecución, evaluando y aprovechando trabajo de .NET antes de migrarlo. La migración no fue ejecutada.

### Datos

- `db/01_schema.sql`: perfiles, capabilities, trigger de perfil, políticas RLS, extensión vector.
- `db/02_runs.sql`: runs, políticas y buckets avatars/outputs.
- Scripts locales no prueban que el esquema esté aplicado. No se inspeccionó Supabase desplegado.
- pgvector habilitado no equivale a embeddings, índices, RPC y búsqueda semántica implementados.
- No duplicar tablas ni aplicar migraciones sin inspeccionar y explicar el esquema real.

## Validación efectuada

`npm run lint` terminó con un error de hooks en `src/pages/Capacidades/MisCapacidades.jsx`: useMemo se llama condicionalmente. Seis advertencias: imports/variables sin usar en ContenedorCapacidad, CapacidadesEmptyState, FileUpload, CrearCapacidad; actualizaciones síncronas de estado en effects de BuscadorGlobal y Buscar.

No se ejecutó build, no se probaron credenciales ni conexiones externas, ni pruebas funcionales completas. No afirmar que el proyecto funciona de extremo a extremo.

En este entorno PowerShell tardó o quedó sin salida; cmd.exe con login=false funcionó para lecturas. Hubo EPERM al ejecutar Node y permiso denegado al escribir .git; se usaron escalaciones explícitas cuando correspondió. No asumir que futuras sesiones tienen las mismas restricciones.

## Próximo paso recomendado, pendiente de instrucción

1. Mostrar al usuario un resumen corto de dónde quedamos y consultar `PLAN_DOS_PERSONAS_MARTES.md` para el reparto A/B y calendario.
2. Verificar estado actual y conocer modalidad de entrega, acceso administrativo a Supabase, proveedor de IA y entorno de sandbox disponibles, sin pedir claves en el chat.
3. Acordar primer bloque de implementación: unificar identidad y catálogo persistente, conservando Auth, después contrato/versionado y ejecución real.
4. Mantener como demostración central crear una capacidad faltante, probarla, ejecutarla, compartirla y reutilizarla desde otra cuenta.
5. No transformar una limitación inicial de recursos en una reducción permanente de la visión a un solo sector.

## Actualizaciones futuras

Registrar fecha, decisiones nuevas, archivos cambiados, pruebas realmente ejecutadas, errores pendientes y siguiente acción. Mantener trazabilidad entre idea, propuesta, implementación y verificación.
