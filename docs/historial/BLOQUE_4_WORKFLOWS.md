# Bloque 4 — workflows privados

Cierre tecnico del bloque 4 de workflows privados, 15/11/2026.
Fahida autoriza commit y push a feature/Fahida-backend-setup, sin merge a main.
Su proceso real tiene UN paso; lectura propia 200, resultado correcto y datos
conservados tras reiniciar API (huellas de definicion, reporte y salida identicas).
Otra cuenta obtiene 404 en proceso y ejecucion, ambos ausentes de sus listas.
Los DOS pasos, parametros y recuperacion tras caida durante el segundo paso
se verificaron con una fixture privada real independiente. Los tres reportes
locales block4-owner-persistence.json, block4-user-privacy.json y
block4-remote-latest.json tienen passed=true; permanecen ignorados por Git.
SQL 08 aplicado y protocolo 2 activo. No repetir migraciones. Sin publicacion,
conectores externos ni B5 iniciado. Revision conjunta e integracion pendientes.
Este bloque usa la numeracion del laboratorio B vigente: workflows privados;
no declara completo el apartado B4 de conexiones del plan inicial entre personas.
Esta nota sustituye pendientes y referencias a dos pasos de usuaria anotados abajo.


Autorizado por Fahida el 15/11/2026. Implementación local sobre B3, sin merge/push
ni publicación. **SQL 08 aplicado por Fahida y comprobado con RPC real**. Protocolo
2 configurado; API, WEB y worker reiniciados. No repetir SQL 07/08 ni autorización
de la cuenta worker. Falta recorrido de usuaria en el editor con su sesión.

Aceptación técnica remota pasó con fixture privada de cuenta worker: dos pasos,
parámetros no predeterminados, revisión/aprobación, ciclo rechazado, idempotencia,
persistencia tras reiniciar API temporal, caída durante segundo paso con parcial
del primero conservado, interrupted y nuevo workflow correcto. Archivo mantiene
historial. Sin modificar versión de usuaria ni consumir IA. Reporte ignorado
`output/laboratory/block4-remote-latest.json`, passed=true. Consulta Docker vacía
al finalizar; trabajador normal volvió a quedar activo.

## Recorrido implementado

1. Abrir Workflows → Nuevo workflow.
2. Elegir versiones privadas habilitadas, añadir pasos y darles nombres.
3. Conectar campos en React Flow o mediante selectores equivalentes. Cada entrada
   recibe un campo de los datos iniciales, una salida de otro paso o un valor fijo.
4. Configurar parámetros por paso y las salidas finales. No rellenar defaults
   automáticamente en backend ni convertir tipos silenciosamente.
5. Validar y guardar proceso privado; reabrir conserva pasos, conexiones y opciones.
6. Revisar los datos concretos y pulsar Aprobar estos pasos y datos.
7. Ejecutar el workflow aprobado y consultar estados/resultados de cada paso.

Una propuesta estructurada puede importarse con el formato documentado; se valida
en API antes de cargarla al editor. No llama al planner de A ni inventa versiones.
No hay contador fijo, catálogo mock ni fallback de éxito cuando falla la API.

## Límites y contrato

- DAG de 1–12 pasos, secuencial. Versiones fijadas por UUID y hashes, nunca latest.
- Puertos nombrados de primer nivel; nombres ASCII `[A-Za-z_][A-Za-z0-9_]{0,63}`.
  Los valores de esos campos pueden ser JSON anidado según sus contratos.
- `input_schema` JSON Schema object en el subconjunto común. Una conexión exige
  campo declarado y obligatorio en origen, destino declarado y compatibilidad
  demostrable. No es un demostrador completo de inclusión de JSON Schema:
  combinaciones no demostrables se rechazan conservadoramente.
- Se rechazan ciclos, referencias inexistentes, dos valores para la misma entrada,
  campos requeridos ausentes, parámetros inválidos, versiones deshabilitadas/ajenas.
