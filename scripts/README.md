# Scripts

Ejecutar desde la raíz con el Python de `.venv/`. No muestran claves ni aplican SQL remoto automáticamente.

## Supabase

| Archivo | Función |
| --- | --- |
| supabase/setup_env.py | Prepara backend/.env desde frontend, sin sobrescribir un proyecto distinto ni mostrar claves. |
| supabase/check_catalog.py | Consulta contrato con limit=0, sin filas. Un rechazo anónimo no demuestra RLS incorrecto. |
| supabase/inspect_schema.py | Consulta metadatos accesibles a la clave pública. |
| supabase/inspect_catalog.sql | Inspección administrativa de tablas/columnas/políticas/grants/constraints en SQL Editor. |
| supabase/inspect_catalog_write.sql | Inspección de permisos de inserción efectivos, sin modificar datos. |

Los SQL numerados para permisos están en db/, no son scripts de arranque. No ejecutar los esquemas históricos automáticamente sobre un proyecto existente.

## Mantenimiento de solo lectura

```powershell
.\.venv\Scripts\python.exe scripts/maintenance/audit_structure.py
.\.venv\Scripts\python.exe scripts/maintenance/check_docs_links.py
```

La auditoría comprueba imports locales del frontend y señala módulos fuera del recorrido estático de main.jsx. Distingue componentes/fixtures pendientes documentados. No detecta todos los usos dinámicos y nunca borra archivos. El segundo script comprueba destinos de enlaces Markdown locales de README/AGENTS/docs; no visita URLs ni verifica anclas.
