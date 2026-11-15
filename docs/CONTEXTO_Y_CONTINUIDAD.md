# Capacita — contexto y continuidad

Actualizado: 15/11/2026, America/Bogota. Estado actual; las sesiones anteriores se conservan en [historial](historial/README.md).

## Punto exacto para retomar

Integraci?n local Miguel, 15/11/2026: usuario solicita traer la rama de Fahida.
Se incorpora origin/feature/Fahida-backend-setup hasta 0e67c8b sobre miguel
(06f9ecc), conservando Inicio, perfil y b?squeda A. Respaldo:
respaldo/miguel-antes-fahida-20261115-b3-b4. Conflictos de router, inventarios y
documentaci?n resueltos conservando ambos frentes. Las notas hist?ricas de B3/B4
pendientes quedan superadas por la entrega B; su aceptaci?n remota es evidencia
registrada por Fahida, no una prueba repetida en este equipo. 125 pruebas backend
pasan desde backend; auditor?a de imports, lint, build y diff --check correctos.
Dependencia @xyflow/react instalada; advertencia conocida de bundle >500 kB.
No se aplicaron SQL,
no se cambiaron datos ni configuraci?n de workers y no se despleg? ni hizo push.
Hay dos scripts con prefijo 07 (perfil A y ejecuci?n B): son distintos, conservar
ambos y no repetirlos por numeraci?n. Siguiente: verificar configuraci?n local y
recorrido integrado B3/B4 antes de dar por validada su ejecuci?n aqu?.

Cierre entregado, 15/11/2026: commit principal **965e369**
(`feat(modulo-a): integrar inicio, perfil persistente y busqueda autorizada`),
subido a **origin/miguel**. HEAD/origin/miguel y consulta directa ls-remote a
GitHub coincidieron en 965e369c5c2982addf934fcfa5498f8fcfd1523d antes de esta
nota documental. Incluye la integración B1/B2 de Fahida ya probada (merge 7ad07e0),
Inicio real, perfil persistente/SQL 07 aplicado y búsqueda textual/semántica local.
50 archivos revisados sin claves reconocibles ni artefactos; modelos, cachés,
sesiones y resultados locales excluidos. 104 pruebas backend, lint/build/imports,
20 documentos con enlaces válidos y pruebas de navegador/modelo correctas.
Sin despliegue ni implementación B3. Al retomar: dashboard/comunidad A y contrato
planner con B; no repetir SQL 07 ni instalaciones ya verificadas en este equipo.

Búsqueda A, 15/11/2026, implementada y validada: autocompletado/Buscar usan
POST /api/search de FastAPI con sesión, perfiles/capacidades paginados, filtros,
detalle/perfil correctos y texto/significado local. .NET conservado e inactivo.
E5 CPU opcional, 384 dimensiones, unos 136 MB por revisión/hash; sin enviar
catálogo/consultas a terceros, Gemini ni SQL nuevo. Instalado aquí; otro equipo
usa requirements-search.txt y setup_search_model.py si desea semántica.

Límite semántico: primeras 200 autorizadas, caché local por usuario/contenido/
modelo; no índice pgvector global. Truncado explícito, permisos revalidados tras
inferencia y cursores ligados al contexto. Una inferencia por proceso, 429 a
otra simultánea; cancelar navegador no para trabajo nativo inmediatamente.
Recarga duplicada de prueba solapó consultas; se corrigió la secuencia de prueba.

104 pruebas backend (14 nuevas), siete grupos visuales y E5 real 6/6 pasan.
A: semántica 200, siete filas sin truncar, Quitar fondo primero; sugerencias
abren capacidad propia/perfil y móvil correcto. B: privada A ausente en texto/
semántica, cuatro autorizadas, perfil público encontrado y GET ajeno 404.
Modelos/caché/reportes output/search ignorados por Git. Lint/build/imports pasan,
bundle >500 kB conocido. BUSQUEDA_A.md conserva instalación/límites. Siguiente A:
dashboard/comunidad y entrega Git; planner/publicación dependen de contrato B.
Extras semánticos requieren Python >=3.12 (NumPy); texto no los necesita.
Git: entrega funcional 965e369 verificada en origin/miguel; esta nota registra
la evidencia del push y el siguiente punto de trabajo. Sin despliegue.

