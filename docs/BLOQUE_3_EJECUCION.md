# Bloque 3 — ejecución privada y almacenamiento compartido

Trabajo autorizado por Fahida el 15/11/2026, después de confirmar acuerdo con
Miguel: solicitudes/resultados en Supabase, ejecución aislada en el equipo B y
habilitación explícita de código probado. Fahida confirma aplicación de SQL
07 en Supabase: «Success. No rows returned». No repetirlo. Confirmó también
cuenta worker creada, autorizada y configurada localmente. Inicio real del nuevo
worker confirmado con «Trabajador compartido listo; sandbox recuperado».
Aceptación privada B3 completada con pruebas de usuaria y verificador remoto.
No repetir el INSERT de autorización ni abrir otro worker.

Fahida confirmó API reiniciada, build compartido superado, habilitación, run
completado con datos nuevos y resultado conservado tras F5, lectura propia y 404
desde segunda cuenta. Agente verificó además con fixture privada en Supabase real
persistencia al reiniciar API temporal, idempotencia, errores, recuperación tras
terminar el worker durante run, limpieza, nuevo run y versión fixture deshabilitada.
Reporte local ignorado `output/laboratory/block3-remote-latest.json`: passed=true.
La versión de Fahida y su API no se alteraron. Worker normal quedó reiniciado.
No certifica apagado de Windows, varios hosts de worker ni publicación/workflows.

Validación local 15/11/2026: 87 pruebas backend, lint/build y SQL 06/07 en
PostgreSQL temporal pasan. Recorrido `--sandbox` completado con fixture real en
gVisor: prueba → habilitación → ejecución con datos nuevos → salida persistida
y privada. Limpieza de los dos invitados y la base temporal comprobada. No
certifica la integración Auth/PostgREST ni las cuentas del proyecto real.

## Qué cambia

- Supabase conserva solicitudes de prueba, reportes, versiones privadas y runs.
- El computador de Fahida sigue haciendo las pruebas/ejecuciones en gVisor.
- Miguel puede consultar la información autorizada desde su API, aunque el
  trabajador esté apagado. Nuevas solicitudes esperan; no se inventan resultados.
- El SQLite B2 anterior se conserva. No se importan sus reportes ni se usan como
  autoridad compartida. Para habilitar se hace una prueba nueva en Supabase.
- Una versión es una instantánea fija del candidato y sus contratos, asociada
  al build que pasó. No se modifica CandidateManifest ni el catálogo de A.
- Habilitar es explícito y privado. No publica, no garantiza corrección universal
  y no habilita conectores/permisos externos. Un candidato solo tiene una versión
  privada; deshabilitarla es irreversible en esta entrega. Para corregir el código
  se prepara un candidato nuevo, se prueba y se habilita su nueva versión.

## Preparación compartida — sin repetir SQL anteriores

1. A/B revisan [SQL 07](../db/07_shared_execution.sql) en el mismo proyecto donde
   ya está SQL 06. No ejecutar 01/02 ni volver a ejecutar 06.
2. Aplicar 07 una sola vez desde el SQL Editor autorizado. Crea un esquema
   privado y funciones RPC. Si ya existe, se detiene; no borra tablas anteriores.
3. Crear una cuenta Auth **dedicada al trabajador**, con correo confirmado y
   contraseña propia. No usar cuentas personales, service_role ni contraseña de BD.
4. Un administrador copia el UUID de esa cuenta y ejecuta, sustituyendo el texto:

   ```sql
   INSERT INTO capacita_execution.workers(user_id)
   VALUES ('UUID_REAL_DE_LA_CUENTA_TRABAJADOR');
   ```

   El UUID no es secreto. La contraseña sí: nunca compartirla por chat/Git.
   Una cuenta común no puede autorizarse sola ni emitir reportes.
5. En `backend/.env` **solo del equipo que ejecutará el trabajador**, agregar:

   ```dotenv
   LABORATORY_STORAGE=supabase
   SUPABASE_WORKER_EMAIL=
   SUPABASE_WORKER_PASSWORD=
   ```

   Completar los dos valores vacíos localmente. Conservar SUPABASE_URL y
   SUPABASE_ANON_KEY del proyecto; no añadir una clave administrativa. La API
   de Miguel solo necesita URL/clave pública, no las credenciales del trabajador.
6. API de ambos equipos: `LABORATORY_STORAGE=supabase`. Es el nuevo valor por
   defecto; si falta SQL 07, falla de forma explícita, sin volver a SQLite.
7. No subir `.env`. El trabajador inicia sesión con su cuenta, renueva su sesión
   y solo puede reclamar/terminar trabajos mediante funciones acotadas.

## Arranque en Windows

Conservar las comprobaciones de Ubuntu, socket, runsc e imagen de
[la guía B2](LABORATORIO_BLOQUE_2.md). No reinstalar ni quitar el aislamiento.

1. Esperar que termine cualquier prueba B2. En la ventana del trabajador antiguo
   pulsar Ctrl+C. No ejecutar ambos trabajadores o baterías simultáneamente.
