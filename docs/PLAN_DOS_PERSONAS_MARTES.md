# Capacita — reparto entre dos personas y entrega del martes

Plan elaborado el 13/11/2026. Fecha objetivo interpretada: martes 17/11/2026, America/Bogota. Si la entrega usa otra fecha u horario, mover los hitos manteniendo el lunes previo como integración y estabilización. Este documento reparte trabajo futuro; ninguna tarea aparece completada por estar aquí.

## 1. Objetivo y límites del compromiso

Entregar una aplicación integrada que permita describir un objetivo, buscar capacidades internas, crear una pieza faltante mediante IA, probarla en aislamiento, revisar el plan, ejecutarlo, guardar resultados y reutilizar la capacidad desde otra cuenta.

La visión completa de `VISION_MAESTRA.md` se conserva. El plazo es muy exigente: el diagnóstico incluye Auth temporal en backend, datos en memoria y solo un adaptador mock. No hay evidencia suficiente para garantizar todos los módulos y conectores públicos en cuatro días. Este plan convierte la fecha en hitos verificables, expone dependencias y evita declarar terminado algo por tener una pantalla.

Supuestos de planificación: dos personas disponibles alrededor de 8–10 horas efectivas por día entre viernes y lunes, con herramientas de asistencia si las tienen; aproximadamente 32–40 horas por persona. Son supuestos de capacidad, no horas prometidas ni justificación para omitir descanso. Confirmar disponibilidad el primer día. Las estimaciones son orientativas y se recalibran con avances reales.

El martes queda para ensayo, presentación y correcciones de regresiones, no para la primera integración. Si un hito crítico falla, se comunica ese mismo día. No solventar atrasos simulando éxito, ejecutando código sin aislamiento o saltando permisos.

## 2. Personas y reparto equilibrado

Asignación confirmada por el usuario: **Miguel = Persona A** y **Fahida = Persona B**. Las referencias A/B del calendario, contratos y tablas corresponden a estos nombres. Ambos desarrollan frontend, backend y pruebas de su recorrido, con revisión cruzada Miguel ↔ Fahida.

### Persona A — Miguel: objetivos, catálogo y construcción de candidatos

Responsable del recorrido: usuario autenticado → necesidad → búsqueda interna → definición/plan → implementación candidata persistida.

Incluye frontend, backend, datos, IA y pruebas de sus módulos. Entrega contratos y candidatos que B puede probar y ejecutar. No implementa el sandbox.

### Persona B — Fahida: pruebas, workflows y ejecución

Responsable del recorrido: candidato/plan persistido → pruebas aisladas → habilitación → aprobación → ejecución → resultados e historial.

Incluye frontend, backend, sandbox, archivos, workflows y pruebas de sus módulos. Consume los contratos y repositorios publicados por A. No construye otro catálogo ni otro cliente de IA.

### Equilibrio por complejidad, no por número de pantallas

| Persona A | Puntos | Persona B | Puntos |
| --- | ---: | --- | ---: |
| A1. Identidad, datos y contratos comunes | 12 | B1. Sandbox, archivos y pruebas de candidatos | 15 |
| A2. Catálogo, búsqueda, detalle y publicación | 10 | B2. Motor persistente y estados | 12 |
| A3. Asistente, planner y generación | 18 | B3. Workflows visuales, composición y aprobación | 13 |
| A4. Perfil, dashboard y experiencia compartida | 5 | B4. Resultados, historial y conexión piloto | 5 |
| A5. Pruebas, integración y documentación | 5 | B5. Pruebas, integración y documentación | 5 |
| **Total** | **50** | **Total** | **50** |

Puntos relativos de trabajo y riesgo, no equivalen a horas. Sandbox y generación son los paquetes más inciertos; validar ambos el primer día. Si uno se bloquea más de dos horas, reasignar tareas independientes con dueño explícito: A puede asumir UI de historial o documentación mientras B resuelve infraestructura; B puede asumir formularios de detalle si A resuelve IA. No asumir modificaciones simultáneas de archivos compartidos.

## 3. Preparación conjunta — primera sesión, 60–90 minutos

Entregables, en este orden:

