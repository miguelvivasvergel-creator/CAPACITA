# Fahida — contexto y continuidad

Documento único y acumulativo del frente B. Leerlo al retomar, junto con el
contexto global y el contrato compartido. Conservar aquí cada bloque, su evidencia,
bloqueos y siguiente paso; no crear una continuidad nueva por sesión.

## Punto actual para retomar

Actualización 15/11/2026: Fahida confirma terminada la aceptación manual B2.
Confirmó reportes conservados tras reiniciar; acceso ajeno autenticado 404 y
ausencia del build en la lista de la segunda cuenta (`false`). Tras revisar el
checklist, confirmó también once casos superados, fallo intencional detectado,
JSON/entrada incompatible rechazados sin build, lectura propia 200 y cierre.
Evidencia declarada por la usuaria; el agente no observó el navegador ni capturó
UUID/hashes de este recorrido inicial. Queda revisión A de evidencia local.

Recuperación B2 confirmada por Fahida el 15/11/2026: se terminó forzadamente
el proceso hijo Python del trabajador con Stop-Process -Force durante un nuevo
build. Al reiniciar el trabajador, la usuaria observó estado interrumpido y
confirmó consulta Docker sin contenedores del laboratorio, nueva prueba con otro
UUID superada y conservación de la anterior interrumpida. Evidencia reportada
por la usuaria; no observada directamente por el agente. El primer intento,
build 1ab65314-27cc-4afe-8550-2222b4637dfd, terminó sus veinte casos antes de
interrumpirse y no cuenta como evidencia de caída. No se registró el UUID del
intento interrumpido. Esta prueba verifica terminación forzada del trabajador,
no apagado de Windows/corte eléctrico ni terminación simultánea del controlador
Linux. Esos escenarios no se presentan como probados.
B3 permanece detenido hasta nueva instrucción. Esta actualización sustituye las
menciones de aceptación manual pendiente conservadas más abajo como historial.

Instrucción vigente posterior al commit 3e2d561: Fahida probará manualmente el
bloque 2 primero. Solicitó guía sin saltos para Windows/Ubuntu; se amplió
[LABORATORIO_BLOQUE_2.md](LABORATORIO_BLOQUE_2.md) con 18 secciones paso a paso.
**No iniciar el bloque 3 sin una nueva instrucción**: la pregunta sobre avanzar
en paralelo no era autorización y el usuario pidió detenerlo. No se aplicaron
cambios de código B3. La aceptación manual B2 sigue pendiente, no confirmada.

Bloque 2 implementado localmente el 14/11/2026: API privada de builds, cola/reportes
SQLite durables, trabajador separado, harness dentro de gVisor y panel de candidato.
75 pruebas backend pasan; batería real de candidatos de fixture comprobada, con
límites y limpieza. Ver el cierre al final y la [guía reproducible](LABORATORIO_BLOQUE_2.md).
Pendiente aceptación con candidato Supabase propio y segunda sesión real, revisión
A del almacenamiento local y recuperación tras apagado abrupto. No hay versiones
habilitadas, publicación ni motor persistente del bloque 3. Las secciones iniciales
conservan el diagnóstico histórico, superado por los cierres posteriores.

## Acuerdos de trabajo

- Usuario autoriza trabajar por bloques, probar y hacer un commit por bloque.
- Rama de trabajo: `feature/Fahida-backend-setup`. No publicar, desplegar,
  activar facturación ni subir a main. El commit local no implica push.
- Base local al empezar: `956701b`; rama 11 commits por delante de su referencia
  remota local. Sin cambios de usuario detectados al inicio.
- Propiedad B: laboratorio, sandbox, archivos, builds, workflows, motor,
  resultados e historial. Reutilizar Auth, catálogo, IA y contratos de Miguel.
- Configuración compartida, navegación, dependencias y migraciones: coordinar
  con Miguel conforme al [reparto](PLAN_DOS_PERSONAS_MARTES.md).
- Un commit puede entregar un avance verificable con bloqueo: no significa
  que todos los criterios del bloque estén cumplidos.

## Tablero acumulado