Perfil A, 15/11/2026, bloque implementado y validado: backend conectado
a profiles real, PATCH propio persistente, foto PNG/JPG normalizada con Pillow
13.0.0/Storage, perfil sin .NET ni fallback; capacidades públicas paginadas y
métricas no integradas como —. No toca archivos de B. Causa verificada del fallo
anterior: writes solo en memoria y Supabase devuelve 403/42501 a prueba de cero
filas en columnas de perfil; no había permisos efectivos de edición.
Usuario confirma SQL 07 aplicado: true,true,true,false,false. No repetirlo.
No hay conexión administrativa disponible; lo ejecutó el usuario en SQL Editor.
Aceptación real completada por Playwright: PATCH nombre/bio 200, persisten tras
recargar; avatar normalizado guardado y recuperado tras recargar, imagen pública
HTTP 200. Perfil original restaurado y foto sintética retirada. Segunda cuenta
autenticada distinta: UPDATE al perfil ajeno afecta cero filas; subir avatar a
su carpeta devuelve 403 por RLS y cambiar id devuelve 42501. Lectura pública por
username corregida tras prueba real: PostgREST interpreta comillas añadidas como
parte del valor; se usan parámetros literales codificados y verificación de fila.
Prueba de regresión añadida. 90 pruebas backend completas pasan, seis grupos
visuales interceptados pasan, lint/build/imports/diff --check correctos (bundle
>500 kB y deprecación Starlette/httpx conocidas). API con código actual.
Referencia: PERFIL_A.md. Siguiente A: búsqueda/dashboard restante y planner
cuando B entregue contrato. No implementar motor/workflows/versiones de Fahida.

Frente A, 15/11/2026: usuario solicita avanzar autónomamente con mínima
intervención y confirma que Fahida trabaja en B3. Mantener tareas separadas:
no implementar versiones, motor, workflows ni habilitación de B en esta rama.
Se retiró la propuesta inicial de avanzar en habilitación antes de cambiar código.

Inicio A conectado a catálogo autorizado e interpretación real de objetivos.
Se retiraron del recorrido los contadores/personas/capacidades/workflows de mock
y el plan fijo. Búsqueda textual, filtro propio/comunidad, paginación, detalle,
clonación explícita y propuesta al formulario sin autoguardado. Reutiliza
InterpretarObjetivo/DefinirCapacidad; no es planner de workflows. Encabezado A
adaptado para móvil al reproducir desborde del buscador de ancho fijo. Detalle
sin callback de ejecución muestra botón deshabilitado «Ejecución pendiente».

Verificación real automatizada con sesión: catálogo HTTP 200, Gemini HTTP 200
con decisión define, una coincidencia autorizada y propuesta cargada en formulario;
sin guardar registros. Primer intento tuvo fallo de transporte 503 correctamente
mostrado; metadatos 200 y un único intento adicional superado. Sin bucle de reintentos.
Privacidad real A completada sobre capacidad efe6b264 y candidato 452d1c47:
dueño GET 200/200, segunda cuenta autenticada GET 404/404 y catálogo sin esa
capacidad privada (sin página siguiente). No extiende evidencia a todos los datos.
Siguiente A: perfil/dashboard restantes y búsqueda; planner espera contrato de B.
Validación visual interceptada reproducible en scripts/maintenance/verify_home_browser.js;
ocho grupos de comprobaciones pasan, sin IA ni escrituras reales. Lint sin
advertencias nuevas, build y auditoría de imports correctos; diff --check pasa.
Capturas reales escritorio/móvil inspeccionadas, sin desborde. Advertencia
conocida de bundle >500 kB. No hubo cambios de backend, SQL ni archivos de B.