2. Abrir tres PowerShell, cada una en `C:\Users\Fahida\Desktop\CAPACITA`.
3. En API:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
   ```

4. En WEB:

   ```powershell
   npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
   ```

5. En TRABAJADOR usar el **comando nuevo**, no build_worker.py:

   ```powershell
   .\.venv\Scripts\python.exe backend/services/shared_worker.py
   ```

   Debe mostrar «Trabajador compartido listo; sandbox recuperado». Si otra reserva
   sigue vigente, esperar hasta 60 segundos y volver a iniciar una sola copia.
   No es necesario esperar frente a cada comando: el período se aplica a reserva
   anterior no liberada. No borrar locks ni estados manualmente.

El modo anterior puede consultarse por separado configurando
`LABORATORY_STORAGE=sqlite` y reiniciando API con el trabajador B2. No sincroniza
los dos almacenes. El panel identifica «Reporte local» o «Reporte compartido»;
solo el segundo puede habilitar versiones. No cambiar el modo con tareas activas.

## Recorrido de aceptación — referencia para repetir

1. Abrir Capacita en el navegador normal e iniciar sesión como dueña de un
   candidato privado. No iniciar sesión como la cuenta del trabajador.
2. Capacidades → Mis capacidades → Ver → Revisar catálogo y cargar candidatos
   → desplegar candidato → Laboratorio privado.
3. Con el trabajador detenido, encolar una prueba nueva con casos correctos.
   Debe quedar queued y decir «Reporte compartido guardado en Supabase».
4. Iniciar shared_worker.py, actualizar hasta passed. Anotar UUID/hash. Revisar
   acentos, whitespace, entradas inválidas y expectativas según contrato real.
5. Pulsar **Permitir usar esta capacidad**. Debe guardar una versión privada
   con UUID; repetir la acción no crea otra versión para ese candidato.
6. En «Usar la capacidad con datos nuevos», cargar versiones si hace falta y
   seleccionar la habilitada. Escribir datos diferentes de los casos de prueba,
   por ejemplo `{"texto":"  Otro texto  "}`, opciones `{}`.
7. Pulsar **Ejecutar con estos datos** una vez. Actualizar: queued → running →
   completed. Debe mostrar `{"resultado":"Otro texto"}` calculado, no esperado
   de un caso. La salida se muestra como texto, nunca HTML.
8. Recargar, pulsar Cargar versiones guardadas y Cargar mis ejecuciones.
   Deben conservarse versión, UUID, estado y salida. Reiniciar API/trabajador y
   repetir lectura. No generar código ni reenviar el run para consultar resultados.
9. Desde otra cuenta autenticada: GET directo al build/run debe dar 404;
   listas propias sin reportes ajenos. Usar el cliente autenticado como en B2,
   cambiando la ruta a `/runs/UUID_DEL_RUN`. No copiar JWT ni desactivar consola.
10. Miguel usa su propia cuenta y solo ve sus propios recursos. Para comprobar
    desde su equipo la persistencia de recursos de Fahida, Fahida inicia sesión
    allí personalmente; no compartir contraseña/tokens. Compartir la base no
    concede acceso a resultados privados de otra persona.
11. Deshabilitar mediante **Impedir nuevas ejecuciones**. Un run nuevo debe
    rechazarse; los resultados anteriores siguen legibles. Una tarea que ya había
    comenzado puede terminar; las encoladas se rechazan al reclamarlas.
12. Probar terminación forzada del trabajador durante un build/run, sin cortar
    Windows: reiniciar después de vencer la reserva (hasta 60 s), comprobar estado
    interrupted, limpieza y nueva ejecución con UUID nuevo. Sin reintento automático.

Anotar OK/FALLÓ/PENDIENTE por paso, UUID/hash de datos de prueba y mensajes
sanitizados. No dar este recorrido por aprobado por existir pruebas locales.

## Contrato implementado

Todas las rutas usan APIResponse, JWT de usuario y errores `{detail}`. Listas
con `{items,next_cursor}`. Datos de ejecución solo del dueño, incluso si alguna
capacidad llegara a publicarse en otro bloque.

| Ruta | Uso |
| --- | --- |
| POST/GET `/api/builds`, GET `/api/builds/{id}` | Mismo contrato B2; repositorio compartido por defecto, sin código/dueño del body. |
| POST `/api/versions` | `{candidate_id,build_id}`: servidor verifica dueño/hash/reporte emitido por trabajador; crea/devuelve versión privada inmutable. |
| GET `/api/versions?candidate_id=...` | Versiones propias, cursor UUID y limit 1–100. |
| POST `/api/versions/{id}/disable` | Impide nuevos trabajos; no borra resultados ni reescribe artefactos. |
| POST `/api/runs` | `{version_id,inputs,parameters}` y `Idempotency-Key`; 202, sin ejecución en API. |
| GET `/api/runs/{id}` | Resultado privado persistido; ajeno/inexistente 404. |
| GET `/api/runs` | Historial propio paginado. |

Estados de run: queued, running, completed, failed, interrupted. Los de build
siguen siendo los de B2. Se fijan versión y hash en cada run. Se validan entradas
en API y otra vez en trabajador, y JSON finito/contrato de salida fuera del invitado.
Idempotencia por dueño/tipo/clave: petición igual devuelve el registro existente;
otra petición con la misma clave devuelve 409. La API puede rechazar una repetición
si ya no está habilitada la versión; el registro previo sigue en historial.

La API heredada de runs en memoria **ya no se registra** en router principal.
No hay BackgroundTasks para código generado. La pantalla Ejecutar heredada usa
el payload anterior y no es el recorrido B3: usar el panel dentro del candidato.
No están implementados workflows, archivos, cancelación ni acciones externas en
este contrato; los payloads anteriores/extra se rechazan 422, no se simulan.

## Seguridad y recuperación

- SQL 07 no otorga escritura directa a usuarios sobre reportes/versiones. El
  esquema privado no se expone a PostgREST. Funciones SECURITY DEFINER con
  search_path vacío y EXECUTE revocado a PUBLIC/anon; cada RPC verifica dueño o
  cuenta autorizada. RLS adicional para lectura propia, sin grants de tablas.
- Una cuenta del trabajador tiene autoridad para emitir evidencia. Es un
  componente de confianza: un operador que controle esa cuenta/equipo puede
  alterar sus reportes. No es certificación ni evidencia resistente al operador.
- Reserva global de 60 segundos, renovada cada 10; una sola sesión puede reclamar
  trabajos. Al perder reserva, deja de iniciar casos y no puede guardar resultados
  (fencing). La caída no provoca reintento automático ni éxito falso.
- Soportado: **un único host de ejecución designado**, Ubuntu WSL de Fahida.
  API/UI pueden estar en varios equipos. Cambiar host requiere detener el anterior
  y verificar su limpieza; no se promete recuperación de contenedores en otro host.
- Antes de recuperar estados, el worker comprueba limpieza local usando el
  controlador B2. Una caída deja la reserva hasta que vence. Si no se puede
  comprobar limpieza, el trabajador falla sin reclamar otra tarea.
- Mismos límites/imagen de B2, sin red/credenciales/montajes al invitado. No
  requiere Redis/Celery ni servicios de pago. Cuota compartida: tres pendientes
  por usuario y veinte globales, con admisión atómica.
- Entradas/salidas permanecen en Supabase hasta política de retención posterior;
  por ahora solo datos de prueba sin información sensible. No logs con valores.

## Validación reproducible

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -t backend
npm.cmd run lint
npm.cmd run build
.\.venv\Scripts\python.exe scripts/maintenance/verify_shared_database.py
```