1. Asignar nombres a A y B; confirmar fecha, hora, modalidad y disponibilidad.
2. Cada persona usa su clon o worktree y su rama. Partir del mismo commit base conocido; conservar cambios locales de documentación y `.claude/` sin sobrescribirlos. No compartir una carpeta activa de trabajo entre dos procesos que editan las mismas rutas.
3. Comprobar accesos a GitHub, Supabase, cuenta de IA, embeddings y sandbox. No copiar secretos en documentos, commits ni chats. No activar facturación sin autorización.
4. A inspecciona esquema desplegado y prepara inventario; B prueba una ejecución mínima en sandbox. No ejecutar migraciones hasta explicar su efecto y revisar compatibilidad.
5. Congelar contrato inicial en `docs/CONTRATO_INTEGRACION.md` (pendiente de crear por A con revisión de B). Este documento de reparto contiene el borrador de ese contrato.
6. Guardar una entrada y resultado esperado de referencia para las pruebas de creación y ejecución. Debe ser un caso verificable y distinto de ejemplos memorizados por un mock.
7. Confirmar la ruta principal FastAPI/Supabase. Preservar trabajo .NET y migrar consumidores mediante tareas explícitas, sin borrar su backend.

Prueba de salida: ambas personas pueden iniciar frontend/API, conocer el contrato y llamar al endpoint de salud. Registrar errores iniciales sin atribuirlos a cambios nuevos.

## 4. Persona A — Miguel: tareas detalladas

### A1 — identidad, persistencia y contratos comunes

Archivos a inspeccionar/modificar: `backend/core/auth.py`, `visibility.py`, `config.py`, `backend/repositories/`, `backend/schemas/`, `src/services/supabase.js`, `src/api.js`, `.env.example`, `backend/.env.example`; migraciones nuevas en `db/` después de inspección.

Entregables:

- Validar realmente la sesión/token de Supabase en API; retirar identidades fijas. No confiar en un user_id enviado por el frontend.
- Preservar Login, Registro, OAuth y recuperación de sesión existente; comprobar cuenta/perfil asociados por UUID.
- Autorización pública/propia centralizada mediante la abstracción de visibilidad. RLS y controles backend coherentes, también al buscar y al leer versiones.
- Repositorios comunes persistentes con interfaces simples documentadas; eliminar la divergencia MOCK_DB/CAPACIDADES del recorrido real. No borrar mocks útiles de desarrollo indiscriminadamente.
- Modelos comunes CapabilityVersion, WorkflowDefinition, CandidateManifest y contratos JSON Schema de entrada/salida. A publica módulo de contratos para que B lo importe; no duplicar esquemas con nombres parecidos.
- Inventario del esquema real y migraciones aditivas, explicadas y revisadas. B entrega sus necesidades de runs, builds y workflows; A integra y aplica en el entorno autorizado.
- B accede a funciones documentadas para leer una versión autorizada, registrar un resultado de prueba y obtener definiciones persistidas. Fijar quién escribe cada entidad.
- Unificar base de URL y manejo de errores mediante `src/api.js`. Corregir mayúsculas de imports según sistema de archivos.

Aceptación:

- Token ausente/inválido no da acceso privado; UUID real llega al backend.
- Usuarios A/B no leen recursos privados ni versiones/código/archivos ajenos.
- Una capacidad creada puede ser consultada por el ejecutor desde el mismo repositorio, también tras reiniciar la API.
- Existe un documento de migración y un ejemplo de petición/respuesta; sin secretos.

### A2 — catálogo, búsqueda y publicación

Archivos: `backend/api/capabilities.py`, nuevo `backend/services/catalog_service.py`, `backend/services/search_service.py`, repositorios correspondientes; `src/pages/Capacidades/Capacidades.jsx`, `MisCapacidades.jsx`, `DetalleCapacidad.jsx`, tarjetas; `src/pages/Buscar.jsx`, `src/components/layout/BuscadorGlobal.jsx` y servicio frontend de catálogo.

Entregables:

- Mis capacidades/comunidad/detalle conectados a datos reales con carga, error y vacío.
- Búsqueda textual y semántica interna; registrar proveedor, dimensión y versión del embedding, y hacer backfill controlado de catálogo.
- Filtros de categoría, autor y tipo; paginación real si se expone cursor.
- Candidatos similares antes de crear; no filtrar capacidades privadas en resultados ni propuestas del modelo.
- Mostrar implementación/versión habilitada, estado, permisos, ejemplos y pruebas resumidas. Código fuente solo si licencia/visibilidad lo permiten; no confundir ejecución pública con código público.
- Publicar/despublicar y crear derivación con atribución; no duplicar capacidades por un cambio de parámetros.
- Una versión activa requiere evidencia de prueba emitida por B. A comprueba el estado persistido; la UI no puede autoaprobarla.