Prueba integrada en equipo Miguel, 15/11/2026: usuario autorizó preparar sandbox
local. Instalado Ubuntu-24.04/WSL2, Docker Engine 29.1.3 y runsc 20261109.0
mediante scripts B; socket exclusivo `/run/capacita-docker.sock` e imagen Python
fijada al digest del laboratorio. Las diez comprobaciones reales B1 pasan
(aislamiento, temporales, timeout, salida, memoria, CPU, procesos y limpieza).
Reporte local ignorado: `output/sandbox/block1-latest.json`. Batería B2 completa:
12 escenarios reales pasan, incluidos errores esperados y limpieza; reporte
`output/laboratory/block2-latest.json` ignorado. Usuario confirma ver Laboratorio
privado; trabajador iniciado y prueba real
`57ea2b3a-673f-4ee1-a42e-bb0a415fe866` superada. Usuario confirma en interfaz dos
salidas correctas y entrada sin texto rechazada antes de ejecutar. Relectura
independiente de SQLite confirma estado passed, limpieza en ambos casos ejecutados
y `implementation_enabled=false`; no habilita/publica. Usuario confirma recuperación
tras recargar mediante listado: «Casos superados · 11/15/2026, 9:13:12 AM · 57ea2b3a».
API y Vite responden en 8000/5173; rutas builds presentes y
401 sin sesión. Supabase falló por transporte dentro del sandbox de la herramienta;
fuera respondió 401 sin credenciales, por lo que API se reinició con red autorizada.
Usuario confirma prueba negativa `a50239fb-3b55-4337-917b-2e720ec38eed`:
expectativa incorrecta produce «Prueba fallida», caso 1 con salida distinta de
lo esperado/contrato incorrecto (2.182 s). Detección de resultado incorrecto
confirmada en interfaz. Privacidad del reporte verificada con segunda cuenta.
Comprobación automatizada Playwright completada: dos sesiones autenticadas
validadas por Supabase y distintas (comparación de huellas, sin guardar tokens).
Sesión propietaria recupera
GET del build 57ea2b3a con HTTP 200, status passed e implementation_enabled=false;
lista propia HTTP 200 contiene ese build y no tiene página siguiente. Segunda
cuenta: GET del mismo build devuelve HTTP 404 «Prueba no encontrada»; lista
HTTP 200 no contiene el build y no tiene página siguiente. Verificación real
local del reporte 57ea2b3a, sin atribuir cobertura a todos los datos/endpoints.
Siguiente: revisión de evidencia/contrato A-B y decidir siguiente bloque según
instrucción del usuario; B3 no iniciado. Prueba de apagado abrupto aún pendiente.
No se inició B3. Servicios API/Vite/trabajador dejados en ejecución para continuar.

Integración Miguel, 15/11/2026: a petición del usuario se incorporó
`origin/feature/Fahida-backend-setup` hasta `65a5739` en `miguel`, conservando
el avance A de `956701b` y su punto de reanudación descrito debajo. Respaldo:
`respaldo/miguel-antes-fahida-20261115`. Merge sin conflictos. Las 75 pruebas
backend con unittest pasan (servicios externos/sandbox simulados). Lint y build
frontend correctos (advertencia de tamaño de bundle). Esta integración no
configura ni certifica gVisor/WSL en el equipo de Miguel, no inicia B3 ni
habilita candidatos. Siguiente: verificar entorno local y recorrido integrado
del laboratorio; siguen pendientes las pruebas autenticadas del frente A.
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


Actualizado: 14/11/2026, America/Bogota. Estado actual; las sesiones anteriores se conservan en [historial](historial/README.md).

## Punto exacto para retomar

B4: Fahida aplicó SQL 08; comprobado en Supabase, worker protocolo 2 configurado
y activo, API/WEB reales reiniciadas. Aceptación técnica remota pasa con fixture
privada: dos pasos, opciones, aprobación/revisión, persistencia e interrupción en
segundo paso conservando el primer resultado, recuperación y nuevo workflow.
Reporte B4 local ignorado passed=true. Siguiente: F5 y recorrido de usuaria desde
Workflows, más privacidad de workflow conocido entre cuentas. No repetir SQL.

B4 autorizado por Fahida: workflows privados implementados localmente, SQL 08
preparado/no aplicado. 96 pruebas y dos pasos reales con gVisor/PostgreSQL temporal
pasan; aceptación remota pendiente. Worker B3 compatible activo. Ver
[guía B4](BLOQUE_4_WORKFLOWS.md) y continuidad B. No hay push ni merge nuevo.

**Cierre B3 privado**: usuaria confirmó recorrido real y F5/lectura propia/404 con
otra cuenta. Agente completó aceptación contra Supabase real con fixture privada
de cuenta worker: API temporal reiniciada conserva resultados, idempotencia,
validaciones, worker terminado durante ejecución → reserva vencida → interrupted
y limpieza → nuevo run correcto; versión fixture deshabilitada rechaza 409 y
conserva historial. `passed=true` en reporte local ignorado. Worker normal activo.
No se alteró la versión de la usuaria, no se consumió IA ni se publicó nada.
Commit de cierre B3 local, push/revisión conjunta pendientes; B4 no iniciado. Esta actualización
supera los pendientes de aceptación anotados abajo; detalle en continuidad B.

