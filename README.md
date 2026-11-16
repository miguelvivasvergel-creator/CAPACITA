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
- [Entrega del martes en el PC de Fahida](docs/ENTREGA_MARTES.md): integración, arranque y ensayo pendientes en ese equipo, con evidencia y límites actuales.
- [Estructura y organización](docs/ESTRUCTURA.md): dónde va cada archivo y movimientos realizados.
- [Reglas del repositorio](AGENTS.md).

## Instalación y ejecución local

El bloque 3 agrega almacenamiento compartido de pruebas, versiones privadas y
ejecuciones. Requiere preparar SQL 07 y una cuenta de trabajador antes de usar
esas rutas; no se aplica automáticamente. Ver [guía B3](docs/BLOQUE_3_EJECUCION.md).
Los reportes SQLite anteriores se conservan y pueden consultarse en modo B2.

Workflows B4 está integrado y se aceptó en el equipo de Miguel un proceso real de
dos capacidades distintas, con aprobación y transferencia de datos. Historial B5
conserva resultados al recargar y reiniciar API; privacidad aceptada con dos cuentas.
Ver [guía B4](docs/BLOQUE_4_WORKFLOWS.md), [guía B5](docs/BLOQUE_5_RESULTADOS.md) y
[evidencia de entrega](docs/ENTREGA_MARTES.md). Esto no certifica el ensayo en el
PC de Fahida ni publicación ejecutable entre cuentas. No repetir SQL 07/08.

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
| Persistencia y Auth | Supabase | Catálogo inspeccionado; lectura/clonación y permisos mínimos confirmados por el usuario. Otros módulos pendientes. |
| API .NET existente | `backend-dotnet/` | Conservada e inactiva en búsqueda/perfil actuales. Requiere SDK .NET 10 si se trabaja en ella. |
| SQL de referencia | `db/` | Scripts numerados; su existencia no prueba que estén aplicados. |
| Ejecución y workflows | Frente B | B3/B4 privados integrados: versiones, runs persistentes, laboratorio y constructor. Requieren worker autorizado; publicación entre cuentas pendiente. |

Consulta [el contrato de identidad y catálogo](docs/modulo-a-identidad-catalogo.md)
antes de conectar nuevas pantallas. Mocks y placeholders siguen presentes en
otros módulos; no se consideran funcionalidades verificadas.

En **Capacidades → Crear**, el componente de definición permite declarar entradas,
salidas, parámetros y ejemplos, comprobarlos, buscar coincidencias y guardar un
borrador privado. La comprobación no ejecuta código ni genera una implementación.
El [contrato de integración A/B](docs/CONTRATO_INTEGRACION.md) documenta las nuevas
rutas y el paquete guardado. Este bloque usa los permisos SQL 04/05 existentes;
no requiere tablas nuevas. Instalar las dependencias actualizadas del backend
antes de reiniciarlo, incluida `jsonschema`.

## Trabajo en equipo

### Generación de candidatos Python (bloque local nuevo)

El detalle de una definición privada propia incluye **Preparar implementación Python**.
Permite revisar coincidencias, confirmar envío de ejemplos sin datos privados a Gemini
y generar/guardar un candidato privado. Requiere revisar/aplicar
[`06_private_candidates.sql`](db/06_private_candidates.sql); el script está preparado,
no aplicado automáticamente en instalaciones nuevas. Ya aplicado en el proyecto
trabajado, al igual que SQL 07/08 según continuidad: no repetir migraciones allí.
Crea una tabla privada independiente con RLS, sin
modificar capacidades existentes ni habilitar ejecución. Hasta que exista el
almacenamiento, la generación se detiene antes de llamar a IA.

Configurar `GEMINI_API_KEY` solo en `backend/.env` (sin prefijo VITE), modelo y límites
según `backend/.env.example`, y reiniciar API. Comprobación sin mostrar claves:
`.venv\Scripts\python.exe scripts/ai/check_gemini.py`. La opción `--generate-example`
consume una generación con un ejemplo público; no ejecuta código ni guarda un candidato.
Revisar cuotas/nivel gratuito en la cuenta y no activar facturación sin autorización.
Una propuesta con sintaxis válida aún requiere pruebas aisladas de Fahida.

### Coordinación

En **Capacidades → Crear**, **Empieza describiendo lo que necesitas** busca en el
catálogo y usa Gemini para pedir aclaraciones o proponer una definición editable.
Requiere confirmar objetivo/respuestas sin datos privados; el catálogo no se envía
al modelo. **Usar propuesta en el formulario** permite revisar y comprobar antes
de guardar. No guarda automáticamente ni ejecuta código; no es un planner de workflows.
La interpretación Gemini se probó con ejemplo público; recorrido autenticado de
esta nueva pantalla pendiente. No necesita otro SQL.

Una rama por persona y cambios hacia `main` por PR revisado. Miguel trabaja en
`miguel`. Los dueños de archivos e hitos están en el plan de dos personas.
Actualizar estado y continuidad al cerrar cada bloque, distinguiendo código,
propuestas y validación real. No subir `.env`, sesiones, tokens ni archivos privados.

El [PDF histórico](docs/referencias/Plan_Maestro_Capacita_Supabase.pdf) se conserva
como referencia; los acuerdos actuales están en los documentos enlazados al inicio.

### Búsqueda semántica local opcional

Autocompletado y Buscar usan FastAPI con sesión real. Texto no necesita extras.
Para el modo por significado local se requiere Python 3.12 o posterior. Desde raíz:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-search.txt
.\.venv\Scripts\python.exe scripts/maintenance/setup_search_model.py
```

Reiniciar API. Descarga inicial de unos 136 MB, CPU, sin enviar consultas/catálogo
a terceros. Hasta 200 capacidades autorizadas con truncado explícito; no índice
pgvector global. Sin SQL nuevo; modelos/caché fuera de Git.
Ver [contrato, pruebas y límites](docs/BUSQUEDA_A.md).
