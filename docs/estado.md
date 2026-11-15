# Estado del proyecto

Actualizado: 15/11/2026. Estado actual; reportes anteriores completos en [historial](historial/README.md).

## Reanudación inmediata

Cierre autorizado: guardar Inicio/perfil/búsqueda y documentación, commit
detallado y push a miguel. Sin tareas nuevas, despliegue ni cambios B3.
Verificación de entrega Git en curso; no registrar push como hecho antes de comprobarlo.

Búsqueda A lista: FastAPI para sugerencias/resultados y semántica local E5.
Privada A ausente para B en ambos modos y GET ajeno 404. Ranking/navegación
correctos en A. 104 pruebas backend, siete grupos visuales y seis casos E5 pasan.
Semántica hasta 200 visibles, caché local, no pgvector global. Sin SQL nuevo ni
envío de catálogo a terceros. Instalación/límites: BUSQUEDA_A.md.

Perfil A implementado localmente; usuario confirma SQL 07 aplicado, grants
true,true,true,false,false. Aceptación real de escrituras superada por Playwright:
nombre/bio/foto persisten al recargar; perfil original restaurado y foto sintética
retirada. Cuenta ajena: UPDATE cero filas, upload a carpeta ajena 403, editar id
42501. 90 pruebas backend completas y seis grupos visuales interceptados correctos.
Lectura de profiles,
PATCH propio y avatar normalizado/Storage sustituyen memoria y fallback .NET/mocks.
Antes de SQL 07, Supabase negó edición (403/42501, cero filas). SQL aplicado por
usuario; pruebas remotas propias/ajenas superadas. Véase PERFIL_A.md.

Usuario confirma Fahida en B3 y exige mantener reparto. Nuevo bloque solo A:
Inicio usa catálogo autorizado e intérprete real, sin estadísticas ni plan
ficticios. Sesión real: catálogo 200 e interpretación Gemini 200/define con
coincidencia y propuesta al formulario sin guardar. Primer intento 503 de
transporte; comprobación de metadatos y único intento adicional superado.
Privacidad de capacidad efe6b264/candidato 452d1c47: dueño 200, otra cuenta
autenticada 404; capacidad ausente del catálogo ajeno. Resto del dashboard y
permanecen pendientes; versiones/ejecución/workflows permanecen con Fahida.

Cierre solicitado con commit/push detallado. Nuevo flujo de objetivos: API y formulario implementados; busca antes de IA, aclara/bloquea/propone y carga formulario sin autoguardado. 62 pruebas locales, lint/build y roundtrip correctos. Prueba real de interpretación Gemini con ejemplo público devuelve define y contratos consistentes; falta recorrido autenticado completo en navegador. No afirmar planner/workflows implementados.

Usuario confirma candidato 452d1c47 recuperado después de recargar, con el mismo código Gemini y SHA-256 07cef1a8d62fafdeb4f2cb57bfda7e208a7ebb150b81f6f874de1477d032e301, en borrador/pruebas pendientes. Generación, guardado y relectura reales confirmados por usuario; faltan privacidad con segunda cuenta y pruebas aisladas B. No registrar código generado como implementación habilitada.

Usuario confirma guardado/recarga/detalle de definición y candidato real. SQL 06 aplicado, lectura/insertar=true y editar/borrar=false. Corregido esDuenio ausente en detalle de Mis capacidades. No se ejecutó código generado.

## Miguel — Persona A

