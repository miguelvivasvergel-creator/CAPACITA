# Miguel (A): identidad y catálogo

Actualizado: 14/11/2026. Guía vigente; [reporte anterior](historial/MODULO_A_2026-11-14.md) conservado como historial.

## Responsabilidad e identidad

Miguel: identidad, catálogo, búsqueda, definición y generación. Fahida: laboratorio, pruebas aisladas, workflows y ejecución. [Plan A/B](PLAN_DOS_PERSONAS_MARTES.md) y [contrato de definición](CONTRATO_INTEGRACION.md), pendiente revisión conjunta.

- Token Bearer verificado en /auth/v1/user; perfil real public.profiles, display_name/bio.
- Clave pública y token de usuario; no service_role, identidad demo ni JWT decodificado sin verificar.
- CapabilityRepository lee PostgREST con visible_to en origen/resultados y RLS. Privado ajeno 404; editar/borrar pública ajena también 404.
- No persistir perfiles mutando get_current_user: rutas heredadas de perfil/avatar no equivalen a persistencia real.

## API de catálogo

Sesión obligatoria. Envelope {success, message, data, timestamp}; errores {detail}; listas en data con {items, next_cursor}.

| Operación | Ruta | Comportamiento |
| --- | --- | --- |
| Listar/buscar | GET /api/capabilities | scope mine/community/available; q/type/owner; paginación UUID. |
| Similares | GET /api/capabilities/similar?name=... | Textual; no equivalencia funcional ni semántica. |
| Detalle | GET /api/capabilities/{uuid} | Fila visible para la sesión. |
| Crear | POST /api/capabilities | UUID/propietario asignados por backend; borrador. |
| Clonar | POST /api/capabilities/{uuid}/clone | Privado/draft con origen, contratos y config; no altera autor original. |
| Editar | PUT /api/capabilities/{uuid} | API implementada/probada en simulación; UPDATE remoto no habilitado. |
| Eliminar | DELETE /api/capabilities/{uuid} | API implementada/probada en simulación; DELETE remoto no habilitado. |

Publicar devuelve 409 hasta tener versiones con implementación/evidencia verificada. Ni status, adapter_key ni config acreditan ejecución. Sin incremento inseguro de contadores.

## Definición estructurada

- POST /api/capabilities/definitions/check: valida contratos/ejemplos y busca coincidencias autorizadas, sin guardar.
- POST /api/capabilities/definitions: repite validación/búsqueda y guarda privado/draft; coincidencias sin reconocimiento devuelven 409 sin insertar.
- Entrada/salida en columnas; parámetros, restricciones, recursos, errores, ejemplos y hash en config.definition.
- HTTP frontend en src/services/definiciones.js; transformación en src/utils/definiciones.js; modelos en backend/schemas/definitions.py; validación en contract_validation.py; búsqueda/guardado en definition_service.py.
- Validar un ejemplo no calcula su salida ni genera código. Sin candidato, artefacto, build o versión activa en este bloque.

Campos, límites, payload y callback de integración: [CONTRATO_INTEGRACION.md](CONTRATO_INTEGRACION.md).

## Persistencia y permisos

Inspección administrativa aportada por usuario confirmó profiles, FK y columnas/grants/RLS reales. Aplicó SQL 03/04/05: lectura autenticada e INSERT limitado a borradores privados propios con contratos. No contadores/UPDATE/DELETE.

No aplicar 01_schema.sql o 02_runs.sql automáticamente sobre ese proyecto: son referencias históricas y no coinciden completamente con el esquema desplegado. Para otro proyecto, inspeccionar antes con scripts/supabase/.

## Evidencia y pendiente

- Usuario confirmó login/listas/clonación y privacidad en listas con dos cuentas. Acceso directo ajeno real y contratos remotos no vacíos pendientes.
- Antes de reorganizar: 32 pruebas HTTP simuladas, lint/build pasan; Playwright aislado prueba formulario con respuestas interceptadas. Resultado final de limpieza en estado.md.
- **Siguiente:** probar autenticado Capacidades → Crear → Cargar ejemplo → Comprobar → Guardar → recargar Mis capacidades → detalle.
- Pendientes IA/semántica/candidato/versiones/publicación/perfil completo/motor. Motor heredado usa memoria/mock; un UUID de catálogo no acredita implementación ejecutable.

Instalación en [README](../README.md), punto de reanudación en [continuidad](CONTEXTO_Y_CONTINUIDAD.md).