Aceptación:

- Recargar no pierde capacidades. Otra cuenta encuentra una publicada y no una privada.
- Consultas equivalentes recuperan candidatos relevantes; documentar el conjunto de pruebas. Si embeddings fallan, avisar y mantener búsqueda textual; no declarar semántica terminada.
- Un adaptador inexistente o versión sin habilitación no aparece ejecutable.

### A3 — asistente, especificación, planner y generación

Archivos propuestos: `backend/api/planner.py`, `backend/api/candidates.py`, `backend/services/planner_service.py`, `generation_service.py`, `backend/providers/`; `src/pages/Inicio.jsx`, nuevos componentes/servicios de asistente y definición de capacidades.

Entregables:

- Adaptador único del proveedor de IA para generación, planificación y embeddings cuando sean compatibles; modelos configurables y llamadas con tiempo máximo y cuotas.
- Sustituir plan fijo por comprensión del objetivo; preguntas cuando faltan reglas o entradas.
- Buscar catálogo antes de generar. Devolver decisión reuse/compose/create/clarify/blocked con explicación y referencias reales.
- Propuesta de workflow usando contratos de B, versiones fijadas y conexiones explícitas. No inventar ids ni dar por habilitada una capacidad nueva.
- Convertir descripción en contrato entendible y editable: entradas, salidas, parámetros, restricciones, permisos y casos.
- Generar candidato Python con un entrypoint acordado, manifiesto, dependencias permitidas y pruebas propuestas; guardar código/artefacto privado y hash.
- A crea un candidato con estado draft; B realiza construcción/pruebas. Solo B emite evidencia de habilitación. Cambios crean candidato nuevo con hash distinto.
- Reparación limitada a un número configurado de intentos; no reenviar datos sensibles completos en errores.
- Presentar faltantes de recursos honestamente. El modelo no solicita tokens directamente ni crea conectores arbitrarios.

Aceptación:

- Objetivos diferentes producen planes pertinentes o aclaraciones, no la misma secuencia fija.
- Una solicitud ya cubierta reutiliza capacidades sin generar código innecesario.
- Una solicitud no cubierta crea un candidato real y verificable que B puede ejecutar con el contrato acordado.
- JSON mal formado, respuesta inventada, timeout o cuota agotada no rompen la sesión ni se muestran como éxito.

### A4 — dashboard, perfil y navegación compartida

Archivos: `src/App.jsx`, `src/components/layout/`, `src/pages/Perfil.jsx`, `Configuracion.jsx`, `Comunidad.jsx`, `src/services/perfil.js`, backend de usuarios/estadísticas.

Entregables:

- Añadir navegación a pantallas B sin reescribir Auth/routing de golpe. B exporta sus páginas; A conecta secciones y parámetros.
- Perfil propio real, edición y avatar mediante storage autorizado. Evitar perfil distinto al usuario de sesión por fallback.
- Métricas reales de capacidades, workflows y runs; B provee datos de ejecuciones mediante repositorio/consulta definida.
- Comunidad con publicaciones reales y estados de servicio; retirar fallback silencioso a ejemplos del recorrido de entrega.
- Corregir hook condicional de MisCapacidades y advertencias en sus archivos. Quitar/inhabilitar con explicación acciones aún no implementadas.

Aceptación: navegación, recarga, atrás/adelante, logout y login funcionan; no números inventados ni datos de otra cuenta; no imports con capitalización inconsistente.

### A5 — verificación propia y cruzada

- Tests de autenticación, visibilidad, búsqueda, contrato de planner y selección sin ids inventados.
- Ejecutar y registrar lint/build de frontend tras integración; no escribir pruebas que solo repitan código.
- Revisar PRs de B, especialmente aprobación, estados y privacidad desde la perspectiva de consumo.
- Documentar ejemplos, variables sin secretos, decisiones de arquitectura y límites reales.

## 5. Persona B — Fahida: tareas detalladas

### B1 — sandbox, archivos y laboratorio de capacidades

Archivos: `backend/api/files.py`, nuevos `backend/api/builds.py`, `backend/services/build_service.py`, `sandbox_client.py`, `backend/runtime/` o servicio `runner/` separado; `src/pages/Capacidades/CrearCapacidad.jsx`, nuevos componentes de laboratorio/pruebas.

Entregables:

