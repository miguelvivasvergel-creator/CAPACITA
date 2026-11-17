# Búsqueda autorizada — frente A

15/11/2026. Autocompletado y Buscar usan FastAPI. .NET queda conservado e
inactivo. No modifica workflows, versiones, builds ni ejecución de Fahida.

Actualización 16/11: SearchRequest acepta category, owner (username) y data_type.
Son filtros de capacidades ejecutados en servidor, conservados en URL y páginas.
La categoría es coincidencia exacta, tipo aplica a entrada o salida; las personas
se buscan por la consulta. Semántica incorpora filtros al fingerprint del cursor
y revalida autor/tipo después de inferencia. Lectura real con los tres filtros
recupera la capacidad propia esperada. El planner también consume esta semántica
local de forma explícita; no se modifican los contratos B.

## Recorrido y API

Autocompletado textual con detalle/perfil reales. Buscar ofrece texto/significado
local, filtro propio/comunidad/visible, pestañas y páginas independientes de
perfiles/capacidades. Método/alcance se conservan en el hash al navegar. Los
errores no producen mocks ni cambian de método sin acción explícita.

POST /api/search exige sesión: query (2–200 caracteres), mode (text/semantic),
scope (available/mine/community), kind (all/capabilities/profiles), limit (1–50),
capabilities_cursor y profiles_cursor. Responde capabilities/profiles como
{items,next_cursor}, mode, semantic_available, semantic_scanned,
semantic_truncated y workflow_search_available=false. GET /api/search/status
informa disponibilidad local/límite. Frontend solo usa src/api.js. POST evita
consultas en logs HTTP de URLs; el hash del navegador sí contiene la búsqueda.

Personas: username/display_name/bio y campos públicos explícitos, sin email ni
contadores inventados. Capacidades: visible_to en origen/resultados. Semántica
recupera filas autorizadas y revalida las seleccionadas tras inferencia; cambio
o revocación devuelve 409. Cursor ligado a usuario/consulta/alcance/modelo y
hashes del catálogo. Workflows pendientes del contrato B.

## Semántica local y límites

Xenova/multilingual-e5-small, revisión 761b726dd34fb83930e26aab4e9ac3899aa1fa78.
Dos archivos ONNX cuantizado/tokenizador, unos 136 MB, SHA-256 fijo validado al
cargar. CPU con dos hilos, query/passage, mean pooling, L2, 384 dimensiones y
máximo 512 tokens por texto. Sin torch, proveedor remoto, cuota Gemini ni envío
de consultas/catálogo. API no descarga modelos durante una petición.

**Solo las primeras 200 capacidades autorizadas por UUID.** API/UI indican
truncado si hay más. Es una primera implementación para catálogo pequeño,
no el índice pgvector global de la arquitectura futura. Similitud es sugerencia,
sin umbral universal de equivalencia: no demuestra contratos compatibles,
corrección, implementación ni habilitación.

Caché output/search/embeddings.sqlite3: vector/id por usuario/modelo/hash de
nombre-descripción-categoría; no guarda consultas, descripciones crudas, código,
ejemplos ni tokens. Hasta 2000 entradas por usuario, operaciones por lotes y
conexiones cerradas. Caché nunca concede permisos: se consulta catálogo otra vez.
Es local, no cifrado/compartido ni respaldo remoto; administrador del equipo
puede inspeccionarlo. Todo output/search está ignorado por Git. Sin SQL nuevo.

Una inferencia por proceso; otra recibe 429 sin bloquear texto. Cancelar el
navegador no para inmediatamente trabajo nativo iniciado; recargas rápidas
pueden requerir reintentar. Primera carga más lenta. Modelo ausente/fallido
devuelve error y permite elegir texto explícitamente, sin fallback oculto.

## Instalar y verificar

Estos extras requieren Python 3.12 o posterior por la versión fijada de NumPy.
Después de instalar backend/requirements.txt, desde raíz:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-search.txt
.\.venv\Scripts\python.exe scripts/maintenance/setup_search_model.py
```

Reiniciar API. Texto funciona sin esos extras. Descarga fija verificada por
tamaño/hash, nunca una URL aportada por una petición.

104 pruebas backend pasan (14 nuevas), siete grupos visuales interceptados y
seis casos reales E5 español/inglés, 6/6 primeros resultados esperados; no prueba
precisión universal. A real: semántica 200 sobre siete filas, Quitar fondo
primero para aislar persona de fotografía, sugerencias abren capacidad/perfil,
móvil sin desborde. B: privada A ausente en texto/semántica, cuatro visibles,
perfil público encontrado y GET privado ajeno 404. Sin registros de negocio nuevos.

```powershell
.\.venv\Scripts\python.exe scripts/maintenance/verify_search_model.py
npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-a run-code --filename scripts/maintenance/verify_search_browser.js
```

Fuentes: [modelo/prefijos/pooling](https://huggingface.co/intfloat/multilingual-e5-small),
[ONNX](https://huggingface.co/Xenova/multilingual-e5-small),
[runtime](https://pypi.org/project/onnxruntime/),
[tokenizador](https://pypi.org/project/tokenizers/).
