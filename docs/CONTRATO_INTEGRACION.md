# Contrato de integración A/B

Actualizado: 14/11/2026. Implementación local del frente A; pendiente revisión conjunta con Fahida. Las interfaces aquí implementadas no congelan los contratos futuros de candidatos, versiones, workflows o builds.

## Identidad y catálogo existentes

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

- A: proveedor IA, comprensión de objetivos, generación real y almacenamiento de candidatos/artefactos privados. Ninguna llamada a IA se realiza en este bloque.
- B: laboratorio, aislamiento, builds y evidencias. Una definición consistente no autoriza a ejecutar código.
- A/B: acordar y luego implementar CandidateManifest, CapabilityVersion y contratos de workflows/builds propuestos en el reparto. No utilizar endpoints futuros como si existieran.
- No activar publicación ni declarar una capacidad disponible hasta verificar implementación, versión y evidencia del ejecutor.

Validación local: pruebas HTTP con proveedor simulado cubren autenticación, privacidad de coincidencias, contratos/ejemplos inválidos, límites, búsqueda previa al guardado, 409 sin reconocimiento de coincidencias y persistencia/clonado privado del paquete. Falta validación autenticada de este nuevo flujo contra Supabase real.

32 pruebas HTTP en total pasan; lint/build pasan con advertencia de tamaño de bundle. Playwright verificó el componente en un navegador aislado con respuestas interceptadas, incluido guardado simulado, invalidación al editar, JSON mal formado, parámetro entero y móvil. Esto no certifica persistencia remota ni ejecución de una implementación. La API local reiniciada expone ambas rutas y responde 401 sin token con CORS correcto.