| Bloque | Estado | Evidencia / dependencia |
| --- | --- | --- |
| 1. Base y sandbox | Verificado localmente | Ubuntu/Engine/runsc y 10 comprobaciones reales pasan; controles de recursos, salida, timeout y limpieza. |
| 2. Laboratorio y reportes | Implementado y probado localmente; aceptación remota pendiente | API/trabajador/UI, hashes, contratos, SQLite privado y candidatos de fixture en gVisor. |
| 3. Ejecución persistente | Pendiente | Trabajador, repositorios y versiones habilitadas. |
| 4. Workflows | Pendiente | Contratos compartidos, validación y mapeo entre pasos. |
| 5. Resultados e historial | Pendiente | Runs y resultados persistentes privados. |
| 6. Integración final | Pendiente | Aprobación, composición y pruebas cruzadas; piloto condicionado a accesos. |

## Bloque 1 — 14/11/2026: base, contrato y diagnóstico

### Revisado

- Visión, continuidad y estado global; reparto A/B; contrato y guía de entrega.
- `CandidateManifest` en `backend/schemas/candidates.py` y preparación en
  `backend/services/candidate_preparation.py`: `main.run`, función síncrona
  `run(inputs, parameters) -> dict`, datos JSON y dependencias adicionales vacías.
- Revalidar definición, sintaxis y hashes antes de probar. El hash de artefacto
  incluye definición y código exactos; se excluyen ids/estado. Ni hash ni estado
  insertado por el dueño acreditan evidencia de laboratorio.
- No hay contratos implementados de builds, versiones ejecutables o workflows.
  Su revisión conjunta sigue pendiente; este diagnóstico no los congela.

### Entorno comprobado

- Docker Server 28.5.1 responde fuera del entorno restringido del agente.
- Runtimes registrados: `io.containerd.runc.v2`, `nvidia`, `runc`; no `runsc`.
- WSL enumera únicamente `docker-desktop`, activo, versión 2.
- Launcher `py` enumera Python 3.12 y Astral CPython 3.14.5. El alias `python`
  no inicia un intérprete utilizable. No existe `.venv` en este clon al iniciar.
- Los primeros intentos dentro del entorno restringido dieron acceso denegado;
  comprobar fuera permitió distinguir esa restricción del estado real del equipo.
- No se han ejecutado candidatos, iniciado contenedores ni instalado infraestructura.

### Entrega de este avance

- `scripts/maintenance/check_sandbox.ps1`: diagnóstico de solo lectura con
  salida JSON sanitizada, sin mostrar configuración Docker ni secretos.
- Ejecutar desde raíz: `powershell -NoProfile -File scripts/maintenance/check_sandbox.ps1`.
- Códigos: 0 prerrequisitos detectados; 2 falta runtime reforzado; 3 Docker
  no disponible/accesible. Incluso con código 0, el aislamiento y la autorización
  para ejecutar candidatos permanecen en false: faltan pruebas reales.

### Bloqueo y siguiente paso

No hay sandbox reforzado confirmado. Docker convencional no satisface por sí solo
la arquitectura acordada. El usuario confirmó que solo tiene este Windows y no
tiene cuenta de sandbox. No hay autorización de gastos.

Ruta autogestionada por evaluar: Linux compatible con gVisor y runtime `runsc`;
referencia oficial: https://gvisor.dev/docs/user_guide/quick_start/docker/ .
No se ha elegido proveedor ni instalado/configurado gVisor. WSL/Docker Desktop
presentes no acreditan compatibilidad con esa ruta.

Para terminar el bloque 1: seleccionar infraestructura accesible, comprobar
requisitos y ejecutar una función de referencia mantenida por B; verificar red
denegada, usuario sin privilegios, ausencia de credenciales/montajes del host,
temporal por tarea, límites de tiempo/CPU/memoria/procesos/salida y limpieza.
Guardar resultados reales aquí. Después integrar candidatos en el bloque 2.

### Validación

- Diagnóstico ejecutado fuera del entorno restringido: Docker disponible,
  servidor Linux, tres runtimes convencionales; estado
  `reinforced_runtime_missing`, `isolation_verified=false` y
  `candidate_execution_allowed=false`.
- `py -3.12 scripts/maintenance/check_docs_links.py`: correcto, 16 documentos.
- `git diff --check`: correcto antes del cierre.
- Python 3.12.9 inicia mediante `py -3.12`; la comprobación de dependencias
  detectó `jsonschema` ausente. No se instaló ni se ejecutó la suite backend.
