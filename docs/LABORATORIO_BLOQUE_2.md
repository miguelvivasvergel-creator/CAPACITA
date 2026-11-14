# Laboratorio local — bloque 2 de Fahida

Implementación local del 14/11/2026. Es un laboratorio de candidatos, no el motor
de runs del bloque 3. No habilita versiones, publica capacidades ni modifica
estados del catálogo. El seguimiento y la evidencia están en
[continuidad de Fahida](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md).

## Separación de procesos

1. FastAPI autentica con la dependencia de A y obtiene el candidato privado con
   `CandidateRepository`. La lectura del origen usa el catálogo y `visible_to`.
2. Revalida definición, AST, contratos, identificadores y ambos hashes. Rechaza
   permisos/recursos externos, dependencias extra y casos inconsistentes.
3. Guarda una instantánea del candidato y casos en SQLite local, asignando el
   dueño desde la sesión. Solo devuelve metadatos y reportes al dueño.
4. Un trabajador separado reclama la tarea atómicamente y vuelve a revalidar.
   No importa ni ejecuta el source en Windows, FastAPI o el trabajador.
5. El controlador Linux crea un contenedor gVisor nuevo por caso válido y pasa
   únicamente source, inputs y parameters por stdin. El harness mantenido por B
   invoca `run` dentro del invitado. Los casos con entrada inválida no lo invocan.
6. El trabajador comprueba JSON finito, contrato de salida y resultado esperado
   fuera del invitado. Conserva solo resultado de caso, motivo, tiempos, límites
   y entorno; descarta stdout, stderr, valores y trazas del candidato.

Los casos los aporta quien prueba (`test_origin=owner_supplied`), inicialmente a
partir de sus ejemplos. No son pruebas independientes auditadas de seguridad o
corrección universal. Los tests de B incluyen casos adicionales con resultados
conocidos. Ni el estado pasado ni un reporte local autorizan habilitación en A.

## Entorno y almacenamiento

- Windows: API y trabajador usan el mismo `.venv` y
  `output/laboratory/builds.sqlite3` (ignorado). SQLite sobre el disco local:
  no compartir ese archivo entre procesos Windows y Linux o equipos distintos.
- Ubuntu 24.04/WSL2: Engine propio con runsc. El nuevo socket exclusivo
  `/run/capacita-docker.sock` evita que la integración Docker Desktop reemplace
  `/run/docker.sock`. No se cambia el daemon de Docker Desktop.
- Imagen Python fijada al digest del bloque 1. No hay pull automático ni fallback
  a runc. El controlador registra versiones de Docker/runsc y digest.
- Red none, uid/gid 65534, raíz de solo lectura, sin capabilities ni privilegios
  nuevos, sin montajes del host/socket, tmpfs 16 MiB, memoria+swap total 256 MiB,
  CPU 0,5, 64 tareas del host, máximo 8 procesos invitados, 64 descriptores y
  archivos de hasta 1 MiB. Salida combinada limitada a 64 KiB, sin logs Docker.
- Tiempo de ejecución por caso: 12 s, igual al perfil general B1. El primer
  intento a 3 s cortó la prueba de memoria antes de OOM; no se contó como prueba
  de límite de memoria. Crear/inspeccionar/eliminar tiene timeout separado.
- Un trabajador por BD mediante lock del sistema. Una tarea de sandbox a la vez
  mediante el mismo flock del bloque 1. Máximo 3 trabajos pendientes por dueño,
  20 pendientes globales y 1–20 casos por build, hasta 64 KiB de casos.

La persistencia es real pero local, sin RLS de PostgreSQL: autorización por
propietario en la API y archivo del host fuera del sandbox. Un administrador
local puede modificarlo. No tiene firma ni almacenamiento compartido/retención
de producción. A/B deben revisar el contrato y el almacenamiento confiable antes
de usar evidencia para habilitación o desplegar en varios equipos. No se creó
ni aplicó una migración remota y no se necesita una credencial de servicio.

## Arranque y prueba manual