Actualización posterior B3: Fahida confirmó aplicación de SQL 07 en Supabase con
«Success. No rows returned» y cuenta Auth dedicada del trabajador creada/autorizada.
No repetir migración ni INSERT. Configuración local comprobada sin mostrar valores;
worker nuevo arrancado y sandbox recuperado. Siguiente: reiniciar API y aceptación
manual B3; no abrir otra copia del worker. Esta
confirmación supera las notas de SQL 07 no aplicado conservadas debajo.

15/11/2026 — B3 autorizado por Fahida tras acuerdo con Miguel: solicitudes y
resultados compartidos en Supabase, worker aislado local y versiones privadas
habilitadas explícitamente. Implementación local validada con PostgreSQL temporal
y ejecución real de fixture en gVisor; SQL 07 preparado
pero NO aplicado al proyecto remoto. B3 ya no está detenido: las notas anteriores
de pausa quedan superadas por esta instrucción. Estado, límites y siguiente paso
en [continuidad B](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md) y
[guía B3](BLOQUE_3_EJECUCION.md). Siguiente: aplicar 07 y autorizar cuenta worker,
después aceptación remota con dos cuentas. No declarar aceptación integrada todavía.

Actualización B, 15/11/2026: Fahida confirma completado el checklist manual del
laboratorio B2, incluidos once casos, fallos/rechazos esperados, reportes tras
reinicio, lectura propia 200, acceso ajeno autenticado 404 y lista ajena sin el
build (`false`). Confirmación de usuaria, sin observación directa del navegador
ni UUID/hash registrados por el agente. Sustituye el pendiente de aceptación
manual B2 indicado debajo. También confirma recuperación tras terminación
forzada del trabajador: estado interrumpido al reiniciar, consulta Docker vacía
y nueva prueba superada conservando el reporte interrumpido. No acredita corte
eléctrico/apagado de Windows ni caída simultánea del controlador Linux. Queda
revisión A de evidencia local. B3 continúa detenido. Detalle en continuidad B.

Actualización del frente B (Fahida, 14/11/2026): bloques 1 y 2 con infraestructura
y laboratorio local implementados/probados. API de builds privada, trabajador
separado, SQLite durable y panel de candidatos; revalida hashes/contratos y ejecuta
fixtures reales dentro de gVisor. 75 pruebas backend pasan. Socket exclusivo del
Engine Ubuntu evita interferencia de Desktop. Ver [continuidad propia de Fahida](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md)
y [guía del laboratorio](LABORATORIO_BLOQUE_2.md). Falta aceptación con candidato
Supabase propio/dos sesiones reales, revisión A de evidencia local y apagado abrupto.
No hay habilitación/publicación ni motor persistente B3. Las notas históricas
siguientes sobre ausencia de sandbox/laboratorio quedan superadas para el entorno
local; no alteran el punto de reanudación del frente A descrito abajo.

Instrucción posterior de Fahida: probar manualmente B2 primero; B3 detenido,
sin cambios de código aplicados y sin autorización para arrancarlo por la
pregunta previa sobre trabajo en paralelo. Guía B2 ampliada con pasos detallados
Windows/Ubuntu, comandos y resultados esperados; aceptación manual aún pendiente.

Cierre solicitado por usuario: terminar este último bloque, commit detallado y push a miguel; luego continuar otro día. Nuevo flujo local en Capacidades → Crear: objetivo natural → búsqueda textual autorizada → aclaraciones/bloqueo/propuesta → cargar formulario → comprobar/guardar explícitamente. POST /api/objectives/interpret. No es planner de workflows ni ejecución. Validación: 62 pruebas, lint/build y roundtrip propuesta/formulario correctos. Gemini real devolvió define con contratos/ejemplo consistentes (hash 0af15b07bc660cdc43f1cbc2f7b4fe8e26ed8754e9fb0c76292acdd5c7cb1cab). Falta recorrido autenticado de objetivos en navegador y privacidad real con segunda cuenta. No empezar otro módulo durante el cierre.