| Bloque | Estado | Evidencia y pendientes |
| --- | --- | --- |
| Identidad | Implementada; login real confirmado por usuario. | Auth + profiles, sin identidad demo. Otros recorridos pendientes. |
| Catálogo | Lectura real confirmada. | PostgREST, RLS/visible_to, paginación. |
| Clonación | Confirmada con API actual. | Privado/draft, propietario y origen reales. Comparar contratos remotos no vacíos. |
| Privacidad catálogo/candidato | Verificada por Playwright con dos cuentas reales. | Capacidad efe6b264 y candidato 452d1c47: dueño 200, ajeno 404; catálogo ajeno no contiene la capacidad. Resto de matriz RLS pendiente. |
| Permisos | 03/04/05/06 aplicados según usuario. | Lectura e INSERT privado de candidatos confirmados por tabla de permisos; no UPDATE/DELETE. Matriz RLS real pendiente. |
| Definición estructurada | Confirmada por usuario contra Supabase real. | Guardado/recarga/contratos y ejemplo conservados. No ejecuta. |
| Organización | Aplicada y validada localmente. | Imports/enlaces correctos; 32 pruebas, lint/build pasan; trabajo B conservado. |
| IA/generación | Generación, guardado y recarga reales confirmados por usuario. | Candidato 452d1c47 conserva código/hash. Planner/semántica, privacidad con segunda cuenta y ejecución pendientes. |
| Interpretación de objetivos | Recorrido autenticado automatizado desde Inicio verificado. | Gemini 200/define, coincidencia autorizada y carga de formulario; sin autoguardado/ejecución. API mantiene 62 pruebas del bloque A previo. |
| Contrato de candidato Python | Implementado; pendiente revisión B y pruebas aisladas. | AST/firma/hash, API privada y repositorio; SQL 06 aplicado según usuario. Sin ejecución ni habilitación. |
| Versiones/publicación | Pendiente. | Requiere implementación/evidencia de pruebas B. |
| Inicio | Catálogo e interpretación reales integrados. | Filtros, paginación, estados vacíos/errores y propuesta al formulario. Sin métricas globales ficticias. |
| Perfil | Datos/edición/avatar persistentes verificados con Supabase real. | Sin .NET ni fallback. SQL 07 aplicado, RLS propia/ajena comprobada; métricas/workflows/actividad no integradas se explicitan. |
| Búsqueda global/textual | FastAPI verificado con sesiones reales. | Perfiles públicos/capacidades autorizadas, paginación, filtros y detalle, sin fallback. |
| Búsqueda semántica | Local CPU, evaluación/privacidad reales pasan. | Hasta 200 visibles, truncado explícito y caché por usuario/contenido/modelo. No índice pgvector global. |
| Resto dashboard/planner | Integración pendiente. | Dashboard/comunidad restantes; planner/publicación esperan contrato/evidencia B. |

## Fahida — Persona B

15/11/2026: aceptación manual B2 confirmada por Fahida al completar el checklist:
once casos superados, expectativa incorrecta detectada, JSON/entrada incompatible
rechazados sin build nuevo, persistencia tras reinicio, lectura propia 200,
segunda cuenta autenticada 404 y build ausente de su lista (`false`), y cierre.
Evidencia reportada por la usuaria, sin observación directa del navegador ni
registro de UUID/hash por el agente. Las menciones siguientes de aceptación
manual pendiente quedan superadas. Fahida confirmó además recuperación tras
terminar forzadamente el trabajador: estado interrumpido al reiniciar, consulta
Docker sin contenedores del laboratorio y nueva prueba superada con otro UUID,
conservando el reporte interrumpido. Confirmación manual de usuaria; no acredita
apagado de Windows/corte eléctrico ni caída simultánea del controlador Linux.
Queda revisión A. B3 permanece detenido, sin habilitación ni publicación.

Seguimiento acumulativo propio: [CONTEXTO_Y_CONTINUIDAD_FAHIDA.md](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md).
Bloque 1 de infraestructura local verificado el 14/11/2026: Ubuntu 24.04 en
WSL2, Docker Engine 29.1.3 y runsc 20261109.0 propios. Diez comprobaciones reales
pasan: admisión única, aislamiento/temporales independientes, timeout, salida
limitada a 64 KiB, OOM a 256 MiB, CPU limitada según cgroup del host, máximo de
8 procesos invitados, error y limpieza. Ocho contenedores de prueba eliminados.
Scripts de referencia y verificación bajo scripts/maintenance; reporte local
ignorado y evidencia resumida en el documento acumulativo.

Bloque 2 implementado localmente: POST/GET de builds privados, revalidación de
contratos/identificadores/hashes, cola y reportes persistentes en SQLite del host,
trabajador separado y panel dentro del candidato. Candidatos de fixture ejecutados
realmente en gVisor, sin credenciales ni ejecución en FastAPI/host. 75 pruebas
backend pasan; lint/build y auditoría de imports correctos. La batería real cubre
transformación, rechazo previo, aislamiento, temporales, procesos, timeout, OOM,
salida excesiva, errores y contratos/salidas incorrectas, con limpieza verificada.
Guía y límites en [LABORATORIO_BLOQUE_2.md](LABORATORIO_BLOQUE_2.md).

