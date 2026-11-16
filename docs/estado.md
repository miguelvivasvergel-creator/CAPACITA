# Estado del proyecto

Actualizado: 14/11/2026. Estado actual; reportes anteriores completos en [historial](historial/README.md).

## Reanudación inmediata

Cierre solicitado con commit/push detallado. Nuevo flujo de objetivos: API y formulario implementados; busca antes de IA, aclara/bloquea/propone y carga formulario sin autoguardado. 62 pruebas locales, lint/build y roundtrip correctos. Prueba real de interpretación Gemini con ejemplo público devuelve define y contratos consistentes; falta recorrido autenticado completo en navegador. No afirmar planner/workflows implementados.

Usuario confirma candidato 452d1c47 recuperado después de recargar, con el mismo código Gemini y SHA-256 07cef1a8d62fafdeb4f2cb57bfda7e208a7ebb150b81f6f874de1477d032e301, en borrador/pruebas pendientes. Generación, guardado y relectura reales confirmados por usuario; faltan privacidad con segunda cuenta y pruebas aisladas B. No registrar código generado como implementación habilitada.

Usuario confirma guardado/recarga/detalle de definición y candidato real. SQL 06 aplicado, lectura/insertar=true y editar/borrar=false. Corregido esDuenio ausente en detalle de Mis capacidades. No se ejecutó código generado.

## Miguel — Persona A

| Bloque | Estado | Evidencia y pendientes |
| --- | --- | --- |
| Identidad | Implementada; login real confirmado por usuario. | Auth + profiles, sin identidad demo. Otros recorridos pendientes. |
| Catálogo | Lectura real confirmada. | PostgREST, RLS/visible_to, paginación. |
| Clonación | Confirmada con API actual. | Privado/draft, propietario y origen reales. Comparar contratos remotos no vacíos. |
| Privacidad de listas | Confirmada por usuario con dos cuentas. | Acceso directo ajeno real pendiente; 404 cubierto en simulación. |
| Permisos | 03/04/05/06 aplicados según usuario. | Lectura e INSERT privado de candidatos confirmados por tabla de permisos; no UPDATE/DELETE. Matriz RLS real pendiente. |
| Definición estructurada | Confirmada por usuario contra Supabase real. | Guardado/recarga/contratos y ejemplo conservados. No ejecuta. |
| Organización | Aplicada y validada localmente. | Imports/enlaces correctos; 32 pruebas, lint/build pasan; trabajo B conservado. |
| IA/generación | Generación, guardado y recarga reales confirmados por usuario. | Candidato 452d1c47 conserva código/hash. Planner/semántica, privacidad con segunda cuenta y ejecución pendientes. |
| Interpretación de objetivos | API/formulario implementados; prueba real Gemini correcta. | Buscar, aclarar/bloquear/proponer y cargar formulario; sin autoguardado/ejecución. Total 62 pruebas; recorrido autenticado pendiente. |
| Contrato de candidato Python | Implementado; pendiente revisión B y pruebas aisladas. | AST/firma/hash, API privada y repositorio; SQL 06 aplicado según usuario. Sin ejecución ni habilitación. |
| Versiones/publicación | Pendiente. | Requiere implementación/evidencia de pruebas B. |
| Perfil/dashboard/búsqueda semántica | Integración pendiente. | Persisten consumidores .NET y mocks. |

## Fahida — Persona B

Entrega B5 autorizada, 16/11/2026: cierre técnico completado y commit detallado
para subir a feature/Fahida-backend-setup. La aceptación con Fahida y Miguel queda
en B6; no falta desarrollo B5 por ese recorrido. Sin merge a main.

16/11/2026 — B5 resultados/historial implementado: lista paginada propia, detalle,
progreso y parciales, copiar/descargar JSON, nuevos datos con confirmación e
idempotencia; workflow necesita nueva aprobación. 96 tests backend, lint/build,
Chrome de fixtures desktop/móvil y lecturas remotas privadas pasan. Sin nueva
migración ni merge con Miguel. Pendientes: aceptación de uso con Fahida y B6
integrado. Ver [guía B5](BLOQUE_5_RESULTADOS.md). No declarar planner/publicación
ni conectores completados por este avance.

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

B4, recorrido real de usuaria: workflow de dos pasos guardado, aprobado y
completado con resultado esperado, confirmado por Fahida. Falta comprobación
de reapertura tras F5 y acceso ajeno al workflow conocido en sus sesiones.

B4 activado en Supabase por usuaria (08) y comprobado por agente; worker protocolo
2, API y WEB actualizados/activos. Aceptación técnica remota con fixture privada
pasa: dos pasos con opciones, contratos/ciclo, revisión/aprobación, idempotencia,
persistencia y caída en segundo paso con parcial conservado → interrupted → nuevo
workflow completado. Historial conservado y limpieza comprobada. Sin IA ni cambio
de versión de usuaria. Falta recorrido de su sesión/privacidad workflow real.
Reporte output/laboratory/block4-remote-latest.json ignorado. Notas inferiores
de activación pendiente son históricas; no repetir SQL 08 ni abrir otro worker.

