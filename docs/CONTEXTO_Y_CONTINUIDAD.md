# Capacita — contexto y continuidad

Actualizado: 13 de noviembre de 2026, America/Bogota.

## Lectura inicial

Este archivo permite retomar el proyecto sin depender del historial de chat. Leer también `VISION_MAESTRA.md`, `estado.md` y `../AGENTS.md`; verificar el código y Git antes de actuar. El documento registra acuerdos de conversación, no certifica despliegues ni servicios activos.

## Punto exacto donde quedamos

El usuario aceptó la visión final descrita en `VISION_MAESTRA.md`, pidió guardarla y después solicitó repartir el trabajo de forma equilibrada y muy detallada entre dos personas para el martes. Confirmó los nombres: **Miguel = Persona A** (objetivos, catálogo y generación) y **Fahida = Persona B** (pruebas aisladas, workflows y ejecución). `PLAN_DOS_PERSONAS_MARTES.md` contiene contratos, propiedad de archivos, calendario, riesgos y aceptación. Después autorizó subir la documentación a la rama `miguel` para que Fahida la consulte. La disponibilidad horaria aún debe confirmarse. Sigue pendiente implementar la visión; esta autorización no inicia la ejecución de módulos ni el despliegue de la aplicación.

Antes, el usuario pidió inspección sin cambios de código. Se inspeccionó el repositorio, se entregó diagnóstico y se discutieron producto, creación de capacidades, aislamiento, conectores y presupuesto. No se implementaron esos módulos durante la conversación.

## Intención y correcciones del usuario

- Quiere un mundo abierto de capacidades digitales para necesidades de distintos campos, con participación de personas que sepan o no programar.
- La búsqueda previa es dentro de las capacidades existentes del sistema; no una búsqueda general de herramientas en internet como requisito de cada creación.
- Cuando falta una capacidad, la IA puede generar código nuevo desde una especificación; el programa debe poder probarlo y ejecutarlo mediante infraestructura controlada.
- La analogía del usuario es un compilador que prepara lo producido por la IA. La propuesta técnica concreta es una cadena de preparación y pruebas más un ejecutor aislado.
- Marketing, inventarios, documentos y educación son ejemplos, no límites temáticos.
- El asistente trabaja mediante capacidades existentes o creadas y puede conectarse a servicios externos autorizados.
- El diferenciador aceptado: una necesidad resuelta puede convertirse en una capacidad versionada y compartida, aumentando lo que la comunidad puede hacer.
- Presupuesto estudiantil bajo. Mantener la visión; controlar consumo y concurrencia, aprovechar software gratuito y créditos. No confundir servicios gratuitos limitados con operación ilimitada.
- Entrega mencionada: "el martes"; en conversación se interpretó como 17/11/2026. Fecha y modalidad deben confirmarse si vuelven a ser relevantes. No existe una garantía de completar toda la visión para esa fecha.

## Estado de Git observado

- Repositorio: https://github.com/miguelvivasvergel-creator/CAPACITA.git
- Carpeta: `C:\Users\USER\Documents\CAPACITA`.
- Rama observada: `miguel`.
- Antes del diagnóstico se descargó origin y actualizó miguel mediante fast-forward a `a016a62658911cc6627b90a180b8973b17eafed5`, entonces igual a origin/main.
- Había una carpeta `.claude/` sin seguimiento, conservada. No sobrescribirla ni incluirla automáticamente.
- Volver a consultar Git: este estado es una referencia histórica.

## Diagnóstico verificado por lectura de código

### Frontend

- React 19, Vite, Tailwind 3, JavaScript, SDK de Supabase. React Router está declarado, pero App usa hash e historial manual.
- `src/App.jsx`: sesión, navegación y renderizado por secciones. `src/main.jsx`: entrada.
- `src/components/LoginForm.jsx`, `RegisterForm.jsx`, `AuthCard.jsx` y `src/services/supabase.js`: integración real con signUp, signInWithPassword, OAuth Google, getSession, signOut y consulta de perfiles.
- Preservar Auth. No se verificó el recorrido con una cuenta real ni la configuración efectiva del proveedor.
- `src/pages/Inicio.jsx`: estadísticas y destacados mock; el supuesto planner produce el mismo plan fijo y ejecutar muestra un alert.
- `src/pages/Capacidades/Capacidades.jsx`: catálogo comunitario mock y capacidades propias en estado de React, no persistentes.
- `CrearCapacidad.jsx`: placeholder, sin formulario funcional.
- `Workflows.jsx`: estructura visual; nuevo workflow sin acción, conteo estático; constructor pendiente.
- Hay componentes de perfiles, permisos, archivos y ejecución aprovechables.
- `src/api.js`: cliente FastAPI que adjunta token; `src/services/CapacitaAPI.js`: cliente .NET distinto.
- `perfil.js` consulta .NET y luego FastAPI/mocks. `ejecucion.js` también tiene respaldo mock.
- Importaciones con `capacitaApi` no coinciden en capitalización con `CapacitaAPI.js`, riesgo en Linux.