- Los informes históricos de 62 pruebas de Miguel no son una ejecución de
  pruebas realizada en este equipo.
- Una interrupción de herramientas dejó este avance sin commit inicialmente;
  al retomar se comprobaron los archivos existentes, sin reiniciar ni sobrescribir
  trabajo. El commit de este avance se identifica por el mensaje
  `chore(sandbox): diagnosticar base y registrar continuidad de Fahida`.

## Continuación del bloque 1 — ruta local en Windows

Usuario solicita continuar y saber cómo probar cada entrega. El diagnóstico
inicial quedó en commit `d72cba3`; no cerró el bloque de aislamiento.

### Recursos comprobados

- RAM física visible: 5,8 GB; 8 procesadores lógicos; hipervisor presente.
- Disco C: 181,7 GB libres de 474,7 GB, comprobado con Win32_LogicalDisk.
  La consulta restringida Get-PSDrive devolvió cero: no usar ese dato como
  espacio real del equipo.
- WSL 2.6.1.0, kernel 6.6.87.2-1. No hay Ubuntu en el inventario inicial.

### Ruta por comprobar, no declarada funcional

1. Instalar Ubuntu 24.04 mediante WSL2, sin lanzamiento automático:
   `wsl --install --distribution Ubuntu-24.04 --no-launch`.
2. Comprobar versión, arquitectura y disponibilidad de systemd en Ubuntu.
3. Preparar Docker Engine y gVisor dentro de Ubuntu. No modificar el daemon
   interno de Docker Desktop ni asumir que su CLI apunta al nuevo Engine.
4. Comprobar compatibilidad de runsc/systrap y límites de recursos del host.
   Con esta RAM, proponer una tarea a la vez y cargas pequeñas; aún no se ha
   medido consumo ni demostrado suficiencia para ejecutar todo simultáneamente.
5. Ejecutar una función de referencia mantenida por B y comprobar aislamiento,
   límites, errores y limpieza antes de aceptar código generado.
6. Guardar aquí comandos y resultados, entregar prueba reproducible y commit.

La instalación requiere autorización del sistema porque escribe fuera del
repositorio. Su resultado se registra al terminar; solicitarla no acredita que
Ubuntu esté instalado. Puede requerir intervención local para crear usuario.

Referencias oficiales consultadas:
- https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- https://gvisor.dev/docs/user_guide/install/
- https://gvisor.dev/docs/user_guide/quick_start/docker/
- https://gvisor.dev/docs/user_guide/platforms/

La documentación de gVisor describe systrap y su integración con Docker; no
certifica por sí sola compatibilidad o aislamiento en este Windows/WSL.

### Instalación de Ubuntu verificada

- `wsl --install --distribution Ubuntu-24.04 --no-launch`: terminó con código 0.
- `wsl --list --verbose`: Ubuntu-24.04 registrado en WSL2 junto a docker-desktop.
- Inspección dentro de Ubuntu: Ubuntu 24.04.5 LTS, x86_64, kernel
  `6.6.87.2-microsoft-standard-WSL2`, PID 1 `systemd`.
- Antes de instalar infraestructura, `docker` resolvía al ejecutable compartido
  de Windows y `runsc` no existía. El código 1 de esa inspección corresponde a
  la ausencia de runsc; Ubuntu sí arrancó.
- Preparado `scripts/maintenance/setup_sandbox_wsl.sh`, que instala paquetes en
  Ubuntu 24.04 con systemd y registra el repositorio firmado oficial de gVisor.
  Usa explícitamente `/usr/bin/docker` y el socket local, sin contexto heredado
  de Docker Desktop. No ejecuta contenedores ni candidatos.
- Primera ejecución de instalación terminó con código 0: Docker Engine
  `29.1.3-0ubuntu3~24.04.2`, runsc `20261109.0` (release-20261109.0).
- El script ahora verifica el registro de runsc y, si falta, usa `runsc install`
  y reinicia solo Docker de Ubuntu; no reemplaza daemon.json manualmente.
- `smoke_sandbox_wsl.sh`: prueba de infraestructura con función de referencia
  fija mantenida por B, imagen Python resuelta a digest, runtime explícito runsc,
  sin red ni montajes del host, raíz de solo lectura, usuario 65534, temporal
  de 16 MiB, 256 MiB de memoria sin swap adicional, 0,5 CPU y límite de 64
  procesos. Tiempo máximo de 30 s y limpieza del contenedor propio al salir.
  Los flags no acreditan límites efectivos hasta comprobarlos.