B4 en validación local, autorizado por Fahida: workflows privados, editor React
Flow, contratos/ciclos, revisiones, aprobación y pasos con progreso/errores.
SQL 08 NO aplicado a Supabase. 96 pruebas backend, lint/build y aceptación de
dos pasos con parámetro no predeterminado en PostgreSQL temporal/gVisor pasan.
Editor también pasa pruebas Chrome desktop/móvil con HTTP simulado, capturas
revisadas. Vite 8.3.8 y transitorias corregidas; npm audit 0 avisos conocidos.
Pendiente aplicar 08/configurar protocolo 2 y aceptación remota. Sin push/merge
ni B5. Worker normal compatible con B3 quedó activo en protocolo 1.

**B3 privado aceptado**: recorrido de usuaria confirmado (build compartido,
habilitación, datos nuevos, resultado tras F5, lectura propia y 404 ajeno).
Aceptación automática real con fixture privada worker también pasa: persistencia
tras reinicio de API temporal, idempotencia, conflictos/contratos, caída forzada
durante run, reserva vencida, interrupted, limpieza y nueva ejecución; versión
fixture deshabilitada rechaza nuevas ejecuciones sin borrar historial. Reporte
local ignorado `block3-remote-latest.json` con `passed=true`. Worker normal activo.
No IA, publicación ni alteración de versión de usuaria. B4 pendiente, sin iniciar.
Las notas siguientes de aceptación pendiente conservan el historial del bloque.

Aceptación B3 en curso: usuaria confirma en navegador prueba compartida en
Supabase superada, habilitación privada y run completado con datos nuevos y
resultado correcto. Pendientes persistencia tras recarga/reinicio, privacidad
entre cuentas y recuperación del nuevo worker. Sin UUID/hash registrados aquí.

Actualización posterior: Fahida confirma SQL 07 aplicado en Supabase («Success.
No rows returned»), cuenta worker creada y autorizada. No repetir SQL/INSERT.
Credenciales configuradas sin exponer valores; worker nuevo iniciado realmente
con sandbox recuperado. Pendiente reiniciar API y probar
el recorrido autenticado real; las notas inferiores de SQL no aplicado son históricas.

15/11/2026, instrucción posterior: B3 autorizado tras acuerdo con Miguel sobre
Supabase compartido y versiones privadas. Implementación local validada:
RPC/cola compartida, habilitación explícita y runs persistentes con worker gVisor,
sin service_role. SQL 07 preparado, NO aplicado a Supabase. 87 pruebas backend
pasan, lint/build pasan; migraciones y controles comprobados en PostgreSQL temporal,
no en el proyecto real. Tras detener Fahida el worker B2, pasó el recorrido de
fixture real en gVisor: prueba, habilitación y ejecución con datos nuevos, salida
persistida/privada y limpieza comprobada. Activación remota/cuenta worker y
aceptación con dos sesiones pendientes. [Guía B3](BLOQUE_3_EJECUCION.md).
Esta autorización sustituye las notas anteriores de B3 detenido.

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

- Bloque Gemini/candidatos: 52 pruebas locales pasan (proveedores simulados para HTTP); lint/build, diff --check y auditorías imports/enlaces correctos. Gemini real: metadatos 200 y una generación pública válida, SHA-256 234e21f55ddf5f77ae740e9a042041fb9f1ecfdb53fe7ec1d2f87e7cbc5b54c4. Sin ejecución/persistencia de ese ejemplo. SQL 06 preparado sin aplicación ni validación remota; prueba de interfaz y RLS de candidatos pendiente.

- Antes de reorganizar: 32 pruebas HTTP simuladas pasan; lint/build pasan; Playwright con respuestas interceptadas cubre formulario, guardado simulado, errores, edición y móvil. No certifica persistencia remota del nuevo formulario.
- Tras reorganizar: 32 pruebas HTTP pasan; lint/build y git diff --check correctos. Auditoría de imports sin rutas rotas o módulos inactivos sin clasificar; enlaces locales de 14 documentos correctos.
- API reiniciada con módulos reorganizados: health healthy/200 y ambas rutas de definición comprobadas en OpenAPI. El rechazo sin token 401/CORS se verificó en el bloque anterior y se cubre en pruebas simuladas.
- Advertencias conocidas: bundle >500 kB y deprecación Starlette/httpx.
- Build .NET de referencia bloqueado antes de limpiar: NETSDK1045, SDK 9.0.305 frente a net10.0. Sin cambiar framework ni instalar SDK.
- Sin datos/SQL remoto, generación o ejecución modificados durante la limpieza.
- Avisos SQL del editor: diagnóstico `mssql` sobre scripts PostgreSQL; comprobado manifiesto de MSSQL 1.47.0. Desactivado análisis T-SQL en .vscode/settings.json solo para este workspace, sin cambios SQL/BD ni validador PostgreSQL nuevo. Pendiente recarga de VS Code para retirar avisos anteriores.

## Git y siguiente paso

14/11/2026: usuario autorizó subir el bloque local de definición y organización a `miguel` mediante commit de organización de carpetas. Preparación de entrega con lint/build y auditorías de estructura/enlaces correctos; prueba autenticada aún pendiente. Consultar Git para confirmar commit y push de este bloque.

Rama miguel; **0ef8397** es el bloque anterior subido a origin/miguel. Definición y organización incluidas en la entrega Git autorizada; confirmar hash y remoto en Git. Sin despliegue. Credenciales/artefactos locales ignorados.

1. Generación/guardado/recarga confirmados; SQL 06 ya aplicado, no repetir. Comprobar acceso ajeno 404 con segunda cuenta.
2. Coordinar entrega del paquete a Fahida para pruebas aisladas y ejecución; continuar comprensión/planner en A.
