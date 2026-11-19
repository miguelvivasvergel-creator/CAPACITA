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

## Demo

`demo/iniciar-demo.ps1` arranca todo para una demo local: avisa si hay poca memoria, comprueba
el sandbox de WSL (Docker en `/run/capacita-docker.sock` con gVisor), abre backend, trabajador
y frontend en ventanas propias, espera a que cada uno responda y abre el navegador. No instala
nada ni muestra claves. Para apagar, cerrar las tres ventanas. Archivo de ejemplo:
`docs/demo/ventas.xlsx`.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\demo\iniciar-demo.ps1
```

## Gemini

`ai/check_gemini.py` consulta metadatos del modelo, sin generar contenido ni imprimir claves. `--generate-example` realiza una única generación con un ejemplo público y comprueba sintaxis/firma/hash, sin ejecutar código ni persistir candidatos. Esta opción consume cuota del proveedor; no activa facturación. Configuración solo en backend/.env. La consulta de metadatos no confirma cuota ni nivel de facturación.

```powershell
.\.venv\Scripts\python.exe scripts/ai/check_gemini.py
# Solo cuando se quiera consumir una generación acotada:
.\.venv\Scripts\python.exe scripts/ai/check_gemini.py --generate-example
```

## Auditorías

`maintenance/verify_trabajo_browser.js` monta consumidores A y componentes B3 reales
con respuestas interceptadas: contrato de ejecución, reparación consentida, error
sin fallback, protección de candidatos ajenos y traspaso de objetivo al formulario.
No usa Gemini, no ejecuta sandbox ni escribe registros reales.

`maintenance/verify_planner_browser.js` comprueba el planner con API interceptada:
consentimiento, huellas de contratos, propuesta, aclaración, error y móvil. No usa
IA ni escribe datos reales. Ejecutar desde una sesión Playwright con Vite activo.

`maintenance/verify_planner_persistence_browser.js` es una aceptación REAL y requiere
autorización de guardado: partir de una propuesta nueva ya importada en Workflows
(encabezado Crear workflow). Guarda un proceso privado y compara su definición
tras recargar; no aprueba ni ejecuta. No usar sobre un proceso existente. Ambos:
`playwright-cli run-code --filename scripts/maintenance/NOMBRE_DEL_SCRIPT.js`.

`maintenance/verify_shared_database.py --workflows` añade migración 08 y casos de
workflows a PostgreSQL temporal. `--sandbox` añade dos pasos reales en gVisor;
detener worker antes. `maintenance/verify_workflow_ui.py` verifica editor en
Chrome headless con API simulada y perfiles temporales, escritorio/móvil. No
utiliza sesión de usuario ni Supabase real; artefactos en output/playwright.

`maintenance/verify_shared_database.py` comprueba SQL 06/07 en PostgreSQL temporal
sin red ni puertos, con fixtures y sin Supabase real. `--sandbox` añade pruebas
y ejecución real de fixture en gVisor; exige detener antes el trabajador B2.
Guía y preparación de imagen en docs/BLOQUE_3_EJECUCION.md.

`maintenance/verify_shared_remote.py --allow-test-data` realiza aceptación en
Supabase real con fixture privada de la cuenta worker y API temporal propia.
`--exercise-recovery` termina/reinicia el worker durante un run de fixture.
Requiere autorización de datos reales/reinicio y ausencia de otros trabajos;
no consume IA ni altera la capacidad de la usuaria. Ver límites en la guía B3.

El parámetro `--workflows` añade aceptación B4 real: revisión/aprobación, dos pasos,
parámetros, persistencia y caída durante segundo paso preservando el primero.
Requiere SQL 08 y WORKFLOW_PROTOCOL=2. Reporte en block4-remote-latest.json ignorado.
`maintenance/activate_workflow_worker.py` comprueba la RPC y cambia solo ese
protocolo en backend/.env sin mostrar credenciales ni aplicar SQL/reiniciar procesos.

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
# Verificación de resultados e historial B5

## Experiencia guiada de Miguel

`node scripts/maintenance/verify_guided_data.mjs` comprueba preferencias aisladas,
formularios tipados y orden de lectura. `maintenance/verify_taller_browser.js`
verifica el chat + taller (Inicio del modo Guiado) con Playwright CLI en un
navegador aislado abierto en Vite: plan compuesto, consentimiento, ejecución con
nodos en vivo, reintento idempotente, salida escapada, móvil 390 y creación de una
herramienta faltante. Intercepta identidad y todas las APIs de negocio; no usa
Supabase ni Gemini y no crea datos reales. Fixtures en `src/mocks/guiado.js`.
Ver alcance y evidencia real separada en [modos de uso](../docs/MODOS_USO_A.md).

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa open http://127.0.0.1:5173
npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa run-code --filename scripts/maintenance/verify_taller_browser.js
```

## Resultados e historial B5

`maintenance/verify_history_ui.py` abre Chrome temporal en escritorio y móvil,
con HTTP simulado y sin sesión de usuario. Usa `history_harness.html` y el
controlador CDP compartido `workflow_browser.mjs`. No usa Supabase.

`maintenance/verify_history_remote.py --protected-run UUID` realiza solo lecturas
de fixtures privadas con la cuenta worker configurada: paginación, detalle,
parciales y privacidad. No imprime contenido ni JWT. Reporte local ignorado en
`output/laboratory/block5-history-remote.json`. Guía en docs/BLOQUE_5_RESULTADOS.md.
# Publicación B6

`maintenance/verify_shared_database.py --publications` prueba SQL09 y los casos
de publicación entre identidades en PostgreSQL temporal. `--sandbox` añade
ejecución real en gVisor y requiere que no haya workers activos.
`maintenance/verify_publication_ui.py` usa Chrome temporal y HTTP simulado;
no publica datos reales ni usa sesiones personales.
`maintenance/activate_publications.py` solo verifica RPC remota y activa el flag
local después de aplicar SQL09; no aplica migraciones ni publica capacidades.