- `.gitattributes` conserva LF en los scripts WSL para evitar errores tras
  un checkout de Git en Windows.

### Prueba real inicial y cómo repetirla

Docker de Ubuntu registra `runsc`; instalación y registro terminan con código 0.
La prueba de referencia produjo `{"resultado":"Árbol  azul"}` para la entrada
`"  Árbol  azul  "`. Pasaron usuario 65534, rechazo de escritura en raíz,
escritura temporal y rechazo de conexión externa a 1.1.1.1:443. No existen
/mnt/c ni socket Docker dentro del contenedor. Docker inspect confirmó
Runtime=runsc, Network=none, Memory=268435456, NanoCpus=500000000, Pids=64,
Mounts=[] (sin montajes del host).

Imagen exacta de esa prueba:
`python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b`.
El script resuelve y muestra el digest al ejecutarse; una ejecución futura puede
descargar una actualización de la etiqueta, por lo que debe conservar su digest
en la nueva evidencia. No es todavía un runtime versionado del producto.

Desde PowerShell en la raíz del repositorio:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /bin/bash /mnt/c/Users/Fahida/Desktop/CAPACITA/scripts/maintenance/smoke_sandbox_wsl.sh
```

Root es solo el usuario de administración de Ubuntu que solicita el contenedor;
la función de referencia corre como 65534 dentro de gVisor. No introducir
candidatos generados en estos scripts de instalación/comprobación.

El diagnóstico PowerShell inicial consulta Docker Desktop: puede seguir diciendo
que falta runsc porque el nuevo entorno está en el Engine separado de Ubuntu.
Para comprobar la ruta nueva usar el comando WSL anterior.

El bloque 1 sigue abierto: faltan pruebas efectivas de exceso de memoria,
CPU/procesos/salida, timeout, limpieza en fallos y concurrencia acotada. No hay
todavía runner del producto, API de builds ni habilitación de candidatos.

## Cierre de controles del bloque 1 — pruebas de infraestructura

Continuación solicitada por el usuario después de `fe18034`. El alcance de este
bloque es la base local aislada; el laboratorio, candidatos reales, reportes
persistentes y habilitación pertenecen al bloque 2, no están implementados aquí.

### Implementación de verificación

- `scripts/maintenance/verify_sandbox_wsl.py`, stdlib dentro de Ubuntu:
  orquesta únicamente fixtures fijas en contenedores gVisor. No acepta código,
  imágenes o rutas arbitrarias del usuario y no está conectado a FastAPI.
- Imagen fijada al digest de la prueba inicial; no descarga ni actualiza imágenes.
- Perfil: runtime runsc, red none, usuario 65534, raíz de solo lectura, sin
  capabilities ni nuevos privilegios, sin montajes del host, temporal tmpfs
  de 16 MiB, 256 MiB de memoria, memoria+swap total 256 MiB, 0,5 CPU,
  64 tareas del host y RLIMIT_NPROC de 8 para procesos invitados. Archivos
  individuales hasta 1 MiB y 64 descriptores abiertos configurados.
- Controlador conserva como máximo 65536 bytes agregados de stdout/stderr,
  descarta el exceso y detiene el contenedor. Docker no guarda logs de la tarea.
- Timeout de prueba por contenedor: 12 s, salvo bucle infinito a 3 s. No incluye
  creación/limpieza: esas operaciones tienen sus propios timeouts acotados.
- Limpieza por nombre UUID creado por la llamada; eliminación forzada y consulta
  posterior al daemon para comprobar ausencia. No borrar contenedores ajenos.
- Lock del host `/run/lock/capacita-sandbox.lock`: una suite/prueba a la vez;
  una segunda solicitud recibe código 75 antes de crear contenedores. El smoke
  inicial usa el mismo lock. Este control no es una cola durable del producto.
- Entorno de procesos host reducido a PATH/LANG; se prueba un canario público
  sin usar secretos reales. El contenedor no recibe las variables del host.
- Reporte local `output/sandbox/block1-latest.json`, ignorado por Git. Incluye
  fecha, versiones, digest, casos, códigos, tiempos, contadores del host y limpieza.
  La evidencia del cierre se resume en este documento acumulativo.

### Fallos encontrados y correcciones

1. La primera prueba de salida excesiva expuso bloqueo del cliente attach al
   llenarse su pipe. Se corrigió desconectando ese cliente antes de detener el
   contenedor; también se hace en la limpieza de excepciones. Se comprobó que
   no quedaron contenedores de esa verificación.
2. La prueba con muchos intérpretes Python falló por errno 12 antes de acreditar
   el límite de procesos. No se aceptó como prueba de RLIMIT_NPROC: se cambió
   a hijos pequeños con fork y se redujo el límite a 8. La pasada final permite
   siete hijos, rechaza el siguiente con EAGAIN y recoge todos los hijos.

Referencias técnicas: [modelo de recursos gVisor](https://gvisor.dev/docs/architecture_guide/resources/)
y [compatibilidad](https://gvisor.dev/docs/user_guide/compatibility/). Los procesos
del invitado no equivalen a los del host; la evidencia del límite de procesos
debe venir de un intento real, además de los flags de Docker.

### Cómo repetir las pruebas

Desde PowerShell en la raíz:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/python3 /mnt/c/Users/Fahida/Desktop/CAPACITA/scripts/maintenance/verify_sandbox_wsl.py
$LASTEXITCODE
```