### Backend Python

- FastAPI y Pydantic. Routers registrados: health, capabilities, files, users, runs.
- `backend/core/auth.py`: identidad fija de demo; no valida JWT de Supabase.
- `backend/core/visibility.py`: filtro de listas, todavía sin integración de datos reales.
- `backend/api/capabilities.py`: CRUD y búsqueda textual sobre MOCK_DB, usuario fijo diferente del usado por auth; similaridad por palabras, no semántica.
- `backend/repositories/memoria.py`: perfiles, capacidades, workflows, ejecuciones y archivos de desarrollo.
- Catálogo y motor usan listas diferentes. Crear en el catálogo no registra automáticamente en el motor.
- `backend/api/files.py`: valida extensión/tamaño y devuelve UUID; no almacena contenido, no autentica propietario y no registra ARCHIVOS.
- Runs exige propietario del archivo en ARCHIVOS: recorrido de subida/ejecución no está integrado.
- `backend/services/run_engine.py`: secuencial con BackgroundTasks, pasa una salida al siguiente adaptador, sin contratos completos ni persistencia.
- `backend/adapters/__init__.py`: solo MockAdapter. El resultado es ficticio.
- No se observó router planner/workflows registrado, DAG real ni generación de implementaciones.
- Las capacidades pueden anunciar adaptadores no registrados. Publicación y ejecución deben validar disponibilidad real.
- `requirements.txt` enumera FastAPI, uvicorn, Pydantic y pydantic-settings; revisar dependencias de carga de archivos y futuras integraciones antes de instalar.

### Backend .NET

- Existe ASP.NET Core con EF Core y SQL Server, modelos y seeder propios.
- Se usa desde búsqueda, comunidad y perfiles; convive con Supabase y Python sin una identidad y persistencia unificadas.
- Propuesta: consolidar la ruta principal en FastAPI/Supabase por coherencia con la visión y código de ejecución, evaluando y aprovechando trabajo de .NET antes de migrarlo. La migración no fue ejecutada.

### Datos

- `db/01_schema.sql`: perfiles, capabilities, trigger de perfil, políticas RLS, extensión vector.
- `db/02_runs.sql`: runs, políticas y buckets avatars/outputs.
- Scripts locales no prueban que el esquema esté aplicado. No se inspeccionó Supabase desplegado.
- pgvector habilitado no equivale a embeddings, índices, RPC y búsqueda semántica implementados.
- No duplicar tablas ni aplicar migraciones sin inspeccionar y explicar el esquema real.

## Validación efectuada

`npm run lint` terminó con un error de hooks en `src/pages/Capacidades/MisCapacidades.jsx`: useMemo se llama condicionalmente. Seis advertencias: imports/variables sin usar en ContenedorCapacidad, CapacidadesEmptyState, FileUpload, CrearCapacidad; actualizaciones síncronas de estado en effects de BuscadorGlobal y Buscar.

No se ejecutó build, no se probaron credenciales ni conexiones externas, ni pruebas funcionales completas. No afirmar que el proyecto funciona de extremo a extremo.

En este entorno PowerShell tardó o quedó sin salida; cmd.exe con login=false funcionó para lecturas. Hubo EPERM al ejecutar Node y permiso denegado al escribir .git; se usaron escalaciones explícitas cuando correspondió. No asumir que futuras sesiones tienen las mismas restricciones.

## Próximo paso recomendado, pendiente de instrucción

1. Mostrar al usuario un resumen corto de dónde quedamos y consultar `PLAN_DOS_PERSONAS_MARTES.md` para el reparto A/B y calendario.
2. Verificar estado actual y conocer modalidad de entrega, acceso administrativo a Supabase, proveedor de IA y entorno de sandbox disponibles, sin pedir claves en el chat.
3. Acordar primer bloque de implementación: unificar identidad y catálogo persistente, conservando Auth, después contrato/versionado y ejecución real.
4. Mantener como demostración central crear una capacidad faltante, probarla, ejecutarla, compartirla y reutilizarla desde otra cuenta.
5. No transformar una limitación inicial de recursos en una reducción permanente de la visión a un solo sector.

## Actualizaciones futuras

Registrar fecha, decisiones nuevas, archivos cambiados, pruebas realmente ejecutadas, errores pendientes y siguiente acción. Mantener trazabilidad entre idea, propuesta, implementación y verificación.
