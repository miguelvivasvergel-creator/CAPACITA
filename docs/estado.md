# Estado del proyecto

Cada persona actualiza su sección al terminar cada bloque de fechas: qué quedó listo, qué falta y qué bloquea.

## Módulo A — Miguel (puerta de entrada)

- **Listo:**
- **Falta:**
- **Bloquea:**

## Módulo B — Franklin (capacidades y búsqueda semántica)

- **Listo:**
- **Falta:**
- **Bloquea:**

## Módulo C — Luis Miguel (workflows y Planner)

- **Listo:**
- **Falta:**
- **Bloquea:**

## Módulo D — Fahida (perfil, permisos y ejecución)

- **Listo:**
  - Conexión con el backend (`src/api.js`), `.env.example`, `AGENTS.md` y README.
  - Perfil propio y público con pestañas Capacidades / Workflows / Actividad y "Editar perfil".
  - `GET /users/{username}`, `PATCH /users/me`, `POST /users/me/avatar`, `GET /users/{username}/activity`.
  - Tabla `runs` y buckets `avatars` / `outputs` (`db/02_runs.sql`).
  - `adapters/base.py`, registro `ADAPTERS` y `adapters/mock.py` (listo para que cada quien agregue su adaptador).
  - `POST /runs`, `GET /runs/{id}`, `GET /runs?workflow_id=&limit=` con motor en segundo plano.
  - Modal de Permisos y pantalla de Ejecución conectados: consultan `GET /runs/{id}` cada 1,5 s.
- **Falta:** integración 12–14 oct con los módulos A, B y C.
- **Bloquea:**
  - `core/auth.py` y `core/visibility.py` son temporales (usuario de prueba `fahida`) hasta que Luis Miguel entregue los reales.
  - Ejecutar con archivo necesita `POST /files` de Franklin en main, y que registre el dueño del archivo en `ARCHIVOS`.
  - Los datos viven en memoria (`repositories/memoria.py`) hasta conectar Supabase.