Bloqueo confirmado por usuario: Fahida todavía no tiene sandbox. No probar código generado en host/API como sustituto. Guía preparada en ENTREGA_A_B_CANDIDATOS.md: contrato, casos independientes y evidencia por verificar; no implementa infraestructura ni envía mensajes a Fahida. Mantener propiedad B. A puede continuar privacidad real y comprensión/planner. Ejecución, habilitación y recorrido completo del martes siguen en riesgo hasta integrar aislamiento real.

Evidencia más reciente: usuario confirma recuperación después de recargar del candidato Python privado generado con Gemini (id abreviado 452d1c47, SHA-256 07cef1a8d62fafdeb4f2cb57bfda7e208a7ebb150b81f6f874de1477d032e301), mismo código/hash y status borrador/pruebas pendientes. Código visible valida inputs dict, parameters vacío y campo texto string; devuelve resultado=texto.strip(). Generación, guardado y relectura contra Supabase real confirmados por usuario. No confirma corrección funcional/aislamiento. Siguiente: privacidad con segunda cuenta y entrega a sandbox/laboratorio B, sin ejecutar código dentro de FastAPI ni en el host.

Usuario aplicó SQL 06 y reportó lectura=true, insertar=true, editar=false, borrar=false. No repetir migración. Corregido esDuenio ausente en detalle: Mis capacidades pasa propiedad del listado y backend valida dueño real. Editar/Eliminar solo aparecen con callbacks funcionales. Generación/guardado/recarga ya confirmados por usuario; falta matriz RLS real de candidatos.

El usuario confirmó persistencia de definición estructurada y posteriormente generación/guardado/recarga del candidato 452d1c47. SQL 06 aplicado por usuario con permisos true,true,false,false; no repetirlo. Adaptador, API y panel implementados; 52 pruebas locales, lint/build y auditorías pasan. Fahida debe confirmar sandbox; no hay ejecución/habilitación. Matriz RLS remota completa pendiente.

Organización entregada en `db227f4`; contrato inicial de candidatos entregado en `711eacf`, ambos subidos a origin/miguel. Usuario autorizó commit/push detallado del bloque posterior completo (Gemini/candidatos/objetivos/documentación); confirmar hash y sincronización en Git al retomar. Claves solo .env ignorados, sin mostrarlas ni subirlas. Acceso real/modelo comprobado; cuota/nivel de facturación concretos no inspeccionados. No registrar secretos.

Checklist de definición estructurada confirmado por el usuario (conservar para regresión):

1. Abrir `http://127.0.0.1:5173` e iniciar sesión.
2. Ir a **Capacidades → Crear → Cargar ejemplo editable**.
3. Pulsar **Comprobar definición y buscar similares**.
4. Revisar coincidencias; si necesita otra definición, reconocerlo y pulsar **Guardar definición privada**.
5. Comprobar la copia en **Mis capacidades**, recargar y abrir **Ver → Ver contratos y definición guardada**.
6. Confirmar persistencia de contratos, parámetros y ejemplo. Validar el ejemplo no equivale a ejecutar una implementación.

**Prueba confirmada por el usuario.** No pedir claves/tokens ni desactivar protecciones de DevTools. El formulario usa permisos 04/05; el nuevo almacenamiento separado de candidatos requiere 06, todavía no aplicado.

## Visión y autorización vigentes

- Capacita es un asistente de trabajo extensible mediante capacidades creadas, combinadas, probadas y compartidas. No reducirlo a chat, documentos, marketing o catálogo estático.
- Buscar primero dentro del catálogo autorizado. Una descripción no equivale a implementar o habilitar una capacidad.
- **Miguel = Persona A**: identidad, catálogo, búsqueda, definición y generación. **Fahida = Persona B**: laboratorio, sandbox, workflows y ejecución. [Reparto](PLAN_DOS_PERSONAS_MARTES.md) y [contrato actual](CONTRATO_INTEGRACION.md), pendiente revisión conjunta de B.
- El usuario autorizó implementar el frente Miguel, organizar archivos y subir el bloque local a `miguel` con commit de organización de carpetas. No autorizó gastos, facturación, despliegue o publicación de la aplicación.
- Presupuesto estudiantil: software abierto, cuotas gratuitas y créditos confirmados. No asumir recursos ilimitados.
- No ejecutar código generado dentro de FastAPI ni darle credenciales. API autoriza; B prepara ejecución aislada y evidencia.