- Definición/datos hasta 64 KiB; instantánea de versiones hasta el límite conjunto
  de 350 KB; resultados intermedios acumulados hasta 32 KiB, reporte hasta 60 KiB.
- Un contenedor gVisor nuevo por paso; mismo perfil B3. El código nunca se ejecuta
  en FastAPI/worker. Solo el dueño de la ejecución ve parciales, resultado y datos.
- Revisión y hash del workflow cambian al editar. Aprobar liga revisión, definición,
  parámetros, versiones y datos concretos; vence a los 15 minutos y permite un run.
  Cambiar datos exige otra aprobación; editar/archivar invalida aprobación previa.
- Idempotencia: repetir misma clave y aprobación devuelve el mismo run; otra
  petición con esa clave o reutilizar aprobación para otro run devuelve 409.
- Si un paso falla, se conserva su error y parciales previos, y se omiten los
  posteriores. No hay reintento automático, ni se declara éxito parcial como total.
- El worker guarda progreso mediante RPC con reserva/fencing. Recuperación conserva
  outputs completados y marca paso activo interrupted y pendientes skipped.
- Cambiar/archivar plan encolado impide que empiece; una ejecución ya iniciada usa
  su instantánea. Deshabilitar una versión se verifica al reclamar y en checkpoints.
- Solo procesos privados; guardar un workflow no lo registra como capacidad
  compuesta pública en el catálogo de A ni crea conexiones OAuth/agentes guardados.
  Esas integraciones requieren el contrato conjunto del bloque final.

### Definición de referencia

```json
{
  "format_version": 1,
  "name": "Limpiar y transformar texto",
  "description": "Dos pasos privados con campos explícitos.",
  "input_schema": {
    "type": "object", "properties": {"texto": {"type": "string"}},
    "required": ["texto"], "additionalProperties": false
  },
  "nodes": [
    {
      "id": "limpiar", "label": "Limpiar", "version_id": "UUID_VERSION_HABILITADA",
      "parameters": {}, "values": {},
      "bindings": {"texto": {"source": "$input", "field": "texto"}}, "x": 300, "y": 0
    },
    {
      "id": "transformar", "label": "Transformar", "version_id": "UUID_OTRA_VERSION",
      "parameters": {}, "values": {},
      "bindings": {"texto": {"source": "limpiar", "field": "resultado"}}, "x": 600, "y": 0
    }
  ],
  "outputs": {"resultado": {"source": "transformar", "field": "resultado"}}
}
```

Los UUID de ejemplo son marcadores: elegir versiones reales del selector. No
requiere generar IA nueva si las versiones necesarias ya existen. Una misma
versión puede aparecer en varios pasos si sus contratos son compatibles.

## API implementada localmente

Envelope APIResponse, listas `{items,next_cursor}`, JWT real y ajeno/inexistente
404. Las lecturas del repositorio de workflows reaplican `visible_to` además
del filtro por dueño de las RPC. No service_role.

| Ruta | Entrada / resultado |
| --- | --- |
| GET `/api/workflows/available-versions` | Versiones propias habilitadas con contratos, sin código. Paginación. |
| POST `/api/workflows/validate` | WorkflowDefinition → valid, orden y definición normalizada. |
| POST `/api/workflows` | `{definition}` → proceso privado y revisión 1. |
| GET `/api/workflows`, GET `/api/workflows/{id}` | Lista propia paginada y detalle. |
| PUT `/api/workflows/{id}` | `{definition,expected_revision}`. Edición concurrente obsoleta 409. |
| DELETE `/api/workflows/{id}` | Archiva; conserva revisiones y ejecuciones. |
| POST `/api/workflows/{id}/approvals` | `{revision,definition_hash,inputs}` → aprobación persistida. |
| POST `/api/workflows/{id}/runs` | `{approval_id}` + Idempotency-Key → run 202. |
| GET `/api/runs/{id}` | B3 ampliado: workflow_id/revision y steps privados. |

