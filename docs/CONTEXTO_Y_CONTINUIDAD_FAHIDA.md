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
| 1. Base y sandbox | En curso; aislamiento pendiente | Diagnóstico local y contrato inspeccionados; falta entorno reforzado y prueba real. |
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
la arquitectura acordada. Falta confirmar máquina Linux disponible o cuenta
administrada con créditos reales. No hay autorización de gastos.

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
