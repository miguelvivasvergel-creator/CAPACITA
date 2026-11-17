# Fahida — contexto y continuidad

## Versión final soñada — 17/11/2026 (en curso, meta jueves 19/11)

Fahida decide construir sola la [versión final](VISION_FINAL.md): chat + taller
tipo n8n, fábrica "primero interno", comunidad. Rama `integracion/Fahida-bloque-6`.

Avance registrado:

1. `c8bd616` Documento VISION_FINAL.md con hoja de ruta de 8 fases. Push hecho.
2. `b026a6a` Limpieza: 12 archivos frontend fuera de main.jsx, 12 mocks sin uso,
   backend-dotnet/ y 20 docs a historial. Lint/build/enlaces OK; backend 166/168
   (2 tests del planner reciben 503 de Supabase; backend no se tocó). Push hecho.
3. backend/.env tenía GEMINI_TIMEOUT_SECONDS=180 (máximo admitido 60): la API no
   cargaba la configuración. Corregido a 60 con autorización; claves intactas.
4. Fase 1 chat + taller (implementada, sin probar todavía con sesión real):
   `src/components/taller/` (ChatTaller, LienzoTaller, TarjetaPlan, estadosNodo)
   y estilos `.taller-*` en workspace.css. Inicio del modo Guiado = ChatTaller.
   Orquesta APIs existentes: /planner/options → /planner/propose; sin opciones o
   faltante → /objectives/interpret + PrepararHerramientaGuiada (laboratorio real);
   plan → guardar/aprobar/ejecutar workflow y seguimiento /runs/{id} que pinta los
   nodos. Consentimiento Gemini una vez por conversación. Lint/build OK.

5. Verificación visual con fixtures: `scripts/maintenance/verify_taller_browser.js`
   pasa 7 comprobaciones (plan + consentimiento, fallo de red y reintento con la
   misma clave, nodo en curso iluminado, salida escapada y nodos en verde, detalle
   del paso, móvil 390 sin desplazamiento, herramienta faltante creándose). Capturas
   revisadas en output/playwright/taller-*.png (ignoradas). Corregidos tras revisar:
   pestañas visibles en escritorio, detalle encima del lienzo, reencuadre en móvil.
   AsistenteGuiado y verify_guided_browser.js retirados (reemplazados por el chat).
   No es prueba con sesión, Gemini ni worker reales.

6. Paso 1 del plan del jueves — fábrica automática en el chat (implementada):
   `taller/FabricaHerramienta.jsx` + `taller/fabrica.js` reemplazan a
   PrepararHerramientaGuiada dentro del chat (sigue en TrabajoCapacidad).
   Un botón "Crear y probar": guarda definición → Gemini genera → prueba en
   sandbox con los ejemplos de la definición → si falla por el código, Gemini
   corrige (máx. 2) → la persona confirma "Activar y continuar" → re-planifica.
   Espera 31 s y reintenta si el limitador de Gemini responde 429. El nodo del
   taller muestra escribiendo/probando/corrigiendo/espera aprobación.
   Backend: el informe de prueba añade pistas seguras por caso (`error_type` solo
   con nombres de excepciones estándar; `mismatched_fields` y `schema_valid`),
   nunca la salida del candidato. CANDIDATE_REPAIR_LIMIT por defecto 2 → 4/hora.
   Validación: unittest 167/169 (los 2 del planner con 503 de Supabase, ajenos);
   test nuevo de pistas; sandbox real gVisor devolvió `KeyError` y limpieza
   verificada; navegador con fixtures 9/9 (incluye fallo → corrección → aprobación
   → activar → plan). Corregido: nodo en creación quedaba oculto (React Flow sin
   medir) al cambiar de estado. Pendiente: recorrido con sesión, Gemini y worker reales.

