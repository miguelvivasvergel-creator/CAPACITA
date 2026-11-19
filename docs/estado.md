# Estado del proyecto

Actualizado: 16/11/2026. Reportes anteriores en [historial](historial/README.md).

## Reanudación inmediata

### Fahida — 20/11/2026: fase 3 Telegram — verificada de punta a punta

Último commit estable: `0843fc5`. Bot @Capacita_web_bot; TELEGRAM_BOT_TOKEN (verificado con getMe)
y TELEGRAM_BOT_USERNAME en `backend/.env`. Nunca imprimir ni subir el token.
- `db/16_telegram.sql` (NO aplicado aún): tablas privadas telegram_links/telegram_codes y 6 RPC
  (persona: link_start/status/unlink; trabajador con reserva: link_complete/unlink_chat/chat_for_job).
  Sus nombres están en la lista permitida del gateway (`core/supabase.py`, EXECUTION_RPCS).
- `api/telegram.py`: GET /telegram/status, POST /telegram/link (código + enlace t.me/…?start=…),
  DELETE /telegram/link. Configuración → sección «Telegram» (`ConectarTelegram.jsx`): abre el bot,
  consulta el estado cada 3 s y permite desconectar.
- `connectors/telegram.py` (enviar_telegram@1, «Conector de acción»): mensaje (en trozos de 4.000)
  y archivo opcional (foto como foto) al chat del DUEÑO, que sale del contexto del trabajo
  (`telegram_chat_for_job`), nunca de una entrada. Texto plano. Token en la ruta (broker
  TOKEN_EN_RUTA) y multipart (`post_form`). sends_content → «Acepto» obligatorio en el backend.
- Trabajador: escucha al bot entre trabajos (cada 3 s; /start CÓDIGO, /salir, ayuda; solo chats
  privados; ante fallo espera 60 s y sigue). Chat: sello 🔒, casilla «Acepto que se envíe a mi
  Telegram», errores en palabras (telegram_no_vinculado…), sugerencia «Mándame por Telegram…».
- `db/15` regenerado con 19 versiones (falta aplicarlo otra vez).
Verificado: 6 pruebas nuevas de Telegram (token solo en la ruta, chat solo del contexto, sin chat
no envía nada, archivo con leyenda, trozos, rechazos, bot solo en chats privados), suite 233/235
(las 2 de siempre), lint y build; backend y trabajador reiniciados con este código.
Fahida aplicó SQL 16 y 15, conectó su Telegram desde Configuración y pidió «Mándame por Telegram el
pronóstico de lluvia de Bogotá de esta semana»: el planner armó Pronóstico (v2) → Enviar por
Telegram y el mensaje llegó a su chat (20/11). Dos arreglos tras la primera prueba: (1) el prompt
del planner bloqueaba «envíos» aunque hubiera conector de acción; (2) el atajo sin IA ofrecía solo
el pronóstico: ahora no se ofrece si el pedido nombra algo que solo hace otra herramienta (por su
nombre, p. ej. «Telegram»), y pasa al planner.
Siguiente: fase 4 (caja interna: pandas, matplotlib, rembg, Tesseract) o fase 5 (asistentes
recurrentes), y el asistente del restaurante (clima histórico + ventas + informe + Telegram).

### Fahida — 19/11/2026: conectores combinables (versión 2)

- `Connector.componible(2)`: los 6 conectores de la fase 1 tienen versión 2 con la misma lógica y
  entradas sin minLength/maxLength/minimum/maximum, para recibir la salida de otros pasos (el
  validador de conexiones rechazaba unir un texto sin límites a una entrada con límites). Los
  límites se siguen comprobando en el código del conector.
- La versión 1 sigue en el registro y en Supabase (sus hashes no cambian; las soluciones ya
  guardadas con ella siguen funcionando). Comparten ficha de catálogo.
- `db/15` (18 versiones, 12 fichas): primero las fichas con los datos de la versión más nueva
  (`ON CONFLICT DO UPDATE`), luego todas las versiones; sirve también en una base nueva.
