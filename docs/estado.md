# Estado del proyecto

Actualizado: 14/11/2026. Estado actual; reportes anteriores completos en [historial](historial/README.md).

## Reanudación inmediata

El usuario pidió organizar antes de probar el nuevo formulario. Después, retomar **Capacidades → Crear → Cargar ejemplo editable → Comprobar → Guardar definición privada**, recargar y revisar contratos en detalle. Aún no confirmado contra Supabase real.

## Miguel — Persona A

| Bloque | Estado | Evidencia y pendientes |
| --- | --- | --- |
| Identidad | Implementada; login real confirmado por usuario. | Auth + profiles, sin identidad demo. Otros recorridos pendientes. |
| Catálogo | Lectura real confirmada. | PostgREST, RLS/visible_to, paginación. |
| Clonación | Confirmada con API actual. | Privado/draft, propietario y origen reales. Comparar contratos remotos no vacíos. |
| Privacidad de listas | Confirmada por usuario con dos cuentas. | Acceso directo ajeno real pendiente; 404 cubierto en simulación. |
| Permisos | 03/04/05 aplicados según usuario. | Lectura e INSERT privado; no contadores/UPDATE/DELETE. |
| Definición estructurada | Implementada localmente. | Prueba autenticada del formulario pendiente. No genera ni ejecuta. |
| Organización | Aplicada y validada localmente. | Imports/enlaces correctos; 32 pruebas, lint/build pasan; trabajo B conservado. |
| IA/planner/generación | Pendiente. | Sin proveedor configurado ni cuota confirmada; Gemini recomendado. |
| Contrato de candidato Python | Preparación interna implementada; pendiente revisión B. | AST/firma, hash de código+definición y paquete draft; 6 pruebas nuevas. Sin IA, endpoint, persistencia ni ejecución. |
| Versiones/publicación | Pendiente. | Requiere implementación/evidencia de pruebas B. |
| Perfil/dashboard/búsqueda semántica | Integración pendiente. | Persisten consumidores .NET y mocks. |

## Fahida — Persona B

Propiedad: laboratorio, pruebas aisladas, archivos, workflows, builds, motor, resultados e historial. CrearCapacidad.jsx y FileUpload.jsx se conservan para integración; no se implementaron aquí.

Hay código heredado de runs/perfiles/adaptadores y datos en memoria; no demuestra motor persistente ni aislamiento real. Reportes anteriores de Franklin, Luis Miguel y Fahida conservados en [ESTADO_2026-11-14.md](historial/ESTADO_2026-11-14.md), sin tratarlos como aceptación actual ni reasignarlos.

Consumo de definición A en [CONTRATO_INTEGRACION.md](CONTRATO_INTEGRACION.md), pendiente revisión conjunta. Sandbox, candidatos/artefactos, builds, habilitación y ejecución pendientes según el [plan A/B](PLAN_DOS_PERSONAS_MARTES.md).

## Verificación y límites

- Antes de reorganizar: 32 pruebas HTTP simuladas pasan; lint/build pasan; Playwright con respuestas interceptadas cubre formulario, guardado simulado, errores, edición y móvil. No certifica persistencia remota del nuevo formulario.
- Tras reorganizar: 32 pruebas HTTP pasan; lint/build y git diff --check correctos. Auditoría de imports sin rutas rotas o módulos inactivos sin clasificar; enlaces locales de 14 documentos correctos.
- API reiniciada con módulos reorganizados: health healthy/200 y ambas rutas de definición comprobadas en OpenAPI. El rechazo sin token 401/CORS se verificó en el bloque anterior y se cubre en pruebas simuladas.
- Advertencias conocidas: bundle >500 kB y deprecación Starlette/httpx.
- Build .NET de referencia bloqueado antes de limpiar: NETSDK1045, SDK 9.0.305 frente a net10.0. Sin cambiar framework ni instalar SDK.
- Sin datos/SQL remoto, generación o ejecución modificados durante la limpieza.
- Avisos SQL del editor: diagnóstico `mssql` sobre scripts PostgreSQL; comprobado manifiesto de MSSQL 1.47.0. Desactivado análisis T-SQL en .vscode/settings.json solo para este workspace, sin cambios SQL/BD ni validador PostgreSQL nuevo. Pendiente recarga de VS Code para retirar avisos anteriores.

## Git y siguiente paso

14/11/2026: usuario autorizó subir el bloque local de definición y organización a `miguel` mediante commit de organización de carpetas. Preparación de entrega con lint/build y auditorías de estructura/enlaces correctos; prueba autenticada aún pendiente. Consultar Git para confirmar commit y push de este bloque.

Rama miguel; **0ef8397** es el bloque anterior subido a origin/miguel. Definición y organización incluidas en la entrega Git autorizada; confirmar hash y remoto en Git. Sin despliegue. Credenciales/artefactos locales ignorados.

1. Retomar prueba autenticada del formulario nuevo.
2. Después, configurar IA backend y coordinar generación/sandbox con Fahida.