7. 17/11 — Primer recorrido real completo con sesión de Fahida, Gemini y worker:
   "Cuenta cuántas vocales…" → herramienta creada, probada en gVisor y activada →
   plan → dato pedido en el chat → ejecución → {total 4, vocal "o", 2}. Arreglos
   necesarios: `.env` local WORKFLOW_PROTOCOL 3→2 (el worker no arrancaba) y
   GEMINI_MODEL=gemini-3.1-flash-lite (el modelo por defecto gemini-4-hydrogen da
   503 por alta demanda; el código no lee GEMINI_TASK/CODE/CONVERSATION_MODEL).
   `0adb4b5`: reintento corto solo ante 500/503 de Google, instrucción de código
   multilínea (flash-lite escribía todo en una línea), la fábrica pide otra versión
   una vez si el código es inválido. `9ce05f4`: el chat pide el dato único como
   mensaje (sin recortar espacios) y "Aprobar y ejecutar" guarda una vez y ejecuta;
   esquemas del planner sin additionalProperties se aceptan.
   Idea de Fahida: entrada y salida en otros formatos (PDF, Word…) → conversores
   como capacidades base en el paso 2/3 (propuesta, no implementada).

8. 17/11 — Paso 2 caja de herramientas (implementado y aplicado): imagen
   `scripts/sandbox/Dockerfile.toolbox` (pypdf 5.1.0, python-docx 1.1.2, openpyxl
   3.1.5, reportlab 4.2.5, Pillow 11.0.0 + dependencias fijadas, bytecode
   precompilado) construida con `build_toolbox_image_wsl.sh`, ID
   sha256:b114eaf6…. Perfiles: stdlib (12 s, 0,5 CPU, 256 MB; versiones antiguas)
   y toolbox (30 s, 1 CPU, 512 MB; pruebas nuevas). Runner y motor eligen imagen y
   límites por perfil desde lista cerrada; test exige que ambas copias coincidan.
   prepare_candidate rechaza imports fuera de stdlib+toolbox; Gemini conoce las
   librerías. gVisor real: PDF creado y leído + docx + xlsx + png en 6,9 s.
   SQL 10 aplicado por Fahida (solo reemplaza execution_enable; la restricción de
   tabla se retiró porque hay 13 versiones desactivadas `managed-tools-v1`).
   Tests 171/173 (2 planner Supabase 503 ajenos).

9. 17/11 — SQL 11 aplicado: Supabase tenía `version_executor` (experimento
   managed-tools, columna managed_id, no versionado) que exigía stdlib; ampliada a
   toolbox y retirada `versions_profile_known` (el segundo intento del SQL 10 sí la
   instaló). Recorrido real: TitleCaseConverterAndCounter creada y probada en toolbox,
   activada (201), plan, aprobación y ejecución completadas. Chat: si el planner
   responde blocked, se intenta diseñar una herramienta (el diseñador bloquea si
   hace falta algo externo). Mejora anotada: botón "Créalas todas".

Siguiente (plan hasta el jueves 19/11): paso 3 archivos de entrada y salida
(📎 en el chat, piezas conversoras leer/crear PDF-Word-Excel, descarga), paso 4
demo real, compartir desde el chat y menú.
Las pantallas Guiado antiguas (AsistenteGuiado, PlanGuiado) quedan sin uso desde
Inicio y se retirarán tras validar el chat. No afirmar versión final completa.

## B6 en curso — 16/11/2026

Fahida autoriza integrar `origin/miguel` y avanzar B6. Nueva rama
`integracion/Fahida-bloque-6` desde e4b286f, fast-forward a 3002946: Miguel ya
incluía B1–B5. Sin conflictos ni main. Leídos sus apuntes PARA_FAHIDA_MARTES,
ENTREGA_MARTES, CIERRE_MIGUEL y propuesta de publicación. `.env` conservados;
eliminación previa de backend/.env.example preservada y respaldada en un stash
específico. No restaurar/aplicar ese stash sin revisar.

Instalado Pillow 13.0.0 faltante; 160 pruebas de base integrada pasan. Implementado
soporte local de publicación ejecutable, retirada, uso ajeno sin abrir candidato,
workflows/planner por contratos y UI desde capacidad. Fahida confirmó SQL09 con
Success; RPC verificada y PUBLICATIONS_ENABLED=true activado en backend/.env.
168 pruebas backend pasan, lint/build correctos; PostgreSQL temporal con SQL09 y
gVisor real pasa uso ajeno directo/workflow, retirada, permisos y regresiones B.
Chrome con fixtures desktop/móvil pasa consentimiento, confirmación, retry,
retirada y estado desactivado. No equivale a publicación remota aceptada.

