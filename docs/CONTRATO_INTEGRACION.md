# Contrato de integración A/B

Actualizado: 14/11/2026. Implementación local del frente A; pendiente revisión conjunta con Fahida. Las interfaces aquí implementadas no congelan los contratos futuros de candidatos, versiones, workflows o builds.

B4 autorizado por Fahida el 15/11/2026: [contrato de workflows privados](BLOQUE_4_WORKFLOWS.md)
implementado localmente con revisiones, aprobación y puertos nombrados, sobre B3.
SQL 08 aplicado por Fahida y protocolo 2 activo. Aceptación técnica remota con
fixture propia pasó; recorrido de usuaria pendiente. Worker protocolo 1 omite
workflows. No integra planner ni registra
capacidad compuesta pública en catálogo A; esa entrega se coordina por contrato.

Actualización B3 (15/11/2026): Fahida confirma acuerdo con Miguel sobre builds
compartidos en Supabase y versiones privadas habilitadas explícitamente. Contrato
implementado localmente en [BLOQUE_3_EJECUCION.md](BLOQUE_3_EJECUCION.md): `/builds`
con almacenamiento configurable, `/versions`, `/runs` por version_id e idempotencia.
SQL 07 aplicado por Fahida y aceptación privada remota completada: recorrido
manual, persistencia, privacidad y verificador remoto con recuperación real.
Revisión técnica conjunta A/B pendiente. Las notas históricas de ausencia de
sandbox/builds siguientes no describen el estado actual B. No cambia el contrato
CandidateManifest ni publica/edita el catálogo de A.

## Identidad y catálogo existentes

Actualización de cierre: usuario confirmó SQL 06 (true,true,false,false) y generación/guardado/recarga del candidato 452d1c47 con mismo código/hash. No repetir SQL. Fahida aún no tiene sandbox; no hay ejecución/habilitación. Las notas de SQL pendiente más abajo describen la preparación inicial y quedan superadas por esta confirmación. Total actual: 62 pruebas locales, lint/build y roundtrip correctos. Nuevo flujo de objetivos descrito al final.

- Consumir FastAPI desde `src/api.js`; envelope `{success, message, data, timestamp}`, errores `{detail}`, listas en `data: {items, next_cursor}`.
- Toda operación nueva usa el usuario verificado por `get_current_user`. No aceptar propietario de la petición ni usar credenciales de servicio en código generado.
- `CapabilityRepository` usa token de usuario y clave pública. Sus lecturas pasan por `visible_to`; otra cuenta recibe 404 para una fila privada.
- Catálogo: `GET /api/capabilities` y `GET /api/capabilities/{uuid}`. Los registros actuales no son versiones ejecutables.

## Definición estructurada implementada localmente

Componente A: `src/components/capabilities/DefinirCapacidad.jsx`, export por defecto. Recibe `onGuardado(capacidad)` tras una respuesta exitosa del backend. La página A `Capacidades.jsx` lo muestra en Crear. No se modificó el archivo de laboratorio B `CrearCapacidad.jsx`; B puede reutilizar este componente/servicio al integrar su estudio.

Servicio frontend: `src/services/definiciones.js`. Modelo común backend: `schemas.definitions.CapabilityDefinition`.

Organización: las transformaciones sin red del formulario viven en `src/utils/definiciones.js`; la validación reutilizable en `backend/services/contract_validation.py`; `definition_service.py` coordina validación, búsqueda y guardado. Las fixtures del proveedor simulado viven en `backend/tests/fixtures/supabase_catalog.py`.

| Operación | Petición | Resultado |
| --- | --- | --- |
| Revisar sin guardar | `POST /api/capabilities/definitions/check` con `CapabilityDefinition` | `definition`, `definition_hash`, `matches: {items, next_cursor}`, `search_kind: "text"`, `implementation_verified: false`. |
| Guardar definición | `POST /api/capabilities/definitions` con `{definition, acknowledge_similar: false}` | HTTP 201, `data` es una capacidad privada/draft con UUID y propietario asignados por backend. |

Ambas rutas requieren sesión. Guardar vuelve a validar ejemplos/contratos y a buscar coincidencias autorizadas, incluso si el cliente no llamó a check. Si hay coincidencias y no se indicó `acknowledge_similar: true`, devuelve 409 sin insertar. Esa confirmación expresa una definición distinta; no es aprobación de permisos ni de ejecución. La búsqueda es textual por nombre, hasta cinco resultados y cursor; no es equivalencia funcional, cobertura semántica ni decisión automática de reutilización. Puede clonarse una coincidencia como borrador mediante la ruta existente.

### Payload