- Elegir y demostrar sandbox administrado con créditos confirmados o Linux con aislamiento reforzado. No dar por activo un proveedor por existir una oferta gratuita.
- Ejecutar función Python desde paquete de A mediante harness propio. El modelo no escribe configuración privilegiada de infraestructura.
- Entorno temporal por tarea, sin secretos, con red cerrada y paquetes preseleccionados; límites de tiempo, memoria, CPU, salida y procesos y limpieza comprobables.
- Subir/almacenar archivos privados de forma real; asociar propietario, tipo y tamaño; acceso mediante ids/URLs autorizados. No retornar un file_id sin almacenar.
- Validar sintaxis/manifiesto/dependencias y contratos de entrada/salida; aplicar pruebas independientes de las propuestas por IA.
- Estado persistente de build/test y reporte con evidencia, límites y fallos. Habilitación ligada al hash exacto probado.
- UI: laboratorio recibe candidate_id de A, permite probar entrada, ver reporte y habilitar/publicar según permisos. La generación del candidato sigue siendo responsabilidad de A.
- Cancelación/timeout y fallos del proveedor deben terminar en estado explícito; no dejar trabajos eternos.

Aceptación:

- Transformación real de texto/CSV/JSON no codificada como respuesta fija.
- Un bucle infinito se interrumpe; salida excesiva se limita; entorno no lee secretos ni archivos del host; no red no autorizada.
- Si no se puede probar aislamiento, no habilitar código generado para terceros. Escalar bloqueo de infraestructura ese mismo día, no sustituirlo por exec en FastAPI.
- Nueva versión modificada no hereda aprobación de una anterior; una salida incompatible falla la prueba.

### B2 — motor persistente y ejecuciones

Archivos: `backend/api/runs.py`, `backend/services/run_engine.py`, `backend/schemas/runs.py`, `backend/adapters/`; nuevos worker y repositorio de runs conforme a interfaces comunes.

Entregables:

- Ejecutor separado de API con cola/trabajador; elegir Celery/broker o trabajador persistente sencillo el viernes. Toda elección debe soportar estado durable y recuperación o fallo explícito tras reinicio.
- Resolver versiones autorizadas mediante repositorio A. Un único catálogo, sin listas paralelas ni adaptador mock en el recorrido real.
- Validar estado, contrato, permisos, recursos y entradas antes de iniciar. Volver a comprobar acceso al ejecutar.
- DAG secuencial, orden topológico y mapeo explícito de salidas a entradas; registrar entradas/salidas privadas por paso cuando corresponda.
- Ejecutar capacidades aprobadas y compuestas usando versiones fijadas; detectar dependencia circular entre compuestas.
- Estados consistentes y transiciones persistidas, manejo de errores y pasos omitidos; resultado parcial no se marca completed.
- Consulta de estado solo al dueño, duración, output y errores comprensibles; cancelar cuando sea viable o rechazar operación con explicación.
- Idempotencia al crear runs: repetir una petición con la misma clave del usuario no crea duplicados. Acciones externas requieren además reconciliación con proveedor.

Aceptación:

- Dos pasos reales transfieren información correctamente, incluso con parámetros no predeterminados.
- Entrada inválida, versión inactiva, permiso ausente o ciclo impiden iniciar.
- Reiniciar API no borra historial; reiniciar trabajador no deja estados ambiguos sin tratamiento.
- Otra cuenta recibe 404 para ejecución/resultado ajeno. No logs con contenido privado.

### B3 — workflows, composición y aprobación

Archivos propuestos: `backend/api/workflows.py`, `backend/services/workflow_service.py`, `workflow_validator.py`, repositorios correspondientes; `src/pages/Workflows.jsx`, `src/components/workflows/`; componentes de permisos y ejecución existentes.

Entregables:

- CRUD autorizado de workflows con contrato compartido; versión de definición y hash para aprobación.
- Editor React Flow: cargar propuesta de A, ver nodos/contratos, modificar parámetros, agregar/quitar pasos y conectar puertos.
- Guardar y recargar, validar en backend además de UI; no referencias a capacidades inexistentes.
- Aprobación sobre plan/versiones, entradas relevantes, destinos y permisos. Editar lo aprobado invalida aprobación.
- Encapsular workflow probado como capacidad compuesta mediante interfaz de catálogo A. B valida composición; A registra publicación/visibilidad.
- Guardar configuración de agente reutilizable: instrucciones, capacidades permitidas y preferencias, diferenciada de permisos OAuth. Puede reutilizar workflow y definición persistente sin crear otro motor autónomo.

