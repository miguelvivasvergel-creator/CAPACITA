# Capacita

**Conecta capacidades. Resuelve objetivos.**

Capacita es un asistente de trabajo extensible mediante capacidades digitales
creadas, combinadas y compartidas. La visión acordada incluye catálogo, creación,
pruebas aisladas, workflows, permisos y ejecución verificable. Esa visión no
significa que todos los módulos estén implementados.

## Empezar por aquí

- [Continuidad de la sesión](docs/CONTEXTO_Y_CONTINUIDAD.md): punto actual y siguiente paso.
- [Visión maestra](docs/VISION_MAESTRA.md): acuerdos de producto y arquitectura.
- [Estado verificado](docs/estado.md): implementado, pendiente y bloqueos.
- [Reparto Miguel/Fahida](docs/PLAN_DOS_PERSONAS_MARTES.md): Miguel (A), objetivos/catálogo/generación; Fahida (B), pruebas/workflows/ejecución.
- [Estructura y organización](docs/ESTRUCTURA.md): dónde va cada archivo y movimientos realizados.
- [Reglas del repositorio](AGENTS.md).

## Instalación y ejecución local

Requisitos: Node.js compatible con el Vite instalado (consulta `package.json`),
npm y Python 3.11 o posterior. Los comandos siguientes se ejecutan en PowerShell
desde la raíz, salvo donde se indica otra carpeta.

### Dependencias

```powershell
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Usar un único entorno Python en `.venv/` de la raíz. No subir dependencias ni
archivos de entorno a Git.

### Configuración de Supabase

Crear `.env` a partir de `.env.example` **solo si no existe** y configurar:

- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: clave pública publishable/anon del proyecto.
- `VITE_API_URL`: `http://127.0.0.1:8000/api`.
- `VITE_DOTNET_API_URL`: URL de la API .NET si se usan sus pantallas existentes.

Después, preparar el backend con los mismos valores:

```powershell
.\.venv\Scripts\python.exe scripts/supabase/setup_env.py
```

El script crea `backend/.env` si falta, o comprueba coincidencia si ya existe.
Nunca sobrescribe una configuración distinta ni muestra claves. Las demás
opciones de FastAPI están documentadas en `backend/.env.example`.

FastAPI usa el token del usuario para verificar Auth y consultar PostgREST.
No necesita service_role ni el secreto de firma JWT. Conectar Auth no demuestra
que estén creadas o autorizadas las tablas de la aplicación.

### Verificar la base de datos sin modificarla

```powershell
.\.venv\Scripts\python.exe scripts/supabase/check_catalog.py
.\.venv\Scripts\python.exe scripts/supabase/inspect_schema.py
```

Ambos scripts consultan metadatos o cero filas. No aplican migraciones.
Si Supabase no permite inspección con la clave pública, usar una conexión
administrativa autorizada para ejecutar
[`inspect_catalog.sql`](scripts/supabase/inspect_catalog.sql) y revisar tablas,
grants y RLS antes de proponer cambios. No abrir permisos para hacer pasar un script.

### Arrancar

Backend, en una terminal:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe main.py
```

API: `http://127.0.0.1:8000/api`; documentación: `http://127.0.0.1:8000/docs`.

Frontend, en otra terminal desde la raíz:

```powershell
npm run dev
```

Abrir `http://localhost:5173`. Reiniciar Vite después de cambiar `.env`.
Para macOS/Linux, usar `.venv/bin/python` en lugar de `.venv\Scripts\python.exe`.

## Verificación local

Desde la raíz:

```powershell
npm run lint
npm run build
```

Desde `backend/`:

```powershell
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas HTTP actuales simulan el proveedor Supabase. No certifican las
políticas RLS remotas ni sustituyen el recorrido real con dos usuarios.

## Arquitectura y límites actuales

| Parte | Ubicación | Situación |
| --- | --- | --- |
| Interfaz | `src/` | React, Vite y Tailwind. Catálogo conectado a FastAPI. |
| API principal | `backend/` | FastAPI: Auth verificada y repositorio PostgREST del catálogo. |
| Persistencia y Auth | Supabase | Configuración local unificada; inspección administrativa de tablas/permisos pendiente. |
| API .NET existente | `backend-dotnet/` | Se conserva: comunidad, búsqueda y consulta de perfiles aún tienen consumidores. |
| SQL de referencia | `db/` | Scripts numerados; su existencia no prueba que estén aplicados. |
| Ejecución y workflows | Frente B | Motor/datos de desarrollo pendientes de integración con catálogo/versiones reales. |

Consulta [el contrato de identidad y catálogo](docs/modulo-a-identidad-catalogo.md)
antes de conectar nuevas pantallas. Mocks y placeholders siguen presentes en
otros módulos; no se consideran funcionalidades verificadas.

## Trabajo en equipo

Una rama por persona y cambios hacia `main` por PR revisado. Miguel trabaja en
`miguel`. Los dueños de archivos e hitos están en el plan de dos personas.
Actualizar estado y continuidad al cerrar cada bloque, distinguiendo código,
propuestas y validación real. No subir `.env`, sesiones, tokens ni archivos privados.

El [PDF histórico](docs/referencias/Plan_Maestro_Capacita_Supabase.pdf) se conserva
como referencia; los acuerdos actuales están en los documentos enlazados al inicio.