Guía manual ampliada a petición de Fahida: 18 secciones con Windows/Ubuntu,
terminales, comandos, resultados esperados y pruebas paso a paso. El recorrido
manual aún no está confirmado. Usuario pidió probar primero B2 y detener B3;
no se aplicaron cambios de código de ese bloque ni se autoriza iniciarlo por
la pregunta previa sobre trabajar en paralelo.

Corregida interferencia de Docker Desktop sobre /run/docker.sock: el Engine de
Ubuntu usa /run/capacita-docker.sock mediante override de su servicio. No se
modificó Docker Desktop ni Supabase. Pendientes: aceptación con candidato remoto
propio y dos sesiones reales, revisión A de persistencia/evidencia local y caída
abrupta. No hay habilitación/publicación ni motor de runs del bloque 3.
Guía de consumo A: [ENTREGA_A_B_CANDIDATOS.md](ENTREGA_A_B_CANDIDATOS.md).
Cada bloque deja pruebas, pendientes y commit local. Sin gastos ni publicación.

Propiedad: laboratorio, pruebas aisladas, archivos, workflows, builds, motor, resultados e historial. CrearCapacidad.jsx y FileUpload.jsx se conservan para integración; no se implementaron aquí.

Hay código heredado de runs/perfiles/adaptadores y datos en memoria; no demuestra motor persistente ni aislamiento real. Reportes anteriores de Franklin, Luis Miguel y Fahida conservados en [ESTADO_2026-11-14.md](historial/ESTADO_2026-11-14.md), sin tratarlos como aceptación actual ni reasignarlos.

Consumo de definición A en [CONTRATO_INTEGRACION.md](CONTRATO_INTEGRACION.md), pendiente revisión conjunta. Sandbox y laboratorio local probados; integración remota, habilitación y motor de ejecución pendientes según el [plan A/B](PLAN_DOS_PERSONAS_MARTES.md).

## Verificación y límites

- Búsqueda A: 104 pruebas backend, siete grupos visuales y E5 real 6/6. A:
  semántica 200 sobre siete filas; B: cuatro visibles, privada A ausente en
  texto/semántica y GET ajeno 404. Modelos/caché fuera de Git, extras opcionales.
  Sin migraciones nuevas, registros de negocio ni archivos B cambiados.

- Perfil A, 15/11/2026: 90 pruebas backend completas pasan; 15 nuevas de perfil.
  Seis grupos visuales interceptados pasan. Recorrido real nombre/bio/avatar
  200 y persistencia al recargar; restauración original y retirada de imagen
  sintética. Cuenta B distinta no edita filas A, upload ajeno 403 e id 42501.
  SQL 07 aplicado por usuario, sin repetirlo. Sin cambios de motor/workflows B.

- Inicio A, 15/11/2026: ocho grupos de comprobaciones visuales interceptadas
  pasan; prueba autenticada real de búsqueda e interpretación 200/define y
  carga de formulario sin guardar. Privacidad real capacidad/candidato
  200 propio/404 ajeno. Lint sin advertencias nuevas, build, auditoría imports
  y diff --check correctos. Capturas reales móvil/escritorio inspeccionadas.
  Sin SQL/backend/archivos B modificados; bundle >500 kB sigue como advertencia.

