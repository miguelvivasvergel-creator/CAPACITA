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

## Gemini

`ai/check_gemini.py` consulta metadatos del modelo, sin generar contenido ni imprimir claves. `--generate-example` realiza una única generación con un ejemplo público y comprueba sintaxis/firma/hash, sin ejecutar código ni persistir candidatos. Esta opción consume cuota del proveedor; no activa facturación. Configuración solo en backend/.env. La consulta de metadatos no confirma cuota ni nivel de facturación.

```powershell
.\.venv\Scripts\python.exe scripts/ai/check_gemini.py
# Solo cuando se quiera consumir una generación acotada:
.\.venv\Scripts\python.exe scripts/ai/check_gemini.py --generate-example
```

## Auditorías

`maintenance/verify_shared_database.py` comprueba SQL 06/07 en PostgreSQL temporal
sin red ni puertos, con fixtures y sin Supabase real. `--sandbox` añade pruebas
y ejecución real de fixture en gVisor; exige detener antes el trabajador B2.
Guía y preparación de imagen en docs/BLOQUE_3_EJECUCION.md.

`maintenance/verify_shared_remote.py --allow-test-data` realiza aceptación en
Supabase real con fixture privada de la cuenta worker y API temporal propia.
`--exercise-recovery` termina/reinicia el worker durante un run de fixture.
Requiere autorización de datos reales/reinicio y ausencia de otros trabajos;
no consume IA ni altera la capacidad de la usuaria. Ver límites en la guía B3.

`node scripts/maintenance/check_definition_roundtrip.mjs` comprueba que cargar una
propuesta visual en el formulario conserva contratos, campos opcionales, listas,
objetos y ejemplo. `ai/check_gemini.py --interpret-example` consume una llamada
de interpretación con ejemplo público; valida contratos sin consultar catálogo,
persistir ni ejecutar código. Es prueba aislada del proveedor.

```powershell
.\.venv\Scripts\python.exe scripts/maintenance/audit_structure.py
.\.venv\Scripts\python.exe scripts/maintenance/check_docs_links.py
```

La auditoría comprueba imports locales del frontend y señala módulos fuera del recorrido estático de main.jsx. Distingue componentes/fixtures pendientes documentados. No detecta todos los usos dinámicos y nunca borra archivos. El segundo script comprueba destinos de enlaces Markdown locales de README/AGENTS/docs; no visita URLs ni verifica anclas.