Detectado `/files` heredado descartaba contenido y devolvía éxito sin sesión:
ahora 401 sin sesión y 501 explícito con sesión. Archivos privados no implementados.
Fahida confirmó trabajador de Miguel detenido; local anterior había terminado.
Ausencia comprobada antes de pruebas sandbox. Guía y siguiente paso:
API integrada reiniciada, health 200, trabajador local normal reiniciado y
mensaje de recuperación confirmado. No duplicar worker ni repetir SQL09.
La primera activación no terminó; una segunda comprobación confirmó RPC y guardó
solo el flag. API reiniciada con la activación y worker normal listo.
`verify_publications_remote.py` pasó con cuenta worker, sin escrituras: activación,
descriptores/contratos sin código, 401 sin sesión, 404 publicación inexistente y
run ajeno, 422 sin consentimiento. Reporte ignorado block6-activation-remote.json.
Guía [BLOQUE_6_INTEGRACION.md](BLOQUE_6_INTEGRACION.md). Siguiente: usuaria recarga
Capacita, abre herramienta propia probada y consulta versiones para compartir.
Falta consentimiento/publicación voluntaria y ejecución entre dos cuentas reales;
ninguna capacidad real se publicó por activar el flag. No confundir con fixtures.
Compuesta registrada, agente guardado, archivos privados, creación guiada nueva
real y ensayo final siguen pendientes. No cerrar B6 ni afirmar versión final.

## Actualización B5 — 16/11/2026

Fahida autorizó avanzar B5 mientras Miguel integra B3/B4. Resultados e historial
implementados en la rama B, sin mezclar `origin/miguel`: `#historial/UUID`, lista
paginada, detalle/progreso, parciales y omitidos, copiar/descargar JSON y nuevo
run con datos explícitos e idempotencia. Workflow se reabre en revisión actual
sin aprobación anterior. Navbar/App llevan cambios mínimos para acceso y rutas;
coordinar esos archivos al integrar. No SQL nuevo, ni cambios al worker ni a los
datos de Fahida. Eliminación previa backend/.env.example ajena, conservar fuera.

Validación: 96 tests backend, lint sin avisos y build pasan (bundle grande conocido).
Chrome temporal 1280/390 pasa paginación, copia/descarga, texto escapado, parciales,
datos inválidos, mismo idempotency key tras fallo, polling, reapertura, vacío/error
y aprobación nueva de workflow. Capturas ignoradas; fixture sin Supabase/sesión.
Aceptación remota de solo lectura con cuenta worker: lista paginada/detalle
coinciden, completado e interrumpido con parciales, ejecución ajena 404 y ausente.
Reporte ignorado `output/laboratory/block5-history-remote.json`: passed=true.
Guía: [BLOQUE_5_RESULTADOS.md](historial/BLOQUE_5_RESULTADOS.md).

Cierre técnico B5 completado. Fahida autoriza commit detallado y push a su rama
el 16/11/2026. Siguiente: integrar con Miguel y aceptación conjunta B6; el recorrido
con Fahida en la página nueva pertenece a esa aceptación, no es desarrollo B5
pendiente. No afirmar prueba de su sesión real ni planner/publicación/conectores
completos. No merge a main. La eliminación local previa de .env.example se excluye.

Entrega confirmada: commit B4 5844a8e y commit B3 873131a subidos a
origin/feature/Fahida-backend-setup el 15/11/2026. Push correcto, sin merge
a main. Siguiente: revision con Miguel y planificar B5. Eliminacion local
previa de backend/.env.example excluida deliberadamente del commit.

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


Documento único y acumulativo del frente B. Leerlo al retomar, junto con el
contexto global y el contrato compartido. Conservar aquí cada bloque, su evidencia,
bloqueos y siguiente paso; no crear una continuidad nueva por sesión.

## Punto actual para retomar

Recorrido B4 de usuaria: confirmó «Proceso privado guardado» para workflow de dos
pasos con su versión de normalizar texto. Confirmó aprobación y ejecución real
Completado, ambos pasos completados y resultado «Mi primer workflow real», con
espacios extremos retirados. Evidencia declarada por usuaria; UUID del workflow
y run aún no compartidos. Siguiente: reabrir tras F5 y privacidad de workflow
conocido; aceptación técnica remota automática ya pasó con fixture independiente.