Esperado para aceptar el cierre: todos los casos PASS y código 0. Un código 75
significa que otra prueba ocupa el lock. Cualquier FAIL o infraestructura
inaccesible impide dar la verificación por superada. No hace falta iniciar Vite,
FastAPI, Supabase ni disponer de claves para esta prueba.

### Resultado final verificado

Batería iniciada el 14/11/2026 a las 17:35:37 UTC (12:35:37 Bogotá), terminó
con código 0 y `passed=true`. Docker Server 29.1.3, runsc release-20261109.0,
imagen fijada al digest indicado. Todas las comprobaciones pasaron:

| Caso | Evidencia observada |
| --- | --- |
| Admisión única | Segundo proceso recibe 75 antes de ejecutar trabajo. |
| Aislamiento/temporal 1 | Transformación correcta, sin canario del host, sin montajes/socket, raíz bloqueada y red externa denegada. |
| Aislamiento/temporal 2 | Nuevo entorno no conserva el archivo temporal del primero. |
| Bucle infinito | Timeout de 3 s, exit 137; 3,647 s incluyendo creación/control hasta inspección. |
| Salida excesiva | Se retienen exactamente 65536 bytes, se corta ejecución, exit 137. |
| Memoria excesiva | Exit 137 y OOMKilled=true bajo límite de 268435456 bytes. |
| CPU | Kernel host informa cpu.max=50000 100000 y nr_throttled=45 durante carga real. |
| Procesos invitados | Siete hijos más padre; siguiente fork rechazado por EAGAIN con RLIMIT_NPROC=8. |
| Error provocado | Exit 1, error identificado, limpieza confirmada. |
| Liberación de admisión | El lock permite una nueva adquisición al terminar. |

En los ocho casos con contenedores se verificó su eliminación consultando al
daemon, incluidos timeout, exceso de salida, OOM y excepción. Los límites de
archivo/descriptores están configurados; no se presentan como pruebas separadas.
La batería prueba la infraestructura con fixtures y no demuestra corrección o
seguridad universal de candidatos; el producto aún no tiene runner integrado.

Cambios de cierre: nueva batería de verificación, lock y límites alineados en
smoke, exclusión Git de reportes locales y actualización del seguimiento. Commit
identificable por `test(sandbox): verificar limites y cerrar bloque de infraestructura`.
Las verificaciones de sintaxis/enlaces y el estado final de Git se revisan antes
del commit. No hay cambios de frontend/API, BD remota ni consumo de IA.

### Siguiente paso — bloque 2

Revisar con A la interfaz de builds y persistencia; implementar revalidación del
CandidateManifest, definición y hash, harness controlado y pruebas independientes
antes de probar un candidato propio. Diseñar reportes privados con acceso ajeno
404. El laboratorio utilizará un trabajador y los controles comprobados; no
convertir este script diagnóstico en un endpoint que acepte código arbitrario.
Definir también recuperación ante caída del controlador: la batería acredita
limpieza en los errores probados, no recuperación después de apagar Windows.