- Planner: de cada conector ofrece solo su versión más nueva (por versión del registro y fecha).
Verificado: 62 pruebas relacionadas y suite 226/228 (las 2 de siempre). Fahida aplicó de nuevo
`db/15` en Supabase (19/11). Pendiente: una combinación real con el planner (clima histórico + ventas).
Ojo al reiniciar: el backend corre con recarga y deja un proceso hijo en el puerto 8000; hay que
detener también los hijos (`multiprocessing-fork`) o seguirá el código viejo.

### Fahida — 19/11/2026: fase 2, IA en ejecución (commit `090d582`)

Respaldo antes de la fase: commit `9480705`, etiqueta `respaldo/antes-fase-2`. Fahida aceptó
enviar el contenido real a Gemini con un «Acepto» propio.
- `backend/connectors/ia.py`: 6 conectores de IA (Google Gemini, clave del sistema que añade el
  broker solo hacia `generativelanguage.googleapis.com`; el código del conector no la lee):
  resumir, traducir, redactar (sin inventar precios ni contactos: los deja [entre corchetes]),
  leer el texto de una foto, sacar datos de una foto (nunca adivina: vacío y `encontrado:false`)
  y «pedirle algo a la IA sobre un texto». Entradas sin minLength/maxLength para poder recibir
  la salida de otros pasos (el validador de conexiones exige límites iguales); largo validado en
  código. Tope de 30 usos de IA por hora en el trabajador.
- `credential` y `sends_content` solo entran al manifiesto si existen: los 6 conectores ya
  aplicados conservan sus hashes (prueba con los hashes del SQL 15 aplicado).
- «Acepto» obligatorio en el backend: `POST /workflows/{id}/approvals` responde 422 si un paso
  envía contenido a una IA y falta `content_consent`. En el chat, casilla en la tarjeta del plan
  (el botón no se activa sin ella), sello ✨ IA y ya no dice «tus datos no se envían a la IA».
- Planner: sabe que hay conectores de IA. Sugerencia nueva: «Saca la fecha, el total y el
  proveedor de la foto de mi factura».
Verificado: 30 pruebas de conectores + aprobación con IA; suite 224/226 (las 2 de siempre); lint y
build; Gemini real (`gemini-3.5-flash-lite`): resumir, traducir, clasificar comentarios y sacar
datos de la foto de muestra (sin texto: 0 de 3, nada inventado).
Fahida aplicó de nuevo `db/15` y confirmó en el navegador que funciona (19/11, «funciona»; sin
detalle de qué conectores probó). Conectores de la fase 1 con minLength/maxLength: solo reciben datos de la persona, no de
otros pasos; una versión 2 sin esos límites permitiría combinarlos.

### Fahida — 19/11/2026: fase 1, conectores (banco de APIs)

Implementado en código; **falta aplicar SQL** y probarlo en la app:
- `backend/connectors/`: registro revisado (no lo escribe la IA) con 6 conectores gratuitos y sin clave:
  `clima_pronostico` y `clima_historico` (Open-Meteo), `festivos_pais` (Nager.Date), `trm_colombia`
  (datos.gov.co; Frankfurter no tiene COP), `cambio_moneda` (open.er-api, con atribución) y
  `verificar_referencia` (Crossref, cita APA; exige apellido coincidente y nunca dice «inventada»).
- `services/connector_broker.py`: solo https a los hosts del conector, IP pública, sin
  redirecciones ni credenciales, 1 MB, 20 s, tope de peticiones; 429 → «servicio ocupado».
- `services/connector_runtime.py` + rama en `execution_engine` y `workflow_validation`: el
  trabajador ejecuta el paso fuera del sandbox y rechaza un manifiesto distinto al del registro.
- Planner: recibe `profile` y sabe que los `connector-v1` existen (no responde «bloqueado» por eso).
- Chat: sello 🌐 con el proveedor en lienzo, plan y detalle; aviso de qué dato sale; errores en
  palabras (`detail` del paso, nunca el valor); sugerencia «¿Va a llover esta semana en Bogotá?».