El último comando crea un PostgreSQL 17 temporal **sin red ni puertos** en el
Docker de Ubuntu, aplica 06/07 sobre fixtures y comprueba permisos, privacidad,
idempotencia, habilitación, resultados, reserva/fencing, recuperación y paginación.
Requiere previamente la imagen fijada en el script; no la descarga solo. Elimina
y comprueba ausencia de su propio contenedor, no toca Supabase ni otros servicios.

Para comprobar además candidato de fixture → B2 real → versión → datos nuevos →
salida en PostgreSQL temporal, detener el trabajador B2 y agregar `--sandbox`.
Toma el lock B2 y falla si otro trabajador lo mantiene. Usa el mismo gVisor e
imagen fijada, sin IA ni cuentas remotas. No acredita la integración Auth/PostgREST
del proyecto real, que requiere el recorrido manual anterior.

Referencias técnicas: [funciones y permisos Supabase](https://supabase.com/docs/guides/database/functions),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[bloqueos PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html).

## Verificador remoto de aceptación

`scripts/maintenance/verify_shared_remote.py` requiere `--allow-test-data` para
crear registros reales privados con la cuenta worker configurada. No llama IA.
Usa una capacidad `[PRUEBA B3]` y código fijo de fixture; el modelo se identifica
como `fixture-b3-acceptance-no-ia`. El campo provider sigue la restricción histórica
`gemini` de SQL 06: **no acredita una generación Gemini**. La descripción y código
dejan explícito el origen de prueba; no utilizar esa fila como evidencia de IA.

Comprueba resultados/idempotencia/errores reales, reinicia una API temporal en
puerto 18003 (no la API del navegador) y deshabilita solo la versión de fixture.
`--exercise-recovery` termina el trabajador de este repositorio durante un run
fixture, espera 65 s de vencimiento de reserva y usa workers `--once` para
recuperación y nueva ejecución. Ejecutar solo sin otros trabajos activos.

Los registros privados de fixture se conservan como evidencia porque no hay
DELETE autorizado. El reporte sanitizado queda en
`output/laboratory/block3-remote-latest.json`, ignorado por Git. No muestra claves,
contraseñas, tokens ni contenido de ejecuciones ajenas. Tras la prueba hay que
iniciar de nuevo el worker normal si se quiere dejarlo atendiendo solicitudes.

El parámetro opcional `--protected-run UUID_REAL` añade comprobación 404 contra
una ejecución conocida de otra cuenta, sin leer sus datos. La lectura propia y
la prueba con otra cuenta en navegador se confirmaron además manualmente.
