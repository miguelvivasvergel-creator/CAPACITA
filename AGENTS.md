# Reglas del repositorio — Capacita

Guía corta para cualquier persona (o agente de IA) que trabaje en este repositorio.

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