- SQL: `db/14_connectors.sql` (columna `connector_key`, regla `version_executor` ampliada) y
  `db/15_conectores_iniciales.sql`, GENERADO con `scripts/connectors/generate_seed_sql.py`
  (capacidad pública + versión + publicación por conector, autor = cuenta del trabajador).
  Una prueba falla si db/15 no coincide con el registro. Cambiar un conector ya aplicado exige
  subir su `version` (key@N).
Límite conocido: solo como paso de una solución (lo que usa el chat). Ejecutar una versión
publicada suelta exige candidato (regla `execution_target`, SQL 08).

Verificado: 22 pruebas de conectores (broker, cada conector, recorrido del trabajador con un paso
conector sin sandbox) y suite completa 215/217 (las 2 de `test_planner_api` fallan desde antes);
lint y build. Llamadas reales a las 6 APIs: pronóstico Bogotá, histórico Medellín, 19 festivos
CO 2026, TRM (domingo → la del sábado), 250 USD → COP y Crossref (LeCun 2015 encontrada; Sampieri
«no encontrada» en vez de confundirla con otro libro; Attention avisa del año distinto).
Fahida aplicó SQL 14 y 15 en Supabase (19/11): `version_executor` con la rama `connector-v1` y los
6 conectores `enabled` y publicados. Probado en el navegador (cuenta de Fahida, guiado): «¿Va a
llover esta semana en Bogotá?» ofreció el conector sin IA, sello 🌐 Open-Meteo, el trabajador lo
ejecutó y devolvió el pronóstico real. Tras esa prueba: resumen con días en palabras («el domingo
22… de noviembre», decimales con coma), resultados con el resumen primero y listas como tabla
(jsonb reordena las claves: el orden lo decide `ResultadoDatos`), y el chat da el ejemplo del dato
(«Ciudad (… por ejemplo Bogotá)»); el primer intento había mandado la pregunta entera como ciudad.
No verificado: planner real (Gemini) combinando un conector con otra herramienta, TRM/cambio/
Crossref desde el navegador.

### Fahida — 19/11/2026: fase 0 del plan de capacidades (detector de cambios)

Punto de respaldo antes de esta fase: commit `cdbfe57`, etiqueta local `respaldo/antes-banco-apis`.
Plan acordado (propuesta, no implementado salvo la fase 0): 0 detector de cambios · 1 broker de
conectores + APIs sin cuenta (Open-Meteo, festivos, Frankfurter, Crossref) con SQL 14 · 2 Gemini
en ejecución con un «Acepto» propio (aceptado por Fahida) · 3 Telegram con aprobación ·
4 caja interna ampliada (pandas, matplotlib, rembg, Tesseract) · 5 asistentes recurrentes ·
6 OAuth de Google. Los nodos de conector necesitan SQL nuevo: aprobar/encolar/reclamar exigen que
cada nodo sea una fila de `capacita_execution.versions` (SQL 08/09).

Fase 0, sin commit todavía:
- `public/muestras/documento_v2.docx`: versión nueva de `documento.docx` (12 → 18 por ciento y un
  párrafo agregado). `MUESTRA:word2` en `archivos.js` y en `verify_factory_gemini_real.py`.
- Prompts (`gemini.py`): describen ambas muestras, una regla de conteo determinista por párrafos
  (difflib; 1 modificado, 1 agregado, 0 eliminados), el diseño de una comparación (entradas
  original/nueva, contadores, colores, secciones) y la receta del Word marcado.
- Vista previa: con dos o más archivos obligatorios usa muestras distintas (antes repetía el mismo
  archivo y no habría cambios). Sugerencia nueva en la bienvenida del chat.
- `backend/tests/test_samples.py`: las muestras deben coincidir con lo que dice el prompt.

Verificado: 39 pruebas relacionadas, lint y build; fábrica real (`gemini-3.5-flash-lite` + gVisor,
sin Supabase) diseñó «comparar_documentos_word» y pasó al primer intento (2 llamadas, 18 s); otra
ejecución real devolvió un Word con «12» rojo tachado, «18» verde subrayado, párrafo nuevo en verde,
resumen y tabla «Cambios importantes» antes del texto. Varía entre generaciones: a veces omite en
la tabla la cifra de un párrafo agregado y escribe «párrafo(s)».
No verificado: el recorrido en el navegador (chat → crear → vista previa → Me gusta → usar con dos
archivos propios), ni con PDF.