Desde PowerShell en la raíz del repositorio. Si el socket exclusivo todavía no
está configurado, este comando cambia el servicio Docker **de Ubuntu** y lo
reinicia; no requiere repetir la instalación ni actualizar paquetes:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /bin/bash /mnt/c/Users/Fahida/Desktop/CAPACITA/scripts/maintenance/configure_sandbox_socket_wsl.sh
```

API y Vite se inician según el [README](../README.md). Reiniciar una API anterior
para que registre `/api/builds`. En otra terminal iniciar el trabajador:

```powershell
.venv/Scripts/python.exe backend/services/build_worker.py
```

Para procesar como máximo un build y salir, agregar `--once`. Si el sandbox no
responde o está ocupado, el trabajador termina con error sin consumir la cola.

1. Iniciar sesión y abrir Capacidades → Mis capacidades → Ver una definición
   privada propia con candidato guardado.
2. En Preparar implementación Python, pulsar Revisar catálogo y cargar candidatos.
   Abrir un candidato y su Laboratorio privado. No hace falta generar otro.
3. Editar los casos JSON. Los ejemplos cargados son expectativas, no salidas ya
   calculadas. Añadir al menos un caso válido con `expected_output` y casos
   inválidos con `expect_rejection=true`, `expected_output=null`.
4. Pulsar Encolar prueba aislada y Actualizar estado. Con el trabajador detenido
   debe permanecer en cola; eso no cuenta como prueba superada.
5. Revisar cada caso y cargar reportes guardados después de recargar. Seleccionar
   un reporte permite actualizarlo. Preparar otra prueba crea una clave nueva.
6. Con otra cuenta no aparecen esos reportes y GET directo al UUID devuelve 404.
   Este paso con sesiones remotas reales sigue pendiente de comprobación manual.

Un ejemplo de casos para un contrato que acepta `texto` y parámetros vacíos:

```json
[
  {"name":"acentos","inputs":{"texto":"  Árbol  azul  "},"parameters":{},"expected_output":{"resultado":"Árbol  azul"},"expect_rejection":false},
  {"name":"falta texto","inputs":{},"parameters":{},"expected_output":null,"expect_rejection":true}
]
```

Los contratos reales del candidato mandan: adaptar este ejemplo cuando difieran.
El frontend usa únicamente `src/api.js`; el mock de laboratorio nunca sustituye
respuestas de la API.

## API implementada

Envelope habitual `APIResponse`; errores `{detail}`. Todas las rutas exigen sesión.

| Operación | Contrato |
| --- | --- |
| `POST /api/builds` | Header obligatorio `Idempotency-Key` (1–128 caracteres), body `{candidate_id, artifact_hash, cases}`; 202 con BuildResponse. No acepta source ni owner del cliente. |
| `GET /api/builds/{uuid}` | Reporte/metadatos propios; inexistente o ajeno 404. |
| `GET /api/builds` | `{items,next_cursor}`, límite 1–100, cursor UUID y filtro opcional candidate_id; solo propios. |

La clave se aplica por dueño y petición completa: repetir devuelve el mismo build;
reutilizarla con otros casos devuelve 409. El cliente conserva la clave tras una
respuesta perdida y la cambia al editar casos o preparar otra prueba.

Estados: `queued → testing → passed/failed`; una tarea testing encontrada al
reiniciar pasa a `interrupted`, sin reejecución automática. `passed` solo significa
que pasaron esos casos sobre ese hash. BuildResponse incluye id, candidate_id,
artifact_hash, fechas UTC, status, report y `implementation_enabled=false`.
No se aceptan cambios de estado/reportes desde la API ni se expone la instantánea.

## Fallos, recuperación y verificaciones

El controlador siempre intenta eliminar y comprobar ausencia del contenedor
propio, incluso con timeout, OOM, salida excesiva o error. Antes de otra invocación,
bajo el lock global, limpia contenedores que quedaron con etiqueta
`capacita.laboratory=block2` y prefijo `capacita-lab-`. No toca otros contenedores.
El arranque del trabajador comprueba esta recuperación antes de marcar testing
como interrupted. Una caída de Windows puede retrasar la limpieza hasta el
siguiente arranque; no se presenta como recuperación de apagado abrupto probada.

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend/tests -t backend
.venv/Scripts/python.exe scripts/maintenance/verify_laboratory.py
```

La segunda orden accede a WSL/Docker y ejecuta únicamente candidatos de fixture
públicos en gVisor; no usa IA, cuenta Supabase ni candidato ajeno. Debe terminar
con todos PASS y código 0. Reporte local ignorado:
`output/laboratory/block2-latest.json`. Los estados `failed` de fixtures de timeout,
OOM o salida incorrecta son el resultado esperado, no un error de la batería.

El recorrido con candidato remoto propio, sesiones reales y navegador es una
verificación distinta; no se acredita con fixtures ni con lint/build.

## Integración y propiedad

B mantiene modelos `schemas/builds.py`, repositorio local, rutas, trabajador,
controlador, panel y pruebas. La instrucción vigente de implementar bloque 2
autoriza los enlaces mínimos de integración en archivos de A: registrar router,
enviar Idempotency-Key desde `src/api.js` e insertar el panel de B en el detalle
del candidato. No cambia contratos previos de candidatos/definiciones. Se dejan
para revisión A; no se atribuye una revisión conjunta ya realizada.

Pendientes: aceptación autenticada, revisión A del almacenamiento/evidencia,
recuperación tras apagado abrupto y retención. Bloque 3: versiones habilitadas y
ejecución persistente; no conectar este laboratorio al motor heredado como atajo.