## Bloque 2 — 14/11/2026: laboratorio y reportes privados

Instrucción vigente: «vamos con el bloque 2». Implementación local y prueba
reproducible entregadas; aceptación con sesión/candidato remoto aún pendiente.

### Implementado

- `backend/schemas/builds.py`, `repositories/builds.py`, `api/builds.py`:
  POST 202 con candidate_id, hash, casos e Idempotency-Key; GET detalle/lista
  propios, ajeno 404. No acepta dueño ni código desde el body de builds.
- Reusa CandidateRepository/Auth/catálogo de A. Revalida CandidateManifest,
  definición, identificadores, firma AST y hashes antes de encolar y en worker.
  No cambia el contrato de A ni consume Gemini. No admite recursos/permisos externos.
- SQLite en `output/laboratory/builds.sqlite3`, ignorado: instantáneas de tareas,
  estados y reportes privados conservados al reabrir/reiniciar. Persistencia local,
  sin RLS de PostgreSQL, firma ni garantía frente a un administrador del host.
- `services/build_worker.py`: proceso separado, lock de trabajador, claim
  atómico, queued/testing/passed/failed/interrupted, recuperación sin reintentos
  automáticos, validación de entradas y salidas fuera del código candidato.
- `services/sandbox_runner.py`: controlador stdlib dentro de Ubuntu, contenedor
  nuevo por caso válido. El harness llama run solo dentro de gVisor. No entrega
  JWT, claves, .env, montajes del host ni socket Docker al invitado.
- Mismo perfil comprobado B1: 256 MiB sin swap adicional, 0,5 CPU, 8 procesos
  invitados/64 tareas host, tmpfs 16 MiB, salida 64 KiB, uid 65534, red none,
  raíz read-only y limpieza comprobada. Tiempo máximo por caso 12 s. Imagen
  fijada al digest del bloque 1, sin pull ni fallback a runc.
- Reportes ligados a candidato/hashes, casos, motivos, tiempos, versiones,
  límites y limpieza; no contienen inputs, valores de salida ni trazas crudas.
  Los casos son expectativas del dueño, no evidencia independiente auditada.
- `LaboratorioCandidato.jsx` y servicio propio: editor JSON, encolar, consultar
  estado y reabrir reportes paginados. Mocks primero separados; nunca fallback.
  Integración mínima en router principal, api.js (Idempotency-Key) y panel de
  candidatos de A; queda para revisión A, sin atribuir revisión conjunta.

### Incidencias corregidas y entorno

- Creado `.venv` local con Python 3.12.9 y dependencias existentes de requirements;
  no se cambiaron dependencias compartidas. En el entorno restringido el launcher
  no detectaba Python y WSL daba acceso denegado; fuera sí están disponibles.
- Un error inicial de placeholders en INSERT SQLite fue detectado por tests y
  corregido antes de ejecutar candidatos; las 75 pruebas finales pasan.
- Docker Desktop había reemplazado /run/docker.sock dentro de Ubuntu: respondía
  Engine 28.5.1 sin runsc. La batería falló sin ejecutar candidatos. Se añadió
  configure_sandbox_socket_wsl.sh, con autorización de sistema, y override del
  servicio Docker **de Ubuntu** para /run/capacita-docker.sock. Engine propio
  vuelve a responder 29.1.3 y runsc release-20261109.0. No se cambió Desktop.
  Setup, smoke y batería B1 usan ahora el socket exclusivo; configuración toma
  el mismo lock del sandbox antes de reiniciar el daemon.
- El primer perfil de laboratorio tenía timeout 3 s: la fixture de memoria fue
  cortada por tiempo y no acreditó OOM. Se alineó al perfil general B1 de 12 s;
  la pasada final sí verifica fallo por memoria. No se relajó el límite de RAM.

### Verificación final

- **75 pruebas backend pasan** (62 previas + 13 nuevas): privacidad HTTP,
  autenticación, integridad, contratos/casos, idempotencia/conflictos, cuota,
  paginación, persistencia, recuperación interrupted, exclusión de trabajador,
  salida real validada y errores sanitizados. Proveedor/Supabase simulados;
  no acreditan dos cuentas remotas.