**B4 autorizado e iniciado** por Fahida después del cierre B3. Implementación
local de workflows privados sobre versiones B3: editor React Flow, conexiones
por campo, contratos/DAG, guardado/revisiones, aprobación por datos y ejecución
secuencial con progreso y resultados parciales. Fahida confirmó SQL 08 aplicado
con Success; RPC comprobada realmente. WORKFLOW_PROTOCOL=2 configurado localmente
sin mostrar/cambiar credenciales y worker nuevo activo. 96 pruebas backend y lint/build pasan; migración y dos pasos reales
con parámetro no predeterminado pasan en PostgreSQL temporal/gVisor. Editor
verificado con Chrome headless en escritorio 1280 y móvil 390: dos pasos,
parámetros/conexiones, aprobación invalidada al editar y salida escapada; capturas
locales ignoradas revisadas. Aceptación técnica remota con fixture privada pasa:
dos pasos y parámetro no predeterminado, aprobación obsoleta 409, ciclo 422,
idempotencia, persistencia al reiniciar API temporal, caída durante segundo paso
con parcial del primero conservado, recuperación interrupted y nuevo workflow
completado. Archivo conserva historial; versión fixture deshabilitada. Docker sin
contenedores restantes comprobado. Reporte: output/laboratory/block4-remote-latest.json,
ignorado, passed=true. Ninguna capacidad/versión de usuaria se modificó; sin IA.
Vite actualizado a 8.3.8 y dependencias transitivas corregidas;
npm audit marca 0 vulnerabilidades conocidas. Mapa cargado de forma diferida.
API real del puerto 8000 y WEB 5173 reiniciadas, worker protocolo 2 activo;
no abrir copias adicionales. Siguiente punto exacto: usuaria recarga navegador
y abre Workflows → Nuevo workflow → seleccionar versión propia y añadir pasos.
Pendiente recorrido en su sesión real y privacidad de workflow conocido entre
dos cuentas (SQL temporal la comprueba; fixture remota es privada de worker).
Sin commit B4 todavía; no confundir el commit B3 local 873131a con un push nuevo.
Guía: [BLOQUE_4_WORKFLOWS.md](historial/BLOQUE_4_WORKFLOWS.md). Sin push/merge ni B5 iniciado.

**Aceptación B3 privada completada** con evidencia combinada de usuaria y pruebas
automáticas reales. Fahida confirma API reiniciada y prueba nueva real con
«Reporte compartido guardado en Supabase», «Casos superados» y botón de habilitar.
Confirma después habilitación privada y ejecución completada con datos nuevos:
texto «Esta es mi primera ejecución del bloque 3», sin espacios en extremos en
el resultado. Confirmó resultado conservado tras F5, lectura propia y 404 desde
otra cuenta autenticada para run f7585351… (UUID no es credencial). Fuente de
estas comprobaciones: usuaria, no navegador controlado por agente.

Después autorizó al agente completar pruebas restantes. Verificador remoto con
fixture privada de cuenta worker terminó `passed=true`: build/habilitación,
resultado real, idempotencia de versión/run, conflicto 409, entrada inválida 422,
persistencia tras reinicio de API temporal, terminación forzada del worker durante
run, vencimiento real de reserva, recuperación interrupted, ausencia de
contenedores, nuevo run completado y rechazo 409 de versión fixture deshabilitada
sin borrar historial. Otra identidad obtuvo 404 para el run real de Fahida.
Reporte sanitizado: output/laboratory/block3-remote-latest.json (ignorado).
No se modificó la capacidad/versión de Fahida ni su API del puerto 8000.
Worker normal reiniciado, mensaje «Trabajador compartido listo; sandbox recuperado».
La fixture queda privada y marcada `[PRUEBA B3]` en cuenta worker, sin llamada IA;
su modelo indica fixture aunque provider conserva la restricción histórica gemini.
No borrar sus registros ni presentarlos como generación IA. Commit local de
cierre B3 creado; confirmar hash en Git. Push pendiente, revisión A/B pendiente;
B4 workflows permanece sin iniciar.