### Fahida — 18/11/2026 (noche): arreglos de UX tras la revisión a fondo

Sin commit todavía, en `integracion/Fahida-bloque-6`:
- «Me gusta, guardarla» guarda una solución de un paso con las opciones elegidas (color,
  estilo…); «Usar ahora» la reutiliza así. Solo esa solución marca una herramienta «✓ Lista»;
  las que superaron pruebas sin aprobación salen como «Probada, sin tu visto bueno».
- «Mis herramientas» agrupa por nombre (las versiones mejoradas conservan el nombre original)
  y pliega las «Sin terminar» en un apartado aparte; ya no salta al cargar.
- Comunidad (guiado): «Usar en el chat» directo; «Clonar» solo en modo desarrollador.
- La búsqueda en internet solo ocurre al diseñar una herramienta nueva, no antes del catálogo.
- El «Acepto» de Gemini se recuerda por cuenta en este navegador, con «Retirar mi permiso».
- Turno entre llamadas de generación/corrección: 30 s → 5 s (sigue uno a la vez por persona).

Segunda revisión (misma noche), también sin commit:
- Límite de la IA: mensajes distintos para turno corto, pedido en curso y tope por hora, con
  `Retry-After` (expuesto por CORS); el chat solo reintenta si la espera es ≤ 15 s.
- `available-versions` comprueba la visibilidad en una consulta (`visible_ids`, con
  `visible_to`) en vez de una por versión; «Mis herramientas» se muestra sin esperar etiquetas
  y permite ver todas las versiones con el mismo nombre.
- «Me gusta» guarda también los textos opcionales como valores fijos del paso (nunca archivos)
  y avisa si no pudo guardar; se pueden usar herramientas sin entradas obligatorias.
- Buscar (guiado) abre el chat; el nombre «mejorando» ya no se hereda; «Descartar» se puede
  reintentar si falla; textos neutros para herramientas de la comunidad.
- Tercera revisión: el chat guiado sigue montado (oculto) al cambiar de sección, así que ya no
  se pierde la conversación ni se corta una herramienta a medio crear; se reinicia solo al abrir
  una herramienta, solución o pedido, al cambiar de cuenta o de modo. Tras «Me gusta», el
  archivo adjunto ya no se hereda en silencio en la siguiente necesidad.
- «Mis resultados»: los intentos de la vista previa (ejecuciones sin `workflow_id`) van en un
  apartado plegado; la lista pide 100 y ordena por fecha (la API pagina por id, sin migración).
- Al rearmar el plan tras «Créala», la herramienta recién creada se ofrece siempre al planner y,
  si no la combina, se usa directa (antes diseñaba un duplicado). Comunidad (guiado) distingue
  las públicas sin versión ejecutable: «Pedir una así en el chat».

Probado en el navegador el 18/11/2026 (cuenta de prueba, guiado): «Mis herramientas» aparece al
instante con etiquetas y versiones agrupadas; «Usar ahora» sin IA ejecuta y la conversación sigue
al ir a Resultados y volver; Buscar abre el chat; crear «invertir_orden_palabras» (investigación
web solo al diseñar, 1 corrección automática, vista previa, «Me gusta» con «Todo mayúsculas»)
quedó «✓ Lista» y al reutilizarla devolvió «TRES DOS UNO»; Resultados ordenado; permiso de
Gemini recordado. Se detuvo Oracle XE para liberar memoria (encender: `Start-Service
OracleServiceXE, OracleOraDB18Home1TNSListener` como administrador).
Corregido después (verificado en el navegador salvo lo marcado): el diseñador solo pide estilo,
colores, textos visibles y secciones cuando la salida es un archivo visual; con salida de texto
o datos, de 1 a 4 parámetros que cambien el resultado (no probado aún con Gemini real). Las
etiquetas recuperan tildes y ñ (`src/utils/etiquetas.js`: «Tamaño fuente», «Todo mayúsculas»);
«Probándola con estos datos…» cuando no hay archivo; Mis herramientas muestra primero las más
recientes; Buscar (guiado) habla de herramientas, oculta filtros técnicos y marca «Lista para
usar» o «Solo la idea, sin versión probada». El 502 de la consola era `planner/propose` tras
crear la herramienta, ya cubierto por el arreglo del duplicado.
Reutilizar sin IA (verificado): una necesidad nueva escrita en el chat busca primero en el
catálogo (sin Gemini ni «Acepto»); si hay herramientas ejecutables con palabras en común
(≥2 y ≥40 % del pedido), la tarjeta «Ya tienes algo que puede servir» ofrece hasta 3 para usar
directo; «Ninguna me sirve» sigue con el planner y pide el «Acepto». En la prueba solo se llamó
a `planner/options`.
Sin verificar con una segunda cuenta: usar la herramienta pública ejecutable de otra persona.
- Sin cambio a propósito: lo creado con «Créalas todas» queda «Probada» hasta que la persona
  la apruebe, porque no pasó por vista previa.