Aceptación:

- Crear/modificar/guardar/reabrir un workflow mantiene conexiones y parámetros.
- Un ciclo o tipo incompatible se rechaza en API aunque se eluda la UI.
- Encapsular conserva dependencias/versiones; segundo usuario utiliza la compuesta pública sin ver inputs anteriores.
- UI nunca sustituye aprobación del backend con un checkbox sin efecto.

### B4 — resultados, historial y conexión piloto

Archivos: `src/pages/Ejecutar.jsx`, `src/services/ejecucion.js`, `src/components/runs/`, nueva página de historial; nuevos `backend/connectors/`, rutas de conexiones y UI correspondiente.

Entregables:

- Pantalla conectada con progreso real, error por paso, preview, copiar/descargar y enlaces cuando existan; polling actual puede conservarse para no añadir infraestructura de tiempo real antes de necesitarla.
- Historial persistente filtrado por usuario, detalle/reintento con nueva ejecución y métricas para dashboard A.
- Interfaz de conexiones, estado y permisos. Piloto de un proveedor solo si accesos están disponibles el viernes: preferir una única acción comprobable con cuenta de prueba, OAuth y aprobación exacta.
- Tokens protegidos, cuenta identificada y revocación. Código generado solo solicita operaciones controladas; no recibe secretos.
- Gmail, Instagram y Facebook se mantienen en la visión, pero revisión pública y permisos dependen del proveedor. No hay garantía de tener tres conectores públicos el martes.
- Si no hay acceso aprobado, documentar bloqueo y mostrar conexión no disponible; no simular envío/publicación. El recorrido central de generación/ejecución interna continúa.

Aceptación:

- Consultar tras reiniciar devuelve el mismo resultado persistido al dueño.
- Una acción externa solo se considera realizada con respuesta verificable del proveedor, id y cuenta destino.
- Revocación o cambio del contenido impide reutilizar autorización anterior; errores/reintentos no generan publicaciones duplicadas silenciosamente.

### B5 — verificación propia y cruzada

- Tests de aislamiento, límites, validación DAG, mapping, versiones y privacidad de archivos/runs.
- Pruebas de timeout, fallo de un paso, contrato de salida incorrecto y permisos incompletos.
- Recorrido Playwright o checklist reproducible para creación/prueba/ejecución; no usar cuentas personales con datos sensibles.
- Revisar PRs de A, especialmente contratos, generación y catálogo compartido.
- Documentar worker/sandbox, instalación y pasos para reproducir fallos, sin secretos.

## 6. Propiedad de archivos y prevención de conflictos

| Área/archivo | Dueño de edición | Cómo aporta la otra persona |
| --- | --- | --- |
| `src/App.jsx`, layout, navegación, `src/api.js` | A | B entrega páginas, servicios y rutas requeridas. |
| `src/pages/Inicio.jsx`, perfil, comunidad, búsqueda | A | B entrega contratos/estadísticas de ejecución. |
| Catálogo, detalle y lista de capacidades | A | B pide campos de estado de pruebas. |
| `CrearCapacidad.jsx` y laboratorio | B | A entrega componente/servicio de definición y candidate_id; B lo compone. |
| Workflows, ejecución, historial y conexiones | B | A incorpora navegación y revisa experiencia. |
| Auth y visibilidad comunes | A | B usa dependencia, nunca define usuario demo propio. |
| Router principal, configuración, requirements, package.json/lock, .env.example | A | B solicita dependencias/rutas y entrega los módulos ya listos. |
| Contratos comunes | A después de revisión conjunta | B propone cambios antes de alterar consumidores. |
| Servicios de catálogo/búsqueda/IA/generación | A | B consume interfaces documentadas. |
| Servicios de builds/sandbox/workflows/runs/conectores | B | A consume contratos y repositorios definidos. |
| Migraciones y esquema compartido | A | B entrega definición y revisa constraints/RLS de sus entidades. |
| Tablas/repositorios de workflows, builds y runs | B, con base de A | Interfaz de sesión/BD y contratos no se duplican. |
| Documentación de su frente y pruebas propias | Cada dueño | Revisar PR de la otra persona. |
| Este plan, continuidad y estado global | A como integrador | B entrega resumen escrito al cierre del bloque. |

Si hay que cambiar dueño, registrar transferencia antes de editar. No es necesario pedir permiso al usuario para cada cambio rutinario ya autorizado, pero el reparto actual solo autoriza planificar; implementar requiere la siguiente instrucción de trabajo.

