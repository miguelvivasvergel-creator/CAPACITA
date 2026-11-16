# Estado del proyecto

Actualizado: 16/11/2026. Reportes anteriores en [historial](historial/README.md).

## Reanudación inmediata

Bloque visual A: estética del login extendida a navegación, inicio guiado,
herramientas, soluciones, resultados, búsqueda/comunidad y marco de perfil/ajustes.
Marca compartida e iconos SVG; se retiran emojis de vistas A y cifras decorativas
del login. Revisados 16 casos reales de lectura/navegación/tamaños/teclado, cero
escrituras y errores de página; siete grupos guiados simulados pasan de nuevo.
Backend, SQL y B sin cambios. Usuario pide visual primero; funcionalidades
pendientes se retoman después, especialmente publicación A/B y aceptación real
de creación guiada. Fahida en B6 según usuario; no equivale a bloque completado.

Modos de experiencia A implementados: Guiado inicial por cuenta y Desarrollador.
Guiado interpreta/busca y selecciona herramientas, propone, guarda sin copiar
JSON, pide datos en formularios y aprobación y muestra resultados legibles.
Ruta de herramienta faltante implementada con revisión, generación consentida,
ejemplo conocido aportado por persona, laboratorio B y habilitación explícita.
Siete grupos interceptados y helpers Node pasan. Propuesta Gemini real 200 y
run 024402c8 completed sobre workflow existente: «  Café nuevo  » → «CAFÉ NUEVO»;
dos pasos, recarga e historial móvil y 404 de segunda cuenta verificados.
Nuevo ciclo de creación guiada solo aceptado con fixtures, sin otra generación
remota. Mismos permisos; no cambios a backend/B/SQL. Detalle en MODOS_USO_A.md.
Entrega en rama miguel, sin PR ni main por preferencia vigente del usuario;
ensayo en PC Fahida/publicación entre cuentas siguen pendientes.

### Antecedentes (el estado vigente está arriba)

Pendiente UX confirmado por usuario: modo guiado donde la IA interpreta y busca
soluciones existentes/nuevas, separado del modo desarrollador. Aún NO implementado.
El flujo actual exige copiar/importar JSON y entender conceptos técnicos; por
tanto la evidencia de ejecución privada no certifica la experiencia final para
personas sin conocimientos técnicos. Requisito detallado en VISION_MAESTRA.md.
Miguel integra A; ambos modos conservan permisos y aprobación reales.

Revisión final de Miguel: entrega funcional 0b06172 ya en origin/miguel y guías
actualizadas; no nuevos cambios de producto ni pruebas B. PR draft preparado,
creación aún no verificada. A petición del usuario se abrió Opera con comparación
main...miguel, título y descripción precargados. No PR confirmado ni merge. Publicación A sigue bloqueada
por contrato/soporte B, y ensayo en PC Fahida no realizado. El cierre no
certifica toda la visión ni convierte pendientes en completados.

Prioridad vigente: entrega martes en el PC de Fahida, SOLO Miguel; extras después
si queda tiempo. Guía portátil y checklist preparados en ENTREGA_MARTES.md,
ensayo allí pendiente. Inicio/perfil conectados al historial B5 y recursos exactos;
ruta vieja de workflow conserva ID. Navbar móvil adapta columnas tras reproducir
desborde real. Navegación A sin escrituras, Perfil 6 grupos, dashboard 7 checks,
lint/build/imports y móvil 320/390/640 pasan. Backend/B/SQL sin cambios.
Publicación ejecutable aún requiere soporte
acordado con Fahida; no se eliminó de alcance ni se declara toda la entrega lista.

Privacidad de recursos nuevos aceptada también con segunda cuenta normal en
navegador: identidad B verificada distinta, cinco 404, listas completas sin
privados A, versión ausente del planner y selección forzada 409 antes de IA.
Enlaces directos a historial y workflow bloqueados sin mostrar salida/editor.
Supera el pendiente de recorrido UI anotado abajo. Sin IA ni nuevas escrituras.
Privacidad y persistencia tras reinicio API cerradas para este caso concreto;
resto de matriz B6 y publicación ejecutable entre cuentas continúan pendientes.

Privacidad técnica y reinicio API aceptados para recursos nuevos: identidad
worker autenticada distinta obtiene cinco 404 (capacidad/candidato/build/workflow/run),
listas sin recursos ajenos y versión privada ausente de selector. Solo lecturas;
no es recorrido UI con segunda cuenta normal. Reiniciada únicamente API local,
ocho huellas idénticas desde dueño y resultado B5 conservado tras recargar.
Sin nuevas ejecuciones, SQL ni publicación. Pendientes: resto B6, segundo
recorrido UI si requerido y contrato de publicación A/B.