## Estado comprobado

| Área | Evidencia | Pendiente |
| --- | --- | --- |
| Login real | Usuario confirmó login; Auth valida `/auth/v1/user` y usa profiles. | Resto de recorridos de Auth por verificar. |
| Catálogo | GET reales 200 y usuario confirma listas. | Matriz remota de RLS completa. |
| Clonación | POST real 201 y usuario confirma copia, también tras activar contratos. | Comparar contratos remotos no vacíos. |
| Privacidad de listas | Segunda cuenta no ve borrador privado, según usuario. | Acceso directo ajeno real debe dar 404; cubierto en simulación. |
| Definición estructurada | API/editor implementados y usuario confirma guardado, recarga y detalle. | Formulario no ejecuta código. |
| Gemini/candidatos | Generación real de ejemplo público y AST/hash correctos. API/UI y persistencia por repositorio implementadas localmente. | Aplicar/revisar SQL 06 y probar persistencia real/RLS con dos cuentas. Sin ejecución de código. |

## Implementación y datos actuales

- FastAPI principal; React/Vite/Tailwind. `src/api.js` es el único cliente de FastAPI.
- Supabase real: `profiles` con display_name/bio; capabilities_owner_id_fkey referencia profiles(id).
- Catálogo PostgREST con clave pública y token de usuario; lecturas con visible_to en origen/resultados y RLS. Sin service_role.
- input_schema/output_schema JSONB existentes; permissions text[]; contadores no nulos default 0.
- Usuario aplicó SQL **03** (lectura), **04** (INSERT por columnas de borradores privados propios) y **05** (contratos). Reportó contratos=true; contador/UPDATE/DELETE=false.
- No habilitados: edición/borrado remotos, publicación, versiones/builds ni motor real integrado. Generación Gemini probada aisladamente; flujo persistente pendiente de SQL 06/prueba autenticada. El código heredado no prueba esas funciones.
- Definición: POST /api/capabilities/definitions/check y /api/capabilities/definitions. Entrada/salida en columnas; parámetros, restricciones, recursos, errores y ejemplos en config.definition. Privado/draft, sin adaptador.
- Validación compartida: backend/services/contract_validation.py. Búsqueda/guardado: definition_service.py. jsonschema==4.26.0 instalado en .venv y declarado en requirements.
- Formulario A: DefinirCapacidad.jsx; HTTP en src/services/definiciones.js; helpers en src/utils/definiciones.js. Laboratorio B CrearCapacidad.jsx conservado y sin integrar.
- .NET se conserva para búsqueda/perfiles y migración posterior. Motor y mocks de otros módulos siguen pendientes; no presentar ejemplos como resultados reales.

## Organización de esta sesión

- Helpers, validación y fixtures compartidas separados de servicios HTTP y tests concretos.
- Mocks antiguos no activos en src/mocks/catalog/; inventario en src/mocks/README.md.
- Retirados: WeatherForecast y solicitud HTTP de ejemplo .NET; hero.png/favicon.svg/icons.svg sin referencias; .gitkeep redundantes y temporales de navegador. Solo captura final local ignorada conservada.
- Continuidad, estado y guía A anteriores archivados en docs/historial/. Guías actuales resumidas; visión/reparto mantienen sus rutas.
- Auditor de imports de solo lectura: scripts/maintenance/audit_structure.py. Documenta archivos de B pendientes sin borrarlos automáticamente.
- Inventario y reglas: [ESTRUCTURA.md](ESTRUCTURA.md). Limpieza validada: 32 pruebas HTTP, lint/build, auditoría de imports y enlaces Markdown correctos; sin módulos inactivos sin clasificar.
- Después de limpiar, usuario reportó diagnósticos `owner=mssql` en SQL 04/05 y en inspect_catalog_write.sql. Confirmada extensión MSSQL 1.47.0; analiza T-SQL, no PostgreSQL. Se añadió .vscode/settings.json con mssql.intelliSense.enableIntelliSense=false y enableErrorChecking=false solo para el workspace (claves/scope window verificados en manifiesto), y excepción precisa en .gitignore. No se alteró SQL ni Supabase; tampoco añade validador PostgreSQL. Pendiente recargar ventana para retirar diagnósticos anteriores. La prueba de definición sigue siendo el siguiente punto.