Las funciones SQL aplican dueño, versiones habilitadas, instantánea, cuotas,
revisiones y aprobación. Las reglas DAG/tipos se verifican en API y otra vez en
worker: una llamada directa a RPC no puede ejecutar un plan inválido saltándose
esa validación. Los campos de código se obtienen solo de versiones habilitadas,
no del cuerpo de la petición de workflow.

## Activación — referencia para otro entorno

1. Revisar [08_private_workflows.sql](../../db/08_private_workflows.sql) con Miguel.
   Aplicar una sola vez en el mismo Supabase donde 07 ya está aplicado. No borrar
   ni importar SQLite. Conserva cuenta worker y versiones B3 existentes.
2. En backend/.env del host worker, agregar `WORKFLOW_PROTOCOL=2` (sin tocar claves).
3. Reiniciar worker y API. Comando del worker no cambia:

   ```powershell
   .\.venv\Scripts\python.exe backend/services/shared_worker.py
   ```

   Protocolo 1 es el valor por defecto compatible con SQL 07; después de aplicar
   08 un worker antiguo/protocolo 1 no reclama workflows. Esto evita que falle
   trabajos nuevos antes de actualizarlo. Protocolo 2 requiere SQL 08.
4. Reiniciar WEB si Vite no ha recargado sus dependencias. React Flow se carga
   solo al abrir el editor; Vite se actualizó dentro de 8.x a 8.3.8 y dependencias
   transitivas afectadas. npm audit posterior marca cero vulnerabilidades conocidas.
5. Probar desde cuenta dueña: dos pasos reales, parámetros, guardar/reabrir,
   aprobar/ejecutar, error en un paso, edición que invalida aprobación y 404 ajeno.
   Mantener cuenta worker fuera de la sesión de uso normal.

## Verificación local

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -t backend
npm.cmd run lint
npm.cmd run build
.\.venv\Scripts\python.exe scripts/maintenance/verify_shared_database.py --workflows
# Detener antes el worker cuando esté inactivo:
.\.venv\Scripts\python.exe scripts/maintenance/verify_shared_database.py --workflows --sandbox
```

96 pruebas backend pasan (87 anteriores + 9 B4). SQL 06/07/08 pasa sobre PostgreSQL
17 temporal sin red/puertos: privacidad, revisiones, aprobación obsoleta/vencida,
idempotencia, separación protocolo 1/2, parciales/interrupción y archivo sin pérdida
de historial. También pasa ejecución real de dos pasos en gVisor con acentos y
parámetro no predeterminado, y salida final persistida en la base temporal.
Contenedores temporales eliminados y ausencia comprobada. Sin IA ni datos remotos.

La comprobación visual usa `verify_workflow_ui.py`, Chrome headless y API simulada
en un perfil temporal. No usa la sesión del navegador ni Supabase real. Artefactos
ignorados en output/playwright. No sustituye aceptación con cuentas del proyecto.
Pasó en escritorio (1280) y móvil (390), con parámetros y conexiones guardados,
aprobación invalidada al cambiar datos, idempotency key, salida escapada y sin
desbordamiento horizontal. Capturas desktop/mobile generadas y revisadas. Se
ajustó el harness para permitir recursos locales del mapa y capturar viewport;
no se desactivaron comprobaciones de seguridad ni se usó una sesión real.

Aceptación remota reproducible con autorización de datos privados de prueba:
`verify_shared_remote.py --allow-test-data --workflows --exercise-recovery`.
Usa fixture estática identificada, sin IA; no usar simultáneamente con otros
trabajos. El workflow de fixture se archiva y su versión se deshabilita al
terminar; su historial permanece. No equivale a probar la cuenta de la usuaria.

Referencias: [React Flow](https://reactflow.dev/learn),
[PostgreSQL: bloqueos](https://www.postgresql.org/docs/current/explicit-locking.html).