## 7. Contrato de integración inicial — propuesta a congelar el viernes

Nada de esta sección describe endpoints ya implementados. A y B crean modelos, router y tests antes de conectar UI. Mantener envelope de `src/api.js`: `{ success, message, data }`, errores `{ detail }`, listas dentro de data como `{ items, next_cursor }`.

### Identificadores y estados

- IDs de entidades persistentes UUID, nombres separados; Auth UUID como propietario.
- CapabilityVersion: `id`, `capability_id`, `version`, `kind`, `input_schema`, `parameter_schema`, `output_schema`, `required_permissions`, `artifact_ref`, `artifact_hash`, `status`.
- `kind`: builtin, generated, composite, connector. Cada kind resuelve con ejecutor registrado; no importar artifact_ref como módulo del servidor.
- Candidato: draft → building/testing → changes_required/ready. Solo después de prueba/habilitación se crea o activa versión ejecutable; documentar transacción exacta.
- Workflow: definición versionada con nodes y edges, puertos nombrados, versión de capacidades fija, inputs externos declarados.
- Run: PREPARANDO/VALIDANDO/PERMISOS/EJECUTANDO/FINALIZANDO/COMPLETADO/ERROR/CANCELADO; alinear backend/UI/SQL. Registrar timestamps y distinguir estado de paso omitido.
- Estados de candidato, versión y run son distintos; no reutilizar un mismo campo para tres ciclos de vida.

### Paquete de candidato entre A y B

```json
{
  "candidate_id": "uuid",
  "artifact_ref": "private-reference",
  "artifact_hash": "sha256",
  "runtime": "python",
  "entrypoint": "main.run",
  "input_schema": {"type": "object"},
  "parameter_schema": {"type": "object"},
  "output_schema": {"type": "object"},
  "dependencies": [],
  "required_permissions": [],
  "proposed_tests": []
}
```

Interfaz propuesta en sandbox: `run(inputs: dict, parameters: dict) -> dict`. Datos serializables JSON; archivos mediante referencias resueltas por el harness a recursos autorizados, no rutas arbitrarias del host. Adaptadores existentes pueden envolverse para cumplir contrato sin reescribir todo.

B informa build_id, candidate_id, hash, estado, casos pasados/fallidos, límites y error sanitizado. El reporte visible no equivale a permiso para publicar: backend comprueba dueño, evidencia y política.

### Operaciones propuestas

| Operación | Dueño | Ruta orientativa |
| --- | --- | --- |
| Catálogo/CRUD/detalle/similares | A | `/capabilities`, `/capabilities/similar`, `/capabilities/{id}` |
| Definir objetivo/propuesta | A | `/planner/propose` |
| Crear/consultar candidato | A | `/candidates`, `/candidates/{id}` |
| Iniciar/consultar pruebas | B | `/builds`, `/builds/{id}` |
| Habilitar/publicar versión | A con evidencia de B | `/capabilities/{id}/versions/{version_id}/activate` y operación de visibilidad acordada |
| Crear/consultar/validar workflow | B | `/workflows`, `/workflows/{id}`, `/workflows/{id}/validate` |
| Aprobar plan concreto | B | `/approvals` |
| Subir entrada privada | B | `/files` |
| Crear/consultar/listar ejecución | B | `/runs`, `/runs/{id}` |
| Perfil/estadísticas | A | `/users/me` y endpoint de stats acordado |
| Conexiones | B | `/connections` y callbacks del proveedor |

Congelar payloads, códigos de estado, política de idempotencia y errores; alinear con APIResponse existente. Un endpoint anotado aquí no se utiliza desde frontend como si ya funcionara. OpenAPI puede actuar como contrato una vez generado por modelos reales.

## 8. Calendario con hitos y entregas cruzadas

Horarios objetivo de Bogotá, ajustables al confirmar disponibilidad. Cada integración se hace antes del cierre, con tiempo para corregir. Si la sesión empieza más tarde, replanificar explícitamente.

### Viernes 13 — quitar incertidumbre y fijar la base

| Hora objetivo | A | B | Evidencia conjunta |
| --- | --- | --- | --- |
| Primera sesión | Contratos, esquema y Auth | Contratos, sandbox y recursos | Nombres/asignación y contrato v1. |
| 14:00 | Token real y lectura persistente de catálogo | Función mínima real aislada y límites | Dos pruebas independientes; sin mocks como éxito. |
| 18:00 | Catálogo básico + candidato con formato acordado | Candidato fijo de fixture → sandbox → reporte | Integración técnica del paquete. Fixture es solo prueba de infraestructura. |
| 20:00 | Proveedor IA invocable y manifiesto real | Sandbox accesible desde trabajador | Decisión sobre viabilidad de generación real y permisos externos. |