Verificado: lint, build y 190/192 pruebas backend (5 nuevas en
`test_limits_and_visibility.py`; las 2 de `test_planner_api` fallan igual en el commit
anterior: Supabase 503). No verificado en el navegador.

### Fahida — 18/11/2026: herramientas personalizables e investigación web

Implementado en `integracion/Fahida-bloque-6`:
- Herramientas personalizables: estilos (`enum`), escalas (`minimum`/`maximum`), colores
  `#RRGGBB` con selector, secciones `incluir_…` y archivo de marca opcional (logo) que el chat
  ofrece al final y se puede saltar con «no».
- Investigación web antes de empezar: `POST /objectives/research` con Grounding with Google
  Search sobre `gemini-2.5-flash` (gratis, 500/día) una vez por conversación; tarjeta con
  fuentes y Search Suggestions; lo investigado no se guarda (términos de Google) y se pasa al
  diseño como `research_summary`. Si falla, el chat lo avisa y sigue sin fuentes.
- Calidad: constraints «Calidad:» obligatorias para el código, receta de informes de datos e
  imports de reportlab 4.2.5 comprobados; el sandbox devuelve `error_detail` (solo nombres de
  código) para Import/AttributeError, y la corrección automática sabe qué cambiar.
- Planner: si el plan no cumple contratos, reintenta una vez con el error; si sigue fallando,
  el chat diseña una herramienta nueva en vez de mostrar el error.

Verificado: 185/187 pruebas del backend (fallan 2 de `test_planner_api` ya rotas antes de
estos cambios), lint y build; búsqueda real con la clave gratuita; fábrica real Excel → PDF en
gVisor con `gemini-3.5-flash-lite`, que pasó al primer intento con informe completo
(`3.1-flash-lite` fue inconsistente en 6 pruebas). `backend/.env` local cambiado a
`GEMINI_MODEL=gemini-3.5-flash-lite`.
No verificado: recorrido completo en el navegador tras el último cambio; cuota gratuita de
`3.5-flash-lite` (revisar ai.dev/rate-limit); comportamiento después del 01/12/2026, cuando
Google redirige `gemini-2.5-flash`. Correr las pruebas del backend cierra el trabajador
(una prueba usa el sandbox real): reiniciarlo después.

Preparación de demo: `scripts/demo/iniciar-demo.ps1` comprueba memoria libre, sandbox
(socket + `runsc`), arranca backend, trabajador y frontend en ventanas propias y espera a que
respondan; `docs/demo/ventas.xlsx` es un resumen mensual de 12 productos de un restaurante con
las mismas columnas que la muestra de la fábrica (Producto, Cantidad, Precio) más Categoría.
El prompt agrupa productos repetidos y limita la tabla a 15 + «Otros».
Verificado: sintaxis del script y sus comprobaciones de sandbox (socket y gVisor OK); 13
pruebas de Gemini/investigación. No verificado: el script completo (no se arrancaron los
procesos: solo había 0,5 GB de memoria libre) ni un informe real hecho con `ventas.xlsx`.