Dos capacidades distintas aceptadas realmente en recorrido privado: reporte de
mayúsculas 5/5 y habilitación UI 201, versión 28be84c1. Planner Gemini 200 compose,
importación, guardado 201 y reapertura idéntica del workflow a1518d9e. Aprobación
201 y run f89dd4c7 completado en gVisor: «  Niño  azul  » → «Niño  azul» →
«NIÑO  AZUL». Dos pasos completed, resultado leído por API/UI. Normalización
conserva espacios interiores. Worker activo, sin SQL ni publicación entre cuentas.
Privacidad del recurso nuevo/reinicio y publicación conjunta siguen pendientes;
no certifica B6 completo. Esta nota supera build queued/segunda versión pendiente.

Worker Miguel: configuración encontrada en .env raíz y sincronizadas únicamente
variables dedicadas hacia backend/.env, protocolo 2. Worker --once autenticó,
recuperó sandbox y registró build 8a2c1355 passed, exit 0. No hubo encolado nuevo
ni SQL. Falta releer reporte desde la cuenta dueña y habilitar explícitamente;
la capacidad de mayúsculas aún no se declara ejecutable. Worker normal activo
después del diagnóstico, mensaje de listo confirmado. No se registran secretos.

Integración B5 local desde Fahida e4b286f: Mis ejecuciones con lista/detalle,
progreso, parciales, copia/descarga y nueva ejecución explícita; workflows se
reabren sin aprobación anterior. Conflictos compartidos reconciliados con A.
160 pruebas backend, lint/build/imports y batería visual B5 en 1280/390 pasan.
Navegación autenticada y lecturas reales de dos runs verificadas; lista/detalle
coinciden. No equivale a aceptación completa B6. Build 8a2c1355 sigue queued
en consulta real actual. B5 no incorpora publicación ni configuración worker.
Sin SQL, encolado nuevo, push a main ni despliegue. Detalle en continuidad.

Estado vigente Miguel: B3/B4 integrados como consumidores desde A; catálogo,
definiciones, candidatos y reparación acotada, filtros, planner y actividad
privada conectados. Privacidad aceptada realmente con dos cuentas distintas.
Bloque ef8feb0 y cierre documental e4c3990 subidos a origin/miguel. Los párrafos
anteriores conservados más abajo son hitos históricos, no el estado vigente.

Avance posterior: objetivo pendiente recuperable desde Inicio y TrabajoCapacidad,
aislado por cuenta en esta pestaña hasta 48 h, descartable y limpiado al salir.
No hereda consentimientos ni versiones. Configuración se recupera de fallos de
red y diferencia solicitud/confirmación del correo. Seis grupos visuales de
retorno, cinco de Configuración con Auth simulado y pruebas Node pasan; regresiones
Inicio 8, Planner 5 y Trabajo/B3 4, lint/build correctos. Backend sin cambios,
última batería completa: 160 pruebas. Sin cambios de credenciales reales ni SQL.

Pendientes reales: build 8a2c1355 queued, segunda versión sin habilitar, ejecución
del plan de dos capacidades y publicación/reutilización entre cuentas con B.
PR preparado pero no creado; revisión cruzada y modalidad de entrega pendientes.
Detalle reproducible en [ENTREGA_MARTES.md](ENTREGA_MARTES.md), inventario actualizado
en [CIERRE_MIGUEL.md](CIERRE_MIGUEL.md). Consultar Git para entrega del avance nuevo.

## Hitos anteriores (conservar como historial)

Cierre GitHub verificado: commit principal **965e369**, 50 archivos de
Inicio/perfil/búsqueda y documentación, subido a **origin/miguel**. Hash local,
referencia de seguimiento y ls-remote coincidieron. Integra también el merge
previo B1/B2 de Fahida; no modifica B3 ni despliega la app. 104 pruebas backend,
lint/build/imports/enlaces y validaciones reales conservadas. Siguiente bloque A:
dashboard/comunidad; planner/publicación requieren contrato/evidencia de B.

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


### Integraci?n local Miguel ? 15/11/2026

A petici?n del usuario, incorporada la entrega Fahida B3/B4 hasta 0e67c8b en miguel, conservando Inicio, perfil y b?squeda A. Respaldo: respaldo/miguel-antes-fahida-20261115-b3-b4. Conflictos resueltos conservando ambos frentes; 125 pruebas backend, lint, build, auditor?a de imports y diff --check correctos. Advertencia conocida de bundle >500 kB. Sin SQL, cambios de datos, despliegue ni push. Ejecuci?n integrada B3/B4 en este equipo pendiente de verificar; evidencia remota de Fahida conservada en sus gu?as.

### Frente Miguel A4 — dashboard y comunidad, 15/11/2026

Implementado localmente: resumen propio en Inicio con capacidades, workflows y ejecuciones por estado; consultas paginadas hasta 1.000 registros por sección, parcial explícito y errores independientes. Comunidad pública con búsqueda en backend, detalle, perfil y clonación explícita; retirados rankings sin métricas integradas. No cambia servicios de motor/workflows B ni SQL. Siete comprobaciones de paginación y seis grupos visuales interceptados pasan; lint/build/imports/diff correctos (bundle >500 kB conocido). Móvil inspeccionado sin desborde. Sin prueba remota autenticada de este bloque, commit ni push. Siguiente: aceptación con sesión real y planner A; no registrar A4 completo. Detalles en DASHBOARD_COMUNIDAD_A.md.