Si no se confirma sandbox/IA el viernes: bloqueo crítico. Buscar opción gratuita autorizada o infraestructura universitaria; no diferirlo al lunes.

### Sábado 14 — primera capacidad creada y ejecutada realmente

| Hora objetivo | A | B | Evidencia conjunta |
| --- | --- | --- | --- |
| 12:00 | CRUD, detalle y búsqueda + definición estructurada | Archivos, pruebas y runs persistentes | Contratos compatibles con entradas reales. |
| 16:00 | Generación de candidato desde una solicitud | Laboratorio, reporte y ejecución de una capacidad | Entrada nueva produce salida calculada. |
| 19:00 | Crear/publicar desde estados reales | Revisión y habilitación por hash | Primer recorrido completo privado y persistente. |
| Cierre | Tests identidad/catálogo | Tests aislamiento/errores | Reinicio no pierde definiciones ni resultados. |

No esperar al domingo para conectar UI con API. Las simulaciones de desarrollo quedan señaladas y fuera del recorrido de aceptación.

### Domingo 15 — asistente, workflow y colaboración

| Hora objetivo | A | B | Evidencia conjunta |
| --- | --- | --- | --- |
| 12:00 | Planner con búsqueda y piezas faltantes | Workflow CRUD/validador y editor | Propuesta real se abre y guarda. |
| 16:00 | Generación integrada y reutilización | Mapping entre pasos y aprobación | Dos pasos reales y salida final correcta. |
| 19:00 | Publicación, derivación y búsqueda por otra cuenta | Capacidad compuesta e historial | Segundo usuario reutiliza sin ver datos privados. |
| Cierre | Perfil/dashboard reales | Conector piloto si autorizado | Demostración grabada del recorrido ya funcional. |

### Lunes 16 — integración completa y estabilización

- Mañana: A termina perfil, métricas, búsqueda y correcciones de interfaz; B termina resultados, historial, agente guardado y pendientes de ejecución.
- 14:00: todas las funciones comprometidas deben estar integradas en la misma rama de entrega. Revisar explícitamente las que dependen de terceros.
- 14:00–18:00: ejecutar matriz de pruebas con dos cuentas, datos no vistos, errores, reinicios y límites. Corregir fallos prioritarios.
- 18:00: ensayo completo en el equipo/red de presentación. Verificar cuentas, cuotas, archivos y disponibilidad de servicios.
- 20:00: congelar versión candidata, instrucciones de arranque y evidencia. Solo correcciones justificadas después; repetir pruebas afectadas.
- Si se requiere despliegue público, preparar y validar antes de este hito. Publicar requiere la autorización correspondiente; no sustituirlo por un enlace no probado.

### Martes 17 — entrega

- Arranque limpio y comprobación de sesión, BD, IA, sandbox y cuotas con antelación.
- Repetir una prueba corta de generación/ejecución. No consumir todos los créditos en ensayos.
- Usar casos explicables con datos no privados. Video del lunes como evidencia de respaldo, identificado como grabación y sin hacerlo pasar por ejecución en vivo.
- Presentar qué está operativo, qué está bloqueado por proveedor y cómo evoluciona la arquitectura. No estrenar integraciones ni migraciones durante la presentación.

## 9. Integración diaria y Git

- Dos ramas, una por persona. Ejemplos propuestos: `feature/persona-a-capacidades`, `feature/persona-b-ejecucion`; usar rama existente si corresponde tras revisar Git.
- No pushes directos a main. PR pequeños por bloque; revisión cruzada A ↔ B para este equipo de dos, que sustituye operativamente el círculo histórico de cuatro durante esta entrega.
- Integrar como mínimo mediodía y cierre: actualizar rama con cambios revisados, ejecutar pruebas afectadas y comprobar recorrido compartido.
- Dueño del archivo resuelve conflictos de su área, con revisión del consumidor si cambió contrato. No aceptar una versión de archivo completa sin examinar el conflicto.
- Mantener un tablero sencillo con Pendiente/En curso/En revisión/Verificado/Bloqueado y enlace a evidencia.
- Cada cierre deja: commit/PR, rutas modificadas, contrato cambiado, prueba y resultado, bloqueo y siguiente tarea. Actualizar estado y continuidad sin sobrescribir aportes de la otra persona.
- No incluir `.env`, tokens, archivos de usuarios, dependencias instaladas, salidas temporales ni `.claude/` por accidente.

