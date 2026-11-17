# Reglas del repositorio — Capacita

Guía corta para cualquier persona (o agente de IA) que trabaje en este repositorio.

## Contexto obligatorio al iniciar una sesión

- Leer primero [`docs/CONTEXTO_Y_CONTINUIDAD.md`](./docs/CONTEXTO_Y_CONTINUIDAD.md), después [`docs/VISION_MAESTRA.md`](./docs/VISION_MAESTRA.md) y [`docs/estado.md`](./docs/estado.md).
- Desde el 17/11/2026 Fahida construye sola la [versión final soñada](docs/VISION_FINAL.md) (chat + taller); el reparto anterior con Miguel queda en [`docs/historial/PLAN_DOS_PERSONAS_MARTES.md`](docs/historial/PLAN_DOS_PERSONAS_MARTES.md). No registrar tareas previstas como completadas.
- Esos documentos conservan la visión acordada con el usuario, propuestas técnicas, restricciones de presupuesto, diagnóstico y siguiente punto de trabajo. Distinguir decisiones aceptadas, propuestas y funcionalidades verificadas.
- Capacita es un asistente de trabajo extensible mediante capacidades creadas, combinadas y compartidas. No reducir el producto a marketing, documentos, un catálogo estático o una interfaz de chat.
- Buscar primero en el catálogo interno autorizado. Si falta una capacidad, proponer su creación mediante contratos, generación, pruebas aisladas y versiones; no afirmar que generar una descripción equivale a tener una implementación funcional.
- No ejecutar código generado dentro del proceso de la API ni entregar credenciales a ese código. Mantener controles de permisos y aprobación para acciones externas.
- El equipo es estudiantil y tiene poco presupuesto: priorizar software abierto, cuotas gratuitas y créditos confirmados. No contratar servicios, activar facturación ni prometer recursos ilimitados sin autorización.
- El usuario autorizó guardar contexto, planificar el reparto entre Miguel y Fahida y subir esa documentación a su rama `miguel`. Esto no autoriza implementar módulos, alterar datos, desplegar ni publicar la aplicación. Antes de nuevos cambios de código, atender la instrucción vigente del usuario.
- Al finalizar trabajo significativo, actualizar la continuidad con cambios, validación, bloqueos y siguiente paso; nunca registrar propuestas como implementadas. No incluir secretos ni datos privados.

## Carpetas

| Parte | Carpeta | Qué va ahí |
| :--- | :--- | :--- |
| Frontend | `src/pages/` | Una pantalla por archivo |
| | `src/components/` | Piezas reutilizables, agrupadas por módulo (`profile/`, `runs/`, `capabilities/`, `workflows/`, `layout/`, `common/`) |
| | `src/mocks/` | Datos falsos mientras el endpoint real no existe |
| | `src/api.js` | Única función para llamar al backend (`api('/ruta')`) |
| Backend | `backend/api/` | Routers de FastAPI (un archivo por recurso) |
| | `backend/core/` | Configuración, respuestas estándar, autenticación y visibilidad |
| | `backend/schemas/` | Modelos Pydantic de entrada y salida |
| | `backend/services/` | Lógica de negocio (por ejemplo, el motor de ejecución) |
| | `backend/adapters/` | Código que hace el trabajo real de cada capacidad |
| Base de datos | `db/` | Scripts SQL numerados (`01_schema.sql`, `02_...`) |
| Scripts | `scripts/` | Semillas y utilidades |
| Docs | `docs/` | `estado.md` y `modulo-x.md` de cada persona |

## Ramas y Pull Requests

- Una rama por persona. Nada se sube directo a `main`: todo entra por PR.
- PR pequeños y frecuentes (mínimo uno cada 2–3 días).
- Revisión en círculo: Miguel → Franklin → Luis Miguel → Fahida → Miguel. Se responde en máximo 24 h.
- Mensajes de commit: `tipo(modulo-x): qué se hizo` (por ejemplo `feat(modulo-d): pantalla de ejecución`).

## Cómo correr el proyecto

Ver la sección **Instalación y ejecución local** del [README](./README.md).

## Reglas obligatorias

- **Privacidad:** toda consulta a `capabilities` o `workflows` pasa por `visible_to(user_id)` de `core/visibility.py`. Está prohibido hacer un `SELECT` directo sin ese filtro.
- Si alguien pide algo privado que no es suyo, se responde **404** (no 403).
- Las entradas, salidas y archivos de una ejecución solo los ve quien ejecutó.
- Lo que escribe un usuario se muestra siempre como texto, nunca como HTML.
- Las claves van en `.env` y nunca se suben. Solo se sube `.env.example` sin valores reales.
- Las listas responden `{ "items": [...], "next_cursor": "..." | null }`. Los errores usan `{ "detail": "mensaje" }`.
- Cada pantalla se hace primero con datos falsos en `src/mocks/` y después se conecta al endpoint real.
- Al terminar cada bloque de fechas, actualiza tu sección en [`docs/estado.md`](./docs/estado.md).