Reutilizar herramientas sin IA: en Herramientas cada una dice «✓ Lista · Usar ahora» o «Sin
terminar» (las listas primero). «Usar ahora» abre el chat con la herramienta como solución de
un paso (`solucionDirecta.js`): sin Gemini ni búsqueda web, pide los datos y ejecuta; si ya
existe una solución guardada de un paso con esa versión, la reutiliza en vez de duplicarla.
Resultados muestra el nombre de la herramienta o solución de cada ejecución.
Verificado: la solución de un paso pasa `compile_workflow` del backend con contratos de
ejemplo (archivo de entrada, PDF de salida, opciones enum/color/booleanas); lint y build.
No verificado: el recorrido en el navegador con datos reales de Supabase.

Traspaso a Fahida: [resumen operativo](historial/PARA_FAHIDA_MARTES.md) con commits de
Miguel, pruebas, pendientes por dueño, B6 sin certificar y aceptación conjunta
para el martes. Disponible en rama miguel; lectura de Fahida no confirmada.

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
Detalle reproducible en [ENTREGA_MARTES.md](historial/ENTREGA_MARTES.md), inventario actualizado
en [CIERRE_MIGUEL.md](historial/CIERRE_MIGUEL.md). Consultar Git para entrega del avance nuevo.

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

B6 en curso, 16/11/2026: SQL09 aplicado por Fahida y RPC verificada; flag true,
API y worker listos. Lecturas y rechazos remotos pasan sin publicar datos. Falta
publicación voluntaria y aceptación real entre cuentas. Rama nueva integra
Miguel 3002946, incluido B1–B5.
Publicación ejecutable/retirada preparada con SQL09, API, UI y resolución para
workflows/planner sin revelar código privado. 168 tests, lint/build, Chrome de
fixtures y gVisor/PostgreSQL temporal pasan. No repetir SQL09.
No aceptación pública real todavía; compuestas/agente/archivos y ensayo siguen
pendientes. Ver [B6](BLOQUE_6_INTEGRACION.md). No declarar bloque final cerrado.

Entrega B5 autorizada, 16/11/2026: cierre técnico completado y commit detallado
para subir a feature/Fahida-backend-setup. La aceptación con Fahida y Miguel queda
en B6; no falta desarrollo B5 por ese recorrido. Sin merge a main.

16/11/2026 — B5 resultados/historial implementado: lista paginada propia, detalle,
progreso y parciales, copiar/descargar JSON, nuevos datos con confirmación e
idempotencia; workflow necesita nueva aprobación. 96 tests backend, lint/build,
Chrome de fixtures desktop/móvil y lecturas remotas privadas pasan. Sin nueva
migración ni merge con Miguel. Pendientes: aceptación de uso con Fahida y B6
integrado. Ver [guía B5](historial/BLOQUE_5_RESULTADOS.md). No declarar planner/publicación
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
aceptación con dos sesiones pendientes. [Guía B3](historial/BLOQUE_3_EJECUCION.md).
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
Guía y límites en [LABORATORIO_BLOQUE_2.md](historial/LABORATORIO_BLOQUE_2.md).

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
Guía de consumo A: [ENTREGA_A_B_CANDIDATOS.md](historial/ENTREGA_A_B_CANDIDATOS.md).
Cada bloque deja pruebas, pendientes y commit local. Sin gastos ni publicación.

Propiedad: laboratorio, pruebas aisladas, archivos, workflows, builds, motor, resultados e historial. CrearCapacidad.jsx y FileUpload.jsx se conservan para integración; no se implementaron aquí.

Hay código heredado de runs/perfiles/adaptadores y datos en memoria; no demuestra motor persistente ni aislamiento real. Reportes anteriores de Franklin, Luis Miguel y Fahida conservados en [ESTADO_2026-11-14.md](historial/ESTADO_2026-11-14.md), sin tratarlos como aceptación actual ni reasignarlos.

Consumo de definición A en [CONTRATO_INTEGRACION.md](historial/CONTRATO_INTEGRACION.md), pendiente revisión conjunta. Sandbox y laboratorio local probados; integración remota, habilitación y motor de ejecución pendientes según el [plan A/B](historial/PLAN_DOS_PERSONAS_MARTES.md).

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