**B3 autorizado e iniciado el 15/11/2026.** Fahida confirma acuerdo con Miguel:
guardar solicitudes/resultados en Supabase, trabajador aislado en su equipo y
habilitación explícita de versiones privadas. Esta instrucción sustituye la
detención de B3 registrada en los cierres anteriores. Implementación local
validada con PostgreSQL temporal y gVisor. Fahida confirmó después aplicación de
SQL 07 en Supabase («Success. No rows returned»); no repetir. Confirmó también
cuenta Auth dedicada creada y autorizada mediante INSERT en workers. No se
registran correo, contraseña ni UUID. Fahida confirmó configuración guardada;
se verificó presencia de valores sin mostrarlos y modo supabase. Agente inició
shared_worker.py con acceso autorizado; mensaje real «Trabajador compartido listo;
sandbox recuperado». Worker activo en sesión de herramientas, no abrir otra copia.
Siguiente: reiniciar API con código B3 y recorrido manual de candidato propio.
Aún no hay aceptación remota
ni despliegue. Guía y contrato exactos:
[BLOQUE_3_EJECUCION.md](historial/BLOQUE_3_EJECUCION.md).

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
[LABORATORIO_BLOQUE_2.md](historial/LABORATORIO_BLOQUE_2.md) con 18 secciones paso a paso.
**No iniciar el bloque 3 sin una nueva instrucción**: la pregunta sobre avanzar
en paralelo no era autorización y el usuario pidió detenerlo. No se aplicaron
cambios de código B3. La aceptación manual B2 sigue pendiente, no confirmada.

Bloque 2 implementado localmente el 14/11/2026: API privada de builds, cola/reportes
SQLite durables, trabajador separado, harness dentro de gVisor y panel de candidato.
75 pruebas backend pasan; batería real de candidatos de fixture comprobada, con
límites y limpieza. Ver el cierre al final y la [guía reproducible](historial/LABORATORIO_BLOQUE_2.md).
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
  con Miguel conforme al [reparto](historial/PLAN_DOS_PERSONAS_MARTES.md).
- Un commit puede entregar un avance verificable con bloqueo: no significa
  que todos los criterios del bloque estén cumplidos.

## Tablero acumulado

| Bloque | Estado | Evidencia / dependencia |
| --- | --- | --- |
| 1. Base y sandbox | Verificado localmente | Ubuntu/Engine/runsc y 10 comprobaciones reales pasan; controles de recursos, salida, timeout y limpieza. |
| 2. Laboratorio y reportes | Aceptado; subido a rama B | Pruebas privadas, persistencia, privacidad y recuperación verificadas; cola compartida incorporada en B3. |
| 3. Ejecución persistente | Aceptado en alcance privado B3 | SQL 07 aplicado por usuaria; recorrido real, persistencia, privacidad y recuperación verificados. Sin workflows/publicación ni apagado de Windows probado. |
| 4. Workflows | Aceptado en alcance privado; subido a rama B | SQL 08 y protocolo 2; fixture de dos pasos con recuperación y proceso real de Fahida conservado tras reinicio/privacidad. |
| 5. Resultados e historial | Cierre técnico completado; entrega autorizada a rama B | Historial/detalle, parciales, copiar/descargar y nueva ejecución; Chrome de fixtures y lecturas reales pasan. Aceptación integrada en B6. |
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
[LABORATORIO_BLOQUE_2.md](historial/LABORATORIO_BLOQUE_2.md). Commit local identificable por
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

## Bloque 3 — 15/11/2026: almacenamiento compartido y ejecución privada

Autorización: usuario y Miguel acuerdan Supabase compartido y versiones privadas;
usuario pide iniciar B3. No implica autorización de publicación, gastos ni pasar
fixtures como aceptación remota. SQL preparado para aplicación manual, no enviado
a Supabase desde esta sesión.

### Implementación local

- `db/07_shared_execution.sql`: esquema privado con jobs, versiones, cuentas
  worker y reserva global; sin escritura directa de usuarios a evidencia ni
  service_role. RPC SECURITY DEFINER con search_path vacío, permisos cerrados y
  controles propios de dueño/worker. Cuenta Auth dedicada autorizada por admin.
