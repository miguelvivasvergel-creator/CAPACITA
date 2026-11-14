# Fahida — contexto y continuidad

Documento único y acumulativo del frente B. Leerlo al retomar, junto con el
contexto global y el contrato compartido. Conservar aquí cada bloque, su evidencia,
bloqueos y siguiente paso; no crear una continuidad nueva por sesión.

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
| 1. Base y sandbox | En curso; controles iniciales comprobados | Ubuntu/Engine/runsc instalados; transformación y controles básicos pasan. Faltan pruebas de excesos de recursos y timeout. |
| 2. Laboratorio y reportes | Pendiente | Consume candidato y sandbox del bloque 1. |
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