```json
{
  "name": "Normalizar espacios",
  "description": "Quita espacios en los extremos y conserva los acentos.",
  "category": "Texto",
  "input_type": "texto",
  "output_type": "texto",
  "input_schema": {
    "type": "object",
    "properties": {"texto": {"type": "string"}},
    "required": ["texto"],
    "additionalProperties": false
  },
  "parameter_schema": {
    "type": "object", "properties": {}, "additionalProperties": false
  },
  "output_schema": {
    "type": "object",
    "properties": {"resultado": {"type": "string"}},
    "required": ["resultado"],
    "additionalProperties": false
  },
  "constraints": ["Conservar los espacios interiores"],
  "required_permissions": [],
  "resources": [],
  "failure_cases": ["Rechazar entradas sin texto"],
  "examples": [{
    "inputs": {"texto": "  Árbol  "},
    "parameters": {},
    "expected_output": {"resultado": "Árbol"}
  }]
}
```

Los ejemplos son especificaciones del usuario; no resultados calculados. Se comprueban tipos, campos y reglas del contrato, sin ejecutar implementación alguna. No introducir secretos ni datos personales en ejemplos que vayan a enviarse a un modelo o compartirse en el futuro.

### Contratos y límites

Se usa JSON Schema 2020-12 mediante jsonschema 4.26.0: [documentación oficial](https://python-jsonschema.readthedocs.io/en/stable/validate/). Raíces de entrada/parámetros/salida de tipo object, coherentes con el futuro `run(inputs: dict, parameters: dict) -> dict`.

Subconjunto admitido: tipos simples, properties, required, additionalProperties, items, enum/const/default, títulos/descripciones y límites numéricos/de longitud/de cantidad. No se admiten `$ref`, patrones regex, format ni composición allOf/anyOf/oneOf. No se resuelven URLs. Los defaults son anotaciones: no se rellenan parámetros automáticamente. El editor visual ofrece campos de un nivel, listas con un tipo de elemento y objetos internos libres; el backend admite estructuras anidadas dentro de este subconjunto.

Límites del servicio: 64 KiB por definición serializada, 2048 nodos, profundidad 20, 64 propiedades por objeto y 1–10 ejemplos. Las listas de restricciones, permisos, recursos y errores admiten hasta 20 elementos de 500 caracteres. Los ejemplos deben ser objetos JSON finitos. Errores 422 no incluyen valores de ejemplo en mensajes del servicio.

`definition_hash` es SHA-256 de la definición normalizada con claves ordenadas. Cambiar restricciones, contratos o ejemplos cambia el hash. No es firma, evidencia de build ni autorización: `config` es contenido del borrador, no una fuente de confianza para habilitar versiones. El futuro pipeline debe revalidar y ligar sus propios artefactos/pruebas al hash adecuado.

## Persistencia sin nueva migración

Se reutiliza `public.capabilities` y los permisos 04/05 ya aplicados por el usuario:

- `input_schema` y `output_schema`: columnas existentes.
- `permissions`: copia declarativa de `required_permissions`; no concede scopes.
- `config.definition`: `format_version: 1`, `definition_hash`, `parameter_schema`, `constraints`, `resources`, `failure_cases`, `examples`.
- `visibility=private`, `status=draft`, `adapter_key=null`. No se aceptan id, owner_id, status, config ni adapter_key desde el payload de definición.

Clonar conserva esquemas y config. No se modifican filas previas. No hay nueva tabla de candidatos ni candidato_id; el UUID retornado es el de la capacidad borrador.

## Pendiente para B y para el siguiente bloque A

### Preparación local de candidato Python (14/11/2026)

Implementados `schemas.candidates.PythonSourceProposal`, `CandidateManifest` y `services.candidate_preparation.prepare_candidate(capability_id, definition, proposal)`. Pendiente revisión de Fahida. La preparación es una función interna; el nuevo bloque siguiente añade proveedor/API/repositorio y panel. El almacenamiento remoto requiere SQL 06, todavía no aplicado.

El paquete incluye UUID de candidato/capacidad, definición completa (contratos, permisos declarativos y ejemplos), código en `proposal.source`, dependencias vacías, runtime Python, entrypoint `main.run`, hash de definición y hash del artefacto. Solo admite estado draft e implementation_verified=false. El primer entorno declara únicamente biblioteca estándar; esto no inspecciona imports ni demuestra aislamiento.

Preparación: revalida definición/ejemplos, limita código a 64 KiB UTF-8 y analiza sintaxis con AST. Exige una función síncrona `run(inputs, parameters)` sin decoradores, valores por defecto ni argumentos adicionales. No importa, compila ni ejecuta el código. La revisión sintáctica no demuestra seguridad, cumplimiento de restricciones ni corrección funcional.

Hash SHA-256 del JSON UTF-8 con ensure_ascii=false, allow_nan=false, sort_keys=true y separadores compactos, de `{format_version: 1, runtime: "python", entrypoint: "main.run", definition: <model_dump JSON>, proposal: <model_dump JSON>}`. Conserva código exacto y excluye ids/estado. B debe revalidar contenido y recalcular hash antes de vincular evidencia; ni los hashes ni los campos de estado recibidos habilitan ejecución. Objetos anidados pueden mutar en memoria: verificar al persistir y al consumir.

La preparación inicial añadió seis pruebas (38 en ese bloque). El bloque siguiente eleva el total a 52 pruebas. Builds y ejecución aislada siguen pendientes; no hay artifact_ref de almacenamiento de archivos: el artefacto es el JSON manifest inmutable de la tabla privada, leído mediante API autorizada.

### Generación Gemini y candidatos privados (bloque posterior a 711eacf)

Implementación local A: proveedor `providers/gemini.py`, orquestación `services/candidate_generation.py`, repositorio `repositories/candidates.py`, router `api/candidates.py` y panel `CandidatosCapacidad.jsx` dentro del detalle de borradores privados propios con definición estructurada. No se modifica laboratorio B. Consumir siempre mediante `src/api.js` y `src/services/candidatos.js`; mocks solo de desarrollo y nunca fallback.

| Operación | Resultado |
| --- | --- |
| POST /api/capabilities/{id}/candidates/check | Sin IA: definición vigente/hash y coincidencias textuales autorizadas, excluyendo origen; preflight de tabla con cero filas. |
| POST /api/capabilities/{id}/candidates | Petición `{definition_hash, acknowledge_similar, consent_to_provider}`. Búsqueda y validación nuevas; una llamada IA y guardado privado. HTTP 201 con CandidateResponse. |
| GET /api/capabilities/{id}/candidates?limit=20&cursor=uuid | Lista propia `{items, next_cursor}`, orden id.asc, límite 1–100. |
| GET /api/candidates/{id} | CandidateResponse del dueño; ajeno/inexistente 404. |

CandidateResponse: `{id, capability_id, manifest: CandidateManifest, provider: "gemini", model, created_at}`. El id coincide con manifest.candidate_id. El manifest contiene definición completa y proposal.source/dependencies, sin credenciales. Cada generación guarda una fila nueva; no actualiza el catálogo, no marca capacidad disponible ni modifica candidatos anteriores. El hash y estado de la definición se revalidan antes y después de IA. No se guarda una respuesta si cambió la definición durante la llamada. No hay reintentos automáticos ni promesa de idempotencia ante reintentos manuales después de una respuesta perdida.

SQL preparado: `db/06_private_candidates.sql`, NO aplicado. Crea capability_candidates con UUID, dueño FK profiles, origen FK capabilities, manifest JSONB y proveedor/modelo/fecha. RLS SELECT/INSERT solo del dueño; INSERT exige origen propio/private/draft; sin UPDATE/DELETE para authenticated/anon, sin publicación ni estados de habilitación. Índices por owner/id y capability/id; cambios a este esquema requieren revisión A/B. Tabla existente provoca parada para inspección, no se sobrescribe. Hasta aplicar y verificar, la aplicación falla antes de consumir IA por falta de almacenamiento. Validación de permisos esperada: true,true,false,false; faltan prueba PostgreSQL/RLS real y dos cuentas.

El usuario tiene acceso INSERT directo por RLS: un manifest o texto provider/model insertado por su dueño NO es evidencia emitida por el laboratorio. B debe validar el paquete, recalcular hashes y emitir sus propios registros de build/pruebas ligados al contenido. No confiar en el estado recibido para habilitar o publicar. La ejecución experimental también requiere sandbox; el API no importa ni ejecuta source.

Gemini: clave SecretStr solo backend, URL fija oficial, modelo configurable (por defecto gemini-4-hydrogen), una respuesta JSON, sin herramientas ni ejecución del proveedor, timeout 45 s, máximo 4096 tokens y 256 KiB de respuesta. Definiciones con recursos/permisos externos se bloquean para este primer entorno. Prompt solicita biblioteca estándar, pero AST no demuestra que se cumpla ni sustituye aislamiento. 429/errores del proveedor se traducen a 503 (nunca 401 de usuario); respuestas incompletas/inválidas a 502. No se imprimen cuerpos o credenciales.

El panel requiere confirmación de definición/ejemplos sin datos privados y envío a Google. La cuota gratuita concreta y facturación se revisan en la cuenta; no se activó cobro. Límites locales por proceso: 30 s entre intentos, máximo 10/hora y una generación simultánea por dueño. Los fallos consumen intento; reiniciar borra contadores. Antes de múltiples workers o exposición pública se necesita cuota durable/compartida. El control local no limita la factura del proveedor.

Evidencia real: metadatos 200; un ejemplo público produjo 509 bytes de código y hash válido, sin ejecutar ni guardar. 52 pruebas locales totales; HTTP/proveedor simulado cubren búsqueda previa, consentimiento, propiedad/404, preflight sin cuota, guardado/relectura simulados, hashes obsoletos, cambios durante generación, paginación, límites y errores. Lint/build correctos. Persistencia de candidatos e interfaz completas todavía no verificadas con Supabase real. El usuario confirmó por separado persistencia del formulario de definición.

- A: comprensión de objetivos/planner y verificación real del flujo persistente de candidatos después de SQL 06. Generación Gemini aislada ya probada; aún no equivale a habilitación.
- B: laboratorio, aislamiento, builds y evidencias. Una definición consistente no autoriza a ejecutar código.
- A/B: acordar y luego implementar CandidateManifest, CapabilityVersion y contratos de workflows/builds propuestos en el reparto. No utilizar endpoints futuros como si existieran.
- No activar publicación ni declarar una capacidad disponible hasta verificar implementación, versión y evidencia del ejecutor.

Validación local de definición: pruebas HTTP con proveedor simulado cubren autenticación, privacidad de coincidencias, contratos/ejemplos inválidos, límites, búsqueda previa al guardado, 409 sin reconocimiento de coincidencias y persistencia/clonado privado del paquete. El usuario confirmó posteriormente guardado/recarga/detalle de definición contra Supabase real. La persistencia de candidatos de generación sigue pendiente de SQL 06 y prueba autenticada.

El bloque inicial de definición tuvo 32 pruebas HTTP y Playwright aislado con respuestas interceptadas. El usuario confirmó después la persistencia real de definición y candidato. Esas pruebas visuales iniciales no cubren el nuevo intérprete ni ejecución de código. La cifra actual es 62 pruebas locales, con advertencia conocida de tamaño de bundle.

## Interpretación de objetivos (bloque de cierre)

POST /api/objectives/interpret, con sesión, recibe `{objective, clarifications: [{question, answer}], consent_to_provider}`. Objetivo 10–2000 caracteres, hasta 6 respuestas (pregunta hasta 500, respuesta hasta 1000). Busca primero frase/términos relevantes (hasta cuatro consultas, seis filas cada una) con visible_to en origen/resultados; después busca también por nombre si hay definición. Hasta 20 coincidencias deduplicadas, search_queries, search_kind=text y search_truncated. next_cursor=null en esta agregación: ampliar en catálogo. No es búsqueda semántica ni selección automática de versiones disponibles.

Gemini recibe únicamente objetivo/respuestas consentidos: nunca resultados del catálogo, secretos ni tokens. Devuelve clarify (hasta tres preguntas), blocked o define (borrador visual). Formato de hasta 16 campos por grupo, un ejemplo y contratos de un nivel/listas de un tipo/objetos internos libres, compatibles con el editor actual. Se validan decisión, campos, contratos y ejemplos en backend. Respuesta: interpretation, definition/hash opcionales, matches e implementation_verified=false. No escribe filas ni genera código, candidatos, versiones o workflows.

El esquema anidado enviado como responseJsonSchema fue rechazado HTTP 400 en prueba real. Para interpretación se usa modo application/json con esquema en instrucciones y validación local estricta, sin reintentos automáticos. Generación de código conserva responseJsonSchema. Prueba real posterior: define y contratos/ejemplo válidos. No afirmar que modo JSON garantice por sí solo el esquema.

UI en Crear: consentimiento, aclaraciones, coincidencias clonables como borrador y **Usar propuesta en el formulario**. Esa acción explícita reemplaza campos y obliga a comprobar/guardar con las rutas existentes. Roundtrip probado con listas, objetos y campos opcionales. Límites compartidos con generación: 10 intentos/hora, 30 s y uno simultáneo por dueño, solo por proceso. No requiere migración nueva.

10 pruebas nuevas cubren sesión/consentimiento, búsqueda antes de IA, no envío de catálogo, privacidad simulada, aclaraciones/bloqueo, ejemplos inválidos, duplicados, límites e historial. Falta recorrido completo con sesión en navegador y privacidad real de candidatos con segunda cuenta. Es comprensión para definir una capacidad, no planner de workflows. Guía B en ENTREGA_A_B_CANDIDATOS.md.