- Builds conserva API B2 pero usa Supabase por defecto (configuración explícita
  sqlite permite consultar laboratorio anterior). No importa ni borra SQLite.
  Reportes locales no habilitan versiones compartidas; repetir pruebas en nube.
- Versiones privadas inmutables ligadas al candidato/build/hashes. Habilitación
  explícita e idempotente por candidato, solo con reporte compartido satisfactorio
  del perfil vigente. Deshabilitar impide trabajos nuevos, conserva historial.
- `/api/runs` ahora encola versión/inputs/parameters con Idempotency-Key; lista y
  detalle propios persistentes. Retirado del router principal el motor heredado
  en memoria/BackgroundTasks. Panel B3 dentro del candidato permite habilitar,
  ejecutar JSON nuevo, consultar resultados y reabrir historial paginado.
- `shared_worker.py`: JWT de cuenta dedicada y renovación, reserva 60 s/heartbeat
  10 s, fencing de resultados, limpieza antes de recuperar interrupted y sin
  reintentos automáticos. Lock local compartido con B2. Un host designado WSL de
  Fahida; no se promete limpieza de contenedores de otros equipos.
- Reutiliza gVisor B2; revalida contratos/hashes antes de ejecutar, valida salida
  JSON finita y conserva resultado solo para run completado. No source ni claves
  ejecutados en API/host; runner recibe solo source/inputs/parameters.
- Mocks visuales separados, sin fallback. Página Ejecutar heredada y workflows
  no integrados; B4/B5 conservan su alcance. No publicación ni conectores.

### Validación y pendientes

- 87 pruebas backend pasan (75 previas + 12 nuevas): contratos, integridad,
  perfil gVisor obligatorio, salida privada/sanitizada, API/autenticación y
  recuperación de worker simulada. Frontend lint/build pasan; advertencias
  conocidas de bundle >500 kB y Starlette/httpx.
  Verificado además que un fallo de limpieza/perfil detiene el trabajador antes
  de reclamar otro trabajo. OpenAPI registra builds/versions/runs nuevos;
  auditoría de imports y enlaces locales pasa. Cambios B3 aún sin commit/push.
- SQL 06/07 aplicado y verificado **solo en PostgreSQL 17 temporal**, sin red ni
  puertos, con Auth/catálogo de fixture: idempotencia/conflictos, privacidad,
  permisos worker, habilitación, salida privada, reserva/fencing, recuperación,
  deshabilitación y paginación. Contenedor de prueba eliminado y ausencia
  comprobada. Imagen gratuita descargada y fijada por digest en el verificador.
- Primer intento `verify_shared_database.py --sandbox` se detuvo por lock del
  trabajador B2 activo, antes de crear la base/ejecutar fixtures. Solicitado a
  Fahida detener su worker cuando esté inactivo; no se terminó ningún proceso.
- Fahida confirmó «trabajador detenido». Completada después la verificación con
  `--sandbox`: build de fixture real en gVisor, habilitación de versión y run con
  datos nuevos, salida validada/persistida en PostgreSQL temporal y privada frente
  a otra identidad. Dos contenedores de candidato con limpieza verificada; base
  temporal eliminada con ausencia comprobada. Sin IA ni candidato remoto.
- Un primer recorrido completo abortó en una aserción de rechazo; se añadió
  identificación de la aserción y se reforzó el helper para que su propio error
  use P9999 y no pueda confundirse con P0001 esperado. El recorrido final con
  aserciones estrictas terminó código 0 y ambos PASS (SQL y gVisor). No se
  aplicaron cambios remotos para resolverlo.
- Pendientes de activación real: revisión A/B de SQL 07, aplicarlo al proyecto
  correcto, crear/autorizar cuenta worker dedicada y configurar sus credenciales
  localmente. Después recorrido navegador con dos cuentas y datos nuevos,
  persistencia y terminación forzada del nuevo worker con reserva compartida.
- No hay migración de históricos SQLite, retención productiva ni habilitación
  pública. No se registra código local como funcionalidad remota verificada.
- Siguiente punto exacto: aplicar SQL 07 en el proyecto Supabase correcto y
  autorizar cuenta Auth dedicada del worker siguiendo la guía B3, sin compartir
  contraseña. Después configurar backend/.env y aceptación real desde navegador.
