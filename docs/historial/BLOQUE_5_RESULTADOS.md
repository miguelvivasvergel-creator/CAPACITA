# Bloque 5 — resultados e historial privados

Autorizado por Fahida el 16/11/2026. Sigue la numeración del laboratorio B:
B4 workflows, B5 resultados/historial y B6 integración final. No equivale al
apartado B5 del plan inicial entre personas.

## Comportamiento

- **Mis ejecuciones**, en navegación y menú del usuario, abre `#historial`.
- `#historial/UUID` abre una ejecución propia y funciona tras recargar.
- Lista paginada de capacidades y workflows, estado y fecha. Actualizar reemplaza
  la lista; cargar más añade filas sin duplicarlas. Un error no se presenta como
  historial vacío ni activa datos de ejemplo.
- Detalle: versión o workflow/revisión, fechas, progreso, motivos de fallo,
  pasos omitidos y resultados parciales persistidos. No inventa un porcentaje
  de trabajo ni estima una hora de finalización.
- Consultas cada 2,5 segundos mientras la ejecución está pendiente y la pestaña
  visible; se detienen al terminar, fallar la consulta o salir. Actualizar estado
  permite consultar de nuevo. AbortController descarta respuestas tras navegar.
- Copiar y descargar exportan el resultado final como JSON con acentos; no
  interpretan HTML, enlaces ni rutas escritas por el código generado.
- Otra ejecución de una versión requiere introducir datos/opciones nuevos y
  confirmar. Mantiene una clave de idempotencia ante un error de transporte;
  editar los datos prepara otra solicitud. El backend revalida la versión y los
  contratos. Una versión deshabilitada conserva historial pero rechaza uso nuevo.
- Para workflows se abre la **revisión actual** en el editor, sin recuperar una
  aprobación anterior. Hay que revisar y aprobar los datos de nuevo. No promete
  repetir una revisión histórica ni conservar entradas que la API no expone.

## Integración y límites

Reutiliza `GET /api/runs?limit=20&cursor=UUID`, `GET /api/runs/{id}` y el POST
existente por versión. No necesita SQL ni worker nuevos, ni repetir SQL 07/08.
Las rutas conservan JWT, comprobaciones de propiedad y 404 para acceso ajeno.
No se guarda historial en localStorage ni se usa una identidad de demostración.
La fixture `src/mocks/historial.js` solo se importa desde pruebas.

Entrega de navegación para Miguel: una importación y sección `historial` en
`App.jsx`, página por UUID con key de ruta, enlace en Navbar/menú y parámetro
`workflowId` para abrir el editor desde el historial. Estos archivos compartidos
requieren reconciliación con su rama en B6; no se ha mezclado `origin/miguel`.

Revisión visual detectó que la barra móvil superponía la segunda fila al título
y recortaba botones. Se corrigió su altura en flujo y el espacio de búsqueda:
en pantallas menores de 1536 px, Buscar abre su página; el buscador desplegable
se mantiene en pantallas amplias. Capturas finales con Navbar revisadas en 390/1280.

Sin publicación de compuestas, planner, conectores, métricas globales ni soporte
nuevo de archivos. B6 conserva la revisión y aceptación del conjunto A/B.

## Validación

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -t backend
npm.cmd run lint
npm.cmd run build
.\.venv\Scripts\python.exe scripts/maintenance/verify_history_ui.py
.\.venv\Scripts\python.exe scripts/maintenance/verify_history_remote.py --protected-run UUID_DE_OTRA_CUENTA
```

La prueba visual abre Chrome con perfiles temporales de escritorio 1280 y móvil
390. Intercepta HTTP con fixtures: paginación/deduplicación, contenido escapado,
copia/descarga, parciales/omitidos, datos JSON inválidos, confirmación y misma
clave tras fallo de transporte, polling, reapertura, vacío/error y workflow
reabierto sin aprobación. No usa la sesión del usuario ni Supabase.

La prueba remota solo lee con la cuenta worker: paginación de dos en dos sin
duplicados, detalle idéntico a lista, workflow completado y otro interrumpido con
parciales; ejecución ajena ausente y GET 404. No reclama ni modifica trabajos ni
consume IA. Reporte ignorado `output/laboratory/block5-history-remote.json`.
La persistencia tras reiniciar API está acreditada por las pruebas reales B3/B4;
no se reinició el servicio ni se alteró el proceso de Fahida para B5.

No confundir la prueba visual simulada con una sesión real de Fahida en la nueva
página. Esa comprobación de uso y las pruebas del conjunto con Miguel quedan
para la aceptación integrada B6.
