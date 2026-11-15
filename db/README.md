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

Nuevo formulario de definición: reutiliza columnas/grants de 04/05 y config.definition; no requiere migración adicional. Permisos de UPDATE/DELETE, publicación/versiones, builds y motor reales siguen pendientes.

Inspección administrativa: scripts/supabase/inspect_catalog.sql e inspect_catalog_write.sql. Las pruebas HTTP usan proveedor simulado y no sustituyen pruebas RLS remotas con dos cuentas.

## Editor SQL

Estos scripts son PostgreSQL/Supabase, no T-SQL de SQL Server. Si el panel Problemas indica propietario `mssql` y marca DO, $$, :: o CREATE POLICY como incorrectos, se está usando el analizador de otro dialecto.

La configuración compartida `.vscode/settings.json` desactiva IntelliSense y comprobación T-SQL de MSSQL solo para este workspace; no cambia los ajustes globales ni los scripts. No añade validación PostgreSQL. Para validar/ejecutar sobre el proyecto usar su SQL Editor de Supabase. Si quedan diagnósticos anteriores, ejecutar **Developer: Reload Window** en la paleta de VS Code.

Las dos claves se verificaron en el manifiesto de MSSQL 1.47.0 instalado (scope window) y en su [documentación oficial](https://github.com/microsoft/vscode-mssql/wiki/customize-options). No volver a aplicar migraciones por estos avisos del editor.
