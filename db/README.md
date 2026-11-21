# SQL de Capacita

Inspeccionar el proyecto real antes de aplicar SQL. No ejecutar todos los archivos por número como una instalación automática: el esquema desplegado difiere de la referencia inicial.

| Archivo | Propósito / situación conocida |
| --- | --- |
| 01_schema.sql | Referencia histórica en español (perfiles), distinta del Supabase real (profiles). No reaplicar sobre el proyecto existente. |
| 02_runs.sql | Referencia histórica de runs/storage. Su presencia no certifica aplicación ni integración del motor. |
| 03_catalog_read_access.sql | Lectura autenticada de profiles/capabilities conservando RLS; usuario reportó aplicación. |
| 04_catalog_draft_insert.sql | INSERT por columnas y política de borradores privados propios, sin publicación/UPDATE/DELETE; usuario reportó aplicación. |
| 05_catalog_contract_insert.sql | Añade INSERT solo de input_schema/output_schema existentes; usuario reportó aplicación. |
| 06_private_candidates.sql | Usuario reportó aplicación y permisos true,true,false,false (SELECT/INSERT/UPDATE/DELETE): tabla privada capability_candidates, RLS por dueño e INSERT/SELECT mínimos. Falta prueba real de persistencia/RLS con dos cuentas. No repetir sin inspección; no habilita ejecución. |
| 07_profile_edit_and_avatars.sql | Aplicado por usuario: grants true,true,true,false,false. Perfil/avatar propios persistentes verificados. Otra cuenta: UPDATE ajeno cero filas, upload ajeno 403 e id 42501. UPDATE por columnas y RLS restrictiva; bucket público avatars PNG hasta 2 MB. No repetir. |
| 07_shared_execution.sql | Aplicado por Fahida, cuenta worker autorizada y aceptación privada B3 verificada con sesiones/fixture reales. No repetir. Cola/reportes compartidos, versiones privadas y runs; no importa SQLite. Guía en docs/BLOQUE_3_EJECUCION.md. |
| 08_private_workflows.sql | Aplicado por Fahida, RPC y aceptación técnica remota de fixture verificadas. No repetir. Workflows privados, revisiones/aprobaciones y progreso; protocolo worker 2 activo. Preserva B3. |

Nuevo formulario de definición: reutiliza columnas/grants de 04/05 y config.definition; no requiere migración adicional. Permisos de UPDATE/DELETE, publicación/versiones, builds y motor reales siguen pendientes.

Inspección administrativa: scripts/supabase/inspect_catalog.sql e inspect_catalog_write.sql. Las pruebas HTTP usan proveedor simulado y no sustituyen pruebas RLS remotas con dos cuentas.

## Editor SQL

Estos scripts son PostgreSQL/Supabase, no T-SQL de SQL Server. Si el panel Problemas indica propietario `mssql` y marca DO, $$, :: o CREATE POLICY como incorrectos, se está usando el analizador de otro dialecto.

La configuración compartida `.vscode/settings.json` desactiva IntelliSense y comprobación T-SQL de MSSQL solo para este workspace; no cambia los ajustes globales ni los scripts. No añade validación PostgreSQL. Para validar/ejecutar sobre el proyecto usar su SQL Editor de Supabase. Si quedan diagnósticos anteriores, ejecutar **Developer: Reload Window** en la paleta de VS Code.

Las dos claves se verificaron en el manifiesto de MSSQL 1.47.0 instalado (scope window) y en su [documentación oficial](https://github.com/microsoft/vscode-mssql/wiki/customize-options). No volver a aplicar migraciones por estos avisos del editor.
# Publicación ejecutable B6

`09_executable_publications.sql`: probado en PostgreSQL temporal/gVisor y aplicado
por Fahida a Supabase, RPC verificada y flag activo el 16/11/2026. No repetir.
Requiere 06, 07_shared_execution y 08 ya existentes.
No publica capacidades automáticamente. Ver docs/BLOQUE_6_INTEGRACION.md antes de
aplicar y activar PUBLICATIONS_ENABLED. No repetir migraciones anteriores.

# Caja de herramientas del sandbox

`10_toolbox_profile.sql`: aplicado por Fahida en Supabase el 17/11/2026 (solo reemplaza la función; verificado `activar_acepta_toolbox = true`). Requiere 07, 08
y 09. Activar versiones acepta pruebas del perfil `gvisor-python-toolbox-v1` (imagen de
`scripts/sandbox/Dockerfile.toolbox`) además de `gvisor-python-stdlib-v1`, y guarda el
perfil real de cada versión. Reiniciar API y trabajador solo después de aplicarlo.
`11_toolbox_version_executor.sql`: aplicado por Fahida el 17/11/2026; activación toolbox verificada (201). Supabase tenía la regla
`version_executor` (experimento managed-tools, no versionado aquí) que exigía stdlib a
las versiones de la fábrica; el SQL 11 la amplía al perfil toolbox y retira
`versions_profile_known`, que quedó instalada por un intento del SQL 10.
`12_file_limits.sql`: **pendiente de aplicar por Fahida**. Sube los límites de datos para
archivos (entradas, salidas y casos: 64 KiB → 4 MB; foto del trabajo 350 KB → 8 MB; payload
400 KB → 9 MB). Toma la definición viva de cada función y solo cambia el número; si no
encuentra el texto esperado, cancela todo. Los reportes siguen en 64 KiB.

`20_limite_20_pasos.sql`: **pendiente de aplicar por Fahida**. Sube de 12 a 20 los pasos que admite
`execution_workflow_save` (db/08); el resto de la función queda igual y conserva sus permisos. Debe
coincidir con `MAX_NODOS` en `backend/schemas/workflows.py`. Sin aplicarlo, un plan de 13 a 20 pasos
se propone pero falla al guardarse (`node_limit`). Termina con una comprobación (`tope_20 = true`).

`21_telegram_bot.sql`: **pendiente de aplicar por Fahida** (después de 16, 17 y 20). Bot completo:
columna `gemini_consent` en `telegram_links`, tabla privada `telegram_pending` (botones y conversaciones,
vencen en 30 min) y funciones del trabajador (`check_worker`; el dueño sale SIEMPRE del chat vinculado):
pedir y aprobar (`telegram_save_and_run`, `telegram_run_workflow`), avance (`telegram_job_origin`),
`telegram_jobs`/`telegram_job_result`, `telegram_assistants` y `telegram_planner_versions` (mismo filtro
de visibilidad que db/17). Sin él, el bot solo vincula y desvincula.

`15_conectores_iniciales.sql` **regenerado** con el conector `revisar_condicion@1` (alertas «avísame si…»).
Volver a ejecutarlo: no duplica filas, solo agrega el conector nuevo.

`22_archivar_capacidades.sql`: **pendiente de aplicar por Fahida** (después de 07, 08 y 09). Permite
eliminar una herramienta propia desde Mi biblioteca: columna `archived` en `public.capabilities` y función
`capability_archive(p_id)` (solo el dueño; 404 si no es suya). No borra la fila, porque sus versiones y
ejecuciones la referencian: deshabilita sus versiones, retira su publicación y la oculta del catálogo, el
planner y la comunidad, conservando el historial. Sin aplicarlo, «Eliminar» responde que falta un script
SQL; el resto funciona igual. Termina con una comprobación (`archivar_listo = true`).