- 15/11/2026, equipo Miguel: instalado sandbox autorizado Ubuntu-24.04/WSL2,
  Docker 29.1.3 y runsc 20261109.0 con socket exclusivo e imagen fijada por hash.
  Diez comprobaciones reales B1 pasan; reporte local ignorado en
  `output/sandbox/block1-latest.json`. Los 12 escenarios reales B2 pasan;
  reporte ignorado `output/laboratory/block2-latest.json`. Usuario ve laboratorio
  privado y confirma prueba real `57ea2b3a-673f-4ee1-a42e-bb0a415fe866` superada:
  dos salidas correctas y entrada inválida rechazada antes de ejecutar. Relectura
  SQLite confirma persistencia, limpieza e implementation_enabled=false. Usuario
  confirma recuperación del reporte tras recargar en navegador (57ea2b3a).
  Usuario confirma expectativa incorrecta detectada en prueba
  `a50239fb-3b55-4337-917b-2e720ec38eed`: estado fallido y caso 1 con salida
  distinta de lo esperado (2.182 s). Playwright verifica dos sesiones reales
  autenticadas y distintas: GET propio 200 y listado propio 200 con build
  57ea2b3a; GET ajeno 404 «Prueba no encontrada» y listado ajeno 200 sin ese
  build (sin página siguiente). Privacidad de este reporte confirmada aquí;
  no equivale a verificar todos los endpoints. Apagado abrupto pendiente.
  API/Vite/trabajador
  operativos; API reiniciada fuera del sandbox de la
  herramienta por restricción de red a Supabase. No se inició B3.

- Bloque Gemini/candidatos: 52 pruebas locales pasan (proveedores simulados para HTTP); lint/build, diff --check y auditorías imports/enlaces correctos. Gemini real: metadatos 200 y una generación pública válida, SHA-256 234e21f55ddf5f77ae740e9a042041fb9f1ecfdb53fe7ec1d2f87e7cbc5b54c4. Sin ejecución/persistencia de ese ejemplo. SQL 06 preparado sin aplicación ni validación remota; prueba de interfaz y RLS de candidatos pendiente.

- Antes de reorganizar: 32 pruebas HTTP simuladas pasan; lint/build pasan; Playwright con respuestas interceptadas cubre formulario, guardado simulado, errores, edición y móvil. No certifica persistencia remota del nuevo formulario.
- Tras reorganizar: 32 pruebas HTTP pasan; lint/build y git diff --check correctos. Auditoría de imports sin rutas rotas o módulos inactivos sin clasificar; enlaces locales de 14 documentos correctos.
- API reiniciada con módulos reorganizados: health healthy/200 y ambas rutas de definición comprobadas en OpenAPI. El rechazo sin token 401/CORS se verificó en el bloque anterior y se cubre en pruebas simuladas.
- Advertencias conocidas: bundle >500 kB y deprecación Starlette/httpx.
- Build .NET de referencia bloqueado antes de limpiar: NETSDK1045, SDK 9.0.305 frente a net10.0. Sin cambiar framework ni instalar SDK.
- Sin datos/SQL remoto, generación o ejecución modificados durante la limpieza.
- Avisos SQL del editor: diagnóstico `mssql` sobre scripts PostgreSQL; comprobado manifiesto de MSSQL 1.47.0. Desactivado análisis T-SQL en .vscode/settings.json solo para este workspace, sin cambios SQL/BD ni validador PostgreSQL nuevo. Pendiente recarga de VS Code para retirar avisos anteriores.

## Git y siguiente paso

15/11/2026: integrada localmente en `miguel` la rama de Fahida hasta `65a5739`,
sin conflictos y conservando el avance A de `956701b`. Respaldo en
`respaldo/miguel-antes-fahida-20261115`. 75 pruebas backend con unittest pasan
(servicios externos/sandbox simulados). Lint/build correctos; sandbox local de
Miguel y recorrido integrado pendientes. No se inició B3 ni se publicó la app.

14/11/2026: usuario autorizó subir el bloque local de definición y organización a `miguel` mediante commit de organización de carpetas. Preparación de entrega con lint/build y auditorías de estructura/enlaces correctos; prueba autenticada aún pendiente. Consultar Git para confirmar commit y push de este bloque.

Rama miguel; **0ef8397** es el bloque anterior subido a origin/miguel. Definición y organización incluidas en la entrega Git autorizada; confirmar hash y remoto en Git. Sin despliegue. Credenciales/artefactos locales ignorados.

1. Generación/guardado/recarga confirmados; SQL 06 ya aplicado, no repetir. Comprobar acceso ajeno 404 con segunda cuenta.
2. Coordinar entrega del paquete a Fahida para pruebas aisladas y ejecución; continuar comprensión/planner en A.