## 10. Matriz conjunta de aceptación del lunes

| Caso | Responsable de conducir | Revisor | Resultado exigido |
| --- | --- | --- | --- |
| Registro/login/logout/recarga | A | B | Sesión real, perfil propio y rutas protegidas. |
| API sin token o con token inválido | A | B | Rechazo; nunca identidad demo. |
| Capacidad privada de otro usuario | A | B | 404 y sin filtración en búsqueda/planner. |
| Catálogo persistente | A | B | Creación/edición sobreviven reinicio. |
| Objetivo ya cubierto | A | B | Reutilización sin generación innecesaria. |
| Objetivo incompleto | A | B | Pregunta o recurso faltante, sin invención. |
| Generación nueva | A | B | Código/contratos reales y candidato persistido. |
| Prueba candidata y habilitación | B | A | Evidencia asociada a hash y dueño. |
| Código modificado tras prueba | B | A | Requiere prueba nueva. |
| Tiempo/memoria/salida excesivos | B | A | Límite aplicado y estado de fallo. |
| Archivo real y acceso ajeno | B | A | Contenido conservado, solo dueño accede. |
| Workflow con ciclo/puertos inválidos | B | A | API rechaza antes de ejecutar. |
| Transferencia entre dos pasos | B | A | Resultado correcto para datos nuevos. |
| Fallo intermedio | B | A | Paso identificado, sin éxito falso. |
| Aprobación de versión anterior | B | A | Invalida al cambiar plan/contenido. |
| Historial tras reinicio | B | A | Estados/resultados persistentes y privados. |
| Publicación y segundo usuario | A | B | Reutiliza capacidad; no datos ni credenciales del creador. |
| Capacidad compuesta | B | A | Contrato público y dependencias versionadas. |
| Métricas | A | B | Cambian según actividad real, sin contadores estáticos. |
| Servicio IA/sandbox indisponible | Cada dueño | Otro | Error claro; sesión conservada; sin fallback de éxito mock. |
| Conector piloto, si habilitado | B | A | Acción verificable aprobada, cuenta correcta, revocación. |
| Lint/build/arranque limpio | A | B | Comandos y resultados registrados; bloqueos explícitos. |

Ningún caso está aprobado por existir en esta tabla. Registrar estado y evidencia durante implementación.

## 11. Presupuesto, dependencias y riesgos

- Confirmar cuotas reales en cuentas antes de contar con ellas. No contratar planes ni activar cobro sin autorización.
- Reutilizar el mismo código preparado y limitar generaciones/reparaciones. Cerrar sandboxes al terminar y monitorizar consumo.
- Datos de ejemplo para desarrollar sí; respuestas ficticias como demostración de función terminada no.
- No añadir más de un framework de cola/agentes para resolver el mismo problema. Fijar dependencias y versiones compatibles.
- Bloqueos de proveedor (OAuth/revisión, acceso a GPU/modelo, cuotas) no se solucionan con horas de frontend. Anotarlos con fecha, responsable y alternativa real.
- La búsqueda semántica necesita modelo/dimensión consistentes; el catálogo pequeño no elimina esa dependencia.
- La seguridad del código generado es infraestructura crítica. Si no está lista, el hito diferencial no está completo y debe comunicarse, no ocultarse.
- La aplicación abierta a cualquier campo no implica que cada dependencia o proveedor exista ya. La interfaz explica recursos faltantes.

## 12. Inventario de cierre y entrega

Ambos entregan: código revisado, instrucciones de instalación/arranque, migraciones explicadas, variables de ejemplo sin secretos, pruebas/evidencia, lista de funciones verificadas y bloqueos, datos de demostración no privados y guion con dos usuarios.

Responsables: A reúne guía de producto y entorno común; B reúne guía de worker/sandbox y ejecución. Cada uno revisa que el otro pueda iniciar su parte sin instrucciones verbales adicionales.

El documento maestro, este reparto y el estado deben coincidir: visión, tareas y verificación son conceptos distintos. El compromiso operativo es llegar al lunes con todo integrado y usar el martes para entregar; cualquier desviación se detecta en los hitos diarios, no en la presentación.