- **12 escenarios reales B2 pasan**: cinco transformaciones con acentos,
  espacios/vacíos/whitespace; seis entradas inválidas rechazadas sin ejecutar;
  aislamiento, temporal nuevo, procesos, timeout, OOM, exceso de salida,
  excepción, objeto no serializable, stdout no JSON, contrato de salida y valor
  incorrectos. En total 16 contenedores de candidatos de fixture, todos eliminados
  con ausencia comprobada. No se ejecutó el candidato remoto de Miguel.
- **10 comprobaciones B1 pasan otra vez** con el socket exclusivo, incluyendo
  CPU limitada por cgroup del host y admisión única. Regresión iniciada
  14/11/2026 18:41:09 UTC, reporte `output/sandbox/block1-latest.json` ignorado.
- Lint y build frontend correctos; Python compila, OpenAPI registra GET/POST
  /api/builds y GET /api/builds/{id}. Auditoría de imports sin rutas rotas ni
  inactivos sin clasificar; enlaces locales correctos. La deprecación de
  Starlette/httpx sigue como advertencia; no impide los tests.
- La batería pública B2 se reproduce con
  `.venv/Scripts/python.exe scripts/maintenance/verify_laboratory.py` y escribe
  `output/laboratory/block2-latest.json` ignorado. `failed` en una fixture de
  timeout/OOM/salida incorrecta es el estado esperado del build, no de la batería.
- Sin gastos, generación IA, migraciones/datos remotos, push ni despliegue.

### Cierre y siguiente paso

Guía completa de arranque, API, pruebas manuales y límites:
[LABORATORIO_BLOQUE_2.md](LABORATORIO_BLOQUE_2.md). Commit local identificable por
`feat(laboratorio): probar candidatos aislados y persistir reportes privados`.

Antes de dar la aceptación integrada por cerrada: iniciar API/Vite/trabajador,
abrir candidato privado propio desde sesión real, añadir casos propios, encolar,
reabrir reporte tras recargar y confirmar 404 con otra cuenta. No pedir claves
ni tokens por chat. No se verificó aún este recorrido en navegador.

Revisar con A el nuevo contrato de builds y cómo convertir almacenamiento local
en evidencia confiable compartida antes de habilitar versiones. La recuperación
de testing se prueba con repositorio reabierto; no se probó apagar Windows durante
un candidato. Falta prueba específica de recuperación tras caída abrupta y
política de retención. Próximo desarrollo: bloque 3, ejecución persistente sobre
versiones habilitadas; el motor heredado no queda integrado por este laboratorio.

## Guía manual ampliada — después del cierre local del bloque 2

- Usuario solicita probar primero B2 y pide explicación muy detallada, incluyendo
  cómo conviven Windows y Ubuntu. Solo se actualizaron documentos en esta entrega;
  no se arrancaron servicios ni se modificó código, configuración o datos.
- LABORATORIO_BLOQUE_2.md ahora empieza con el recorrido completo: cuatro ventanas
  PowerShell por función, comprobaciones Windows/WSL, socket/runtime/imagen,
  arranque exacto de API/Vite desde raíz, login/candidato propio, tarea en cola
  antes de encender el trabajador, ejecución y lectura de estados, once casos
  condicionados al contrato real, expectativa incorrecta, rechazo previo,
  persistencia, segunda cuenta y cierre de procesos.
- Incluye resultados esperados, qué detener ante errores, una ruta si no hay
  candidato propio y una lista para reportar OK/FALLÓ/PENDIENTE. La comprobación
  directa de privacidad usa el cliente ya autenticado sin copiar JWT; no se
  desactivan protecciones del navegador. Si no puede hacerse, queda pendiente.
- Se conserva la referencia técnica del laboratorio al final. No se registran
  pasos descritos como ejecutados ni se repiten baterías de código por editar docs.
- Validación de la guía: 23 bloques PowerShell analizados sintácticamente sin
  ejecutarlos, sin errores; tres ejemplos JSON válidos; enlaces locales de los
  17 documentos y git diff --check correctos. Esto valida documentación, no el
  recorrido manual, la configuración de servicios ni cuentas del usuario.
- Siguiente paso: acompañar a Fahida desde el número exacto donde esté probando.
  El bloque 3 permanece detenido hasta nueva autorización explícita.
