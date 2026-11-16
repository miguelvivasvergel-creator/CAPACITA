# Planner A: propuestas revisables

Estado al 16/11/2026. Inicio → Planificar un proceso busca primero en el catálogo
autorizado. Solo ofrece versiones habilitadas accesibles mediante los contratos B
existentes. El usuario selecciona hasta doce y revisa nombres, descripciones y
contratos antes de consentir su envío a Gemini, incluidas las capacidades privadas.
No se envían código ni resultados de ejecuciones.

Actualización de cierre: selector text/semantic explícito, semántica local aceptada
con sesión real y una opción propia habilitada. En modo semantic la consulta de
búsqueda usa los primeros 200 caracteres y hasta 200 capacidades autorizadas;
la propuesta a Gemini conserva el objetivo completo consentido. Modelo ausente
produce error y permite elegir texto, sin fallback oculto. POST options/propose
aceptan `mode` con text por defecto. La decisión create o una búsqueda vacía
permiten pasar el objetivo a definición sin autoguardado ni consentimiento heredado.

## Contrato

- `POST /api/planner/options`: `{objective}`; no llama a IA. Devuelve
  `{items, next_cursor: null, search_kind: "text", search_truncated}` dentro de
  `data`. Cada opción incluye `review_hash`, SHA-256 de sus metadatos y contratos.
- `POST /api/planner/propose`: `{objective, version_ids, version_hashes,
  consent_to_provider}`. `version_hashes` relaciona cada UUID seleccionado con la
  huella recibida al buscar. Una selección duplicada, incompleta o mal formada
  devuelve 422. Si cambia la disponibilidad o la huella, devuelve 409 antes de IA.
- Reutiliza el límite local de generación: un trabajo por usuario, espera mínima
  de treinta segundos y diez intentos por hora/proceso. No es cuota distribuida.
- La respuesta contiene `proposal`, `validation`, `search_truncated`,
  `saved: false` y `executed: false`. Decisiones: `reuse`, `compose`, `clarify`,
  `create` o `blocked`. Solo las dos primeras contienen definición de workflow.

La huella evita enviar metadatos nuevos bajo una revisión anterior; no es una
firma ni concede permisos. Se vuelve a consultar con el JWT del usuario, se
revalida la selección y se comprueba el workflow tras la inferencia. Un cliente
modificado no obtiene acceso a versiones ajenas suministrando otra huella.

La búsqueda es textual: hasta veinte capacidades encontradas y doscientas
versiones enumeradas. Cualquier recorte se señala como parcial. No garantiza
encontrar todas las equivalencias. Las versiones compartidas para terceros siguen
dependiendo del contrato B; este módulo no implementa publicación de versiones.

## Revisión y constructor

Si faltan versiones, «Definir la capacidad que falta» conserva el objetivo
original y modo de búsqueda en esta pestaña, separados por cuenta hasta 48 h.
No guarda código, resultados, selección ni consentimiento. Al guardar la
definición se asocia su ID y se abre el espacio de implementación B existente.
Desde allí, «Retomar plan con capacidades disponibles» vuelve a Inicio/planner
con el objetivo prellenado. Se exige buscar de nuevo y revisar las versiones;
no se genera, aprueba ni ejecuta automáticamente. Puede descartarse en Inicio;
cerrar sesión/cambiar de cuenta limpia el contexto. Si sessionStorage está
bloqueado, la UI avisa y el traslado inmediato al formulario sigue funcionando.

Pruebas: `node scripts/maintenance/verify_planner_draft.mjs` verifica aislamiento,
caducidad, asociación, datos corruptos y almacenamiento bloqueado; el script
`verify_planner_resume_browser.js` pasa seis grupos visuales con API interceptada,
incluido retorno desde el espacio de capacidad, nueva revisión, descarte y móvil.
La asociación simula el guardado; no acredita habilitación ni ejecución real B.

La UI muestra pasos, conexiones y JSON completo. La transferencia al constructor
B es manual: Copiar propuesta → Workflows → Nuevo workflow → Campos de entrada
e importar propuesta → pegar → Cargar propuesta validada. Guardar, aprobar y
ejecutar son operaciones separadas. No se modificó el editor ni el motor de B.

Después de validar, A distribuye los nodos por niveles de dependencia, empezando
a la derecha de los datos iniciales, y separa los pasos paralelos verticalmente.
Así los valores por defecto del modelo no apilan pasos sobre la entrada. Solo
cambian coordenadas de propuestas nuevas; no se alteran workflows guardados.

Una definición válida no demuestra que resuelva el objetivo. `create` informa
piezas faltantes; no genera automáticamente sus implementaciones. Las preguntas
se resuelven ajustando el objetivo y volviendo a buscar.

## Verificación

`python -m unittest discover -s tests` desde backend: 145 pruebas pasan, veinte
del planner (diecisiete unitarias y tres de integración HTTP). Incluyen
consentimiento, huellas desactualizadas, selección ajena,
respuesta inconsistente, ciclos, puertos y dos versiones distintas con resolución
y validador B reales (repositorios/proveedor simulados, sin sandbox).
La integración HTTP conserva Auth/repositorios/filtros reales frente a un
transporte que deliberadamente entrega registros ajenos: opciones privadas
ausentes y selección ajena rechazada antes de invocar al modelo. No certifica RLS.

`npm run lint`, `npm run build`, auditoría de imports, `git diff --check` y siete
comprobaciones de dashboard pasan. Advertencia conocida de bundle >500 kB.
`scripts/maintenance/verify_planner_browser.js`: cinco grupos interceptados pasan,
incluido envío de huellas y vista móvil; no consume IA ni escribe datos reales.

Aceptación autenticada real: sesión Supabase verificada, búsqueda 200 y una
propuesta Gemini 200/reuse de un paso, importación en B con validación 200.
Guardada mediante UI con 201; definición idéntica al recargar y lectura propia
posterior. Workflow `f61664e5-939a-4939-af5d-d709c4cc2e2f`. No se aprobó ni ejecutó.

Composición real adicional: Gemini 200/compose, dos pasos reutilizando la MISMA
versión para limpiar título y cuerpo independientemente. Importación/validación
200, guardado 201 y reapertura desde UI conservando definición, campos y salidas.
Nombre: «Prueba planner A: título y cuerpo»; workflow
`de068ede-539c-485e-bc64-f50270bc3df3`. No demuestra transferencia entre dos
capacidades distintas ni ejecución funcional. Ambos procesos privados de prueba
quedan conservados en la cuenta; los procesos anteriores no se modificaron.
Capturas ignoradas en `output/playwright/planner-compose-{real,saved}.png`.

Privacidad posterior verificada realmente con segunda identidad: versión privada
ausente, selección forzada 409 antes de IA, workflows/runs privados de A devuelven
404 y no aparecen en los listados B. Pendientes: composición real de dos capacidades
distintas (la segunda candidata está preparada en ENTREGA_MARTES.md, aún no habilitada)
y ejecución de las propuestas en sandbox B con worker autorizado.
No crear cuentas, migraciones ni versiones para sustituir estas comprobaciones.
