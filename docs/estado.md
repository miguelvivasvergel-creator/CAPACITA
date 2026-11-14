# Estado del proyecto

Actualizado: 14/11/2026. Estado actual; reportes anteriores completos en [historial](historial/README.md).

## Reanudación inmediata

Cierre solicitado con commit/push detallado. Nuevo flujo de objetivos: API y formulario implementados; busca antes de IA, aclara/bloquea/propone y carga formulario sin autoguardado. 62 pruebas locales, lint/build y roundtrip correctos. Prueba real de interpretación Gemini con ejemplo público devuelve define y contratos consistentes; falta recorrido autenticado completo en navegador. No afirmar planner/workflows implementados.

Usuario confirma candidato 452d1c47 recuperado después de recargar, con el mismo código Gemini y SHA-256 07cef1a8d62fafdeb4f2cb57bfda7e208a7ebb150b81f6f874de1477d032e301, en borrador/pruebas pendientes. Generación, guardado y relectura reales confirmados por usuario; faltan privacidad con segunda cuenta y pruebas aisladas B. No registrar código generado como implementación habilitada.

Usuario confirma guardado/recarga/detalle de definición y candidato real. SQL 06 aplicado, lectura/insertar=true y editar/borrar=false. Corregido esDuenio ausente en detalle de Mis capacidades. No se ejecutó código generado.

## Miguel — Persona A

| Bloque | Estado | Evidencia y pendientes |
| --- | --- | --- |
| Identidad | Implementada; login real confirmado por usuario. | Auth + profiles, sin identidad demo. Otros recorridos pendientes. |
| Catálogo | Lectura real confirmada. | PostgREST, RLS/visible_to, paginación. |
| Clonación | Confirmada con API actual. | Privado/draft, propietario y origen reales. Comparar contratos remotos no vacíos. |
| Privacidad de listas | Confirmada por usuario con dos cuentas. | Acceso directo ajeno real pendiente; 404 cubierto en simulación. |
| Permisos | 03/04/05/06 aplicados según usuario. | Lectura e INSERT privado de candidatos confirmados por tabla de permisos; no UPDATE/DELETE. Matriz RLS real pendiente. |
| Definición estructurada | Confirmada por usuario contra Supabase real. | Guardado/recarga/contratos y ejemplo conservados. No ejecuta. |
| Organización | Aplicada y validada localmente. | Imports/enlaces correctos; 32 pruebas, lint/build pasan; trabajo B conservado. |
| IA/generación | Generación, guardado y recarga reales confirmados por usuario. | Candidato 452d1c47 conserva código/hash. Planner/semántica, privacidad con segunda cuenta y ejecución pendientes. |
| Interpretación de objetivos | API/formulario implementados; prueba real Gemini correcta. | Buscar, aclarar/bloquear/proponer y cargar formulario; sin autoguardado/ejecución. Total 62 pruebas; recorrido autenticado pendiente. |
| Contrato de candidato Python | Implementado; pendiente revisión B y pruebas aisladas. | AST/firma/hash, API privada y repositorio; SQL 06 aplicado según usuario. Sin ejecución ni habilitación. |
| Versiones/publicación | Pendiente. | Requiere implementación/evidencia de pruebas B. |
| Perfil/dashboard/búsqueda semántica | Integración pendiente. | Persisten consumidores .NET y mocks. |

## Fahida — Persona B

Seguimiento acumulativo propio: [CONTEXTO_Y_CONTINUIDAD_FAHIDA.md](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md).
Bloque 1 de infraestructura local verificado el 14/11/2026: Ubuntu 24.04 en
WSL2, Docker Engine 29.1.3 y runsc 20261109.0 propios. Diez comprobaciones reales
pasan: admisión única, aislamiento/temporales independientes, timeout, salida
limitada a 64 KiB, OOM a 256 MiB, CPU limitada según cgroup del host, máximo de
8 procesos invitados, error y limpieza. Ocho contenedores de prueba eliminados.
Scripts de referencia y verificación bajo scripts/maintenance; reporte local
ignorado y evidencia resumida en el documento acumulativo.

Esto supera el bloqueo inicial de infraestructura para pruebas locales; todavía
no hay laboratorio integrado, ejecución de candidatos, builds persistentes ni
habilitación. Siguiente: bloque 2 con contratos/hashes, harness y reportes privados.
Guía de consumo A: [ENTREGA_A_B_CANDIDATOS.md](ENTREGA_A_B_CANDIDATOS.md).
Cada bloque deja pruebas, pendientes y commit local. Sin gastos ni publicación.

Propiedad: laboratorio, pruebas aisladas, archivos, workflows, builds, motor, resultados e historial. CrearCapacidad.jsx y FileUpload.jsx se conservan para integración; no se implementaron aquí.

Hay código heredado de runs/perfiles/adaptadores y datos en memoria; no demuestra motor persistente ni aislamiento real. Reportes anteriores de Franklin, Luis Miguel y Fahida conservados en [ESTADO_2026-11-14.md](historial/ESTADO_2026-11-14.md), sin tratarlos como aceptación actual ni reasignarlos.

Consumo de definición A en [CONTRATO_INTEGRACION.md](CONTRATO_INTEGRACION.md), pendiente revisión conjunta. Sandbox, candidatos/artefactos, builds, habilitación y ejecución pendientes según el [plan A/B](PLAN_DOS_PERSONAS_MARTES.md).

## Verificación y límites

- Bloque Gemini/candidatos: 52 pruebas locales pasan (proveedores simulados para HTTP); lint/build, diff --check y auditorías imports/enlaces correctos. Gemini real: metadatos 200 y una generación pública válida, SHA-256 234e21f55ddf5f77ae740e9a042041fb9f1ecfdb53fe7ec1d2f87e7cbc5b54c4. Sin ejecución/persistencia de ese ejemplo. SQL 06 preparado sin aplicación ni validación remota; prueba de interfaz y RLS de candidatos pendiente.

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

1. Generación/guardado/recarga confirmados; SQL 06 ya aplicado, no repetir. Comprobar acceso ajeno 404 con segunda cuenta.
2. Coordinar entrega del paquete a Fahida para pruebas aisladas y ejecución; continuar comprensión/planner en A.