### Recuperación del planner A — 15/11/2026

Aceptación adicional 16/11: segunda candidata encolada mediante B3 real, 202,
build 8a2c1355-d1d4-4d14-af64-663c89e556ec/Supabase. Sigue queued tras espera
acotada, no habilitada ni ejecutada. Recuperar el reporte guardado; no duplicar.
Bloque funcional ef8feb0 subido a origin/miguel tras autenticación del usuario;
ls-remote confirmó el mismo hash. Sin merge a main ni despliegue. No modifica
responsabilidades B.

Entrega Miguel 16/11: integración A con componentes B3/B4 sin editar archivos B;
App ya no monta el cliente heredado con mocks. Definición guardada abre el trabajo
de implementación; pieza faltante conserva objetivo y renueva consentimiento.
Reparación explícita implementada/aceptada realmente con 201, candidato nuevo
5ef7a607 persistido y anterior intacto. Semántica local en planner, filtros servidor
y actividad/workflows propios en perfil, aceptados con sesión real. Privacidad con
segunda identidad verificada: selección ajena 409, seis lecturas 404, listas sin
recursos A y perfil ajeno sin consultas privadas. 160 pruebas backend y batería
visual pasan; detalle en ENTREGA_MARTES.md. Mayúsculas: segunda definición/candidato
c7e2ed9f/ba6d86d4 preparados, NO probados/habilitados. Publicación/ejecución conjunta
de dos capacidades y worker dependen del cierre B. Sin SQL, despliegue ni cambios B.

Auditoría 16/11/2026: pendientes completos de Miguel en CIERRE_MIGUEL.md (A1–A5,
quince bloques con aceptación y dependencias). Inspección documental/estática;
no se implementaron las tareas inventariadas ni se repitieron pruebas remotas.
Commit funcional local 8f879ab confirmado. Principales faltantes: publicación y
reutilización por otra cuenta, enlace catálogo/ejecución, recorrido de piezas
faltantes/reparación y aceptación integrada. Hay ruta de ejecución heredada con
fallback a mocks que debe coordinarse con B antes de considerarla entregable.

Avance posterior, 16/11/2026: guardado/recarga real del plan de un paso con 201
(f61664e5). Composición Gemini 200 de dos pasos reutilizando una sola versión
para título/cuerpo; validación 200, guardado 201 y reapertura idéntica (de068ede).
Ambos procesos de prueba privados conservados, sin aprobar ni ejecutar.
Contratos revisados ligados a huellas: un cambio obliga nueva búsqueda/revisión
antes de enviar a IA. Propuestas nuevas con posiciones separadas por dependencia.
145 pruebas backend, veinte del planner; privacidad HTTP con dos identidades
simulada, cinco grupos visuales y siete checks dashboard. Guía PLANNER_A.md.
Solo una versión habilitada real; no hay sesión B ni credenciales worker locales:
privacidad remota, dos capacidades distintas y ejecución de planes pendientes.

Aceptación real posterior: sesión Supabase verificada; dashboard con tres
capacidades, un workflow y dos ejecuciones completadas sin truncado. Búsqueda
planner 200 y una propuesta Gemini real 200/reuse de un paso, contratos validados.
Importada al constructor B con /workflows/validate 200, valid=true y orden
normalizar_texto. Queda en editor sin guardar/aprobar/ejecutar. Capturas locales
en output/playwright/planner-real-{proposal,import}.png. Segunda cuenta,
composición de dos pasos y persistencia de propuesta siguen pendientes.

Recuperado el avance local de Inicio → Planificar un proceso. Busca versiones
habilitadas del catálogo autorizado sin IA; exige selección y consentimiento
para enviar objetivo, nombres, descripciones y contratos a Gemini. Valida con
el contrato B y comprueba disponibilidad después de inferencia. No guarda,
aprueba ni ejecuta. Transferencia manual: copiar JSON e importar en Workflows.
Búsqueda textual limitada a veinte capacidades y doscientas versiones; recorte
explícito.

Pasan 136 pruebas backend, incluidas once del planner; lint, build, imports,
diff --check y siete comprobaciones del dashboard. Cinco grupos Playwright
interceptados pasan: consentimiento, propuesta/conexiones, aclaraciones, errores
y móvil de 390 px sin desborde. Sin IA ni escrituras reales en estas pruebas.
Vite reiniciado en http://127.0.0.1:5173. Bundle >500 kB conocido.
Pendientes: aceptación autenticada de dashboard/planner, Gemini real,
privacidad entre cuentas e importación/guardado real con contrato B.
Sin SQL, cambios remotos, commit ni push durante recuperación.