## Entorno, Git y validación

- Cierre del bloque Gemini: API reiniciada fuera del sandbox con configuración actual; health healthy y tres rutas de candidatos presentes en OpenAPI (check, colección GET/POST y detalle). Vite incorpora panel por HMR. No se certificó el recorrido visual ni persistencia de candidatos contra Supabase real; SQL 06 preparado/no aplicado. Cambios de este bloque sin commit/push nuevo.

- Tras el push `db227f4`, las listas devolvieron 503 con la API iniciada dentro del sandbox. Comprobación de catálogo: fallo de transporte dentro del sandbox; fuera, Supabase responde HTTP 401 a la consulta sin sesión (no certifica permisos ni lectura autenticada). API reiniciada con red autorizada y health healthy. El usuario indicó «listo» después del reinicio; la prueba de persistencia sigue pendiente. No cambiar SQL/RLS por este fallo de red.

- 14/11/2026: el usuario autorizó commit y push del trabajo local a `miguel`, con mensaje de organización de carpetas. Incluye definición estructurada y limpieza; la prueba autenticada sigue pendiente. Frontend/API arrancados y comprobados (HTTP 200). Validación de entrega: lint/build y auditorías de imports/enlaces correctos; no se incluyen secretos ni artefactos locales. Confirmar el hash y el estado remoto en Git después del push.

- Carpeta C:\Users\USER\Documents\CAPACITA, rama miguel. Verificar Git al iniciar y no sobrescribir cambios.
- Bloque anterior subido a origin/miguel: **0ef8397**. Push verificado, árbol limpio antes de iniciar definición.
- Definición y organización incluidas en el bloque autorizado para commit/push; confirmar entrega con el historial y el remoto de Git. Sin despliegue.
- .env y backend/.env locales ignorados, mismo proyecto Supabase; .claude conservado ignorado. No mostrar ni subir credenciales.
- Arranque en [README](../README.md), .venv único en raíz. API sin reload en 127.0.0.1:8000; Vite 127.0.0.1:5173. Revalidar procesos al retomar.
- La red del sandbox bloqueaba Supabase: API con acceso autorizado fuera del sandbox resolvió la conexión. No abrir permisos BD para solucionar red.
- Tras limpiar: 32 pruebas HTTP simuladas, lint/build y git diff --check pasan. Auditoría de imports sin rutas rotas; enlaces locales correctos en 14 documentos. API reiniciada con módulos actuales: health healthy/200 y ambas rutas de definición presentes en OpenAPI. No se ejecutó la prueba autenticada nueva ni se modificaron datos remotos. Advertencias conocidas: bundle >500 kB y deprecación Starlette/httpx.
- Build .NET de referencia falló **antes de retirar plantillas**, NETSDK1045: SDK instalado 9.0.305 frente a proyecto net10.0. No se cambió target ni instaló SDK; compilación .NET sin validar.

## IA configurada y límites actuales

Gemini configurado solo en backend: SecretStr, modelo gemini-4-hydrogen configurable, timeout 45 s y salida 4096 tokens. Consulta de metadatos 200 y una generación real de ejemplo público correctas. La primera clave fue rechazada; tras sincronizar la reemplazada desde raíz a backend, se verificó acceso. No se imprimen valores. Modelo con [nivel gratuito publicado](https://aistudio.google.com/docs/pricing#gemini-4-hydrogen); cuota/nivel de facturación concretos no inspeccionados. No se activó facturación.

[Términos gratuitos](https://aistudio.google.com/docs/terms#data-use-unpaid): contenido puede usarse para mejorar productos; panel exige confirmar ejemplos sin datos privados y envío a proveedor. Una llamada por intento, sin reintentos automáticos. Límite local por proceso: 10 intentos/hora, intervalo 30 s y una generación simultánea por usuario; se reinicia con API y no es cuota distribuida ni límite de facturación. Antes de producción/múltiples workers requiere almacenamiento compartido. No genera permisos/recursos externos.

Nuevas rutas y migración documentadas en CONTRATO_INTEGRACION.md. No consumir IA si la tabla/permisos de candidatos faltan: preflight sin filas antes de generación. Código guardado como datos privados en tabla separada, sin publicación ni ejecución; B debe revalidar hashes y probar aislamiento. La preparación sintáctica no acredita seguridad o corrección.
