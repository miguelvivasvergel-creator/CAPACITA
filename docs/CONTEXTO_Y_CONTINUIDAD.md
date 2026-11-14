# Capacita — contexto y continuidad

Actualizado: 14/11/2026, America/Bogota. Estado actual; las sesiones anteriores se conservan en [historial](historial/README.md).

## Punto exacto para retomar

El usuario pidió **organizar la carpeta antes de probar el formulario nuevo**, retirar lo que no sirve y después continuar desde ese mismo punto. Este bloque es de organización: no continuar con generación, IA, laboratorio ni funciones nuevas durante la limpieza.

Al finalizar, retomar **la prueba autenticada de definición estructurada**:

1. Abrir `http://127.0.0.1:5173` e iniciar sesión.
2. Ir a **Capacidades → Crear → Cargar ejemplo editable**.
3. Pulsar **Comprobar definición y buscar similares**.
4. Revisar coincidencias; si necesita otra definición, reconocerlo y pulsar **Guardar definición privada**.
5. Comprobar la copia en **Mis capacidades**, recargar y abrir **Ver → Ver contratos y definición guardada**.
6. Confirmar persistencia de contratos, parámetros y ejemplo. Validar el ejemplo no equivale a ejecutar una implementación.

**Esta prueba nueva sigue pendiente.** No pedir claves/tokens ni desactivar protecciones de DevTools. No necesita más SQL: usa permisos 04/05 ya aplicados por el usuario.

## Visión y autorización vigentes

- Capacita es un asistente de trabajo extensible mediante capacidades creadas, combinadas, probadas y compartidas. No reducirlo a chat, documentos, marketing o catálogo estático.
- Buscar primero dentro del catálogo autorizado. Una descripción no equivale a implementar o habilitar una capacidad.
- **Miguel = Persona A**: identidad, catálogo, búsqueda, definición y generación. **Fahida = Persona B**: laboratorio, sandbox, workflows y ejecución. [Reparto](PLAN_DOS_PERSONAS_MARTES.md) y [contrato actual](CONTRATO_INTEGRACION.md), pendiente revisión conjunta de B.
- El usuario autorizó implementar el frente Miguel, organizar archivos y subir el bloque local a `miguel` con commit de organización de carpetas. No autorizó gastos, facturación, despliegue o publicación de la aplicación.
- Presupuesto estudiantil: software abierto, cuotas gratuitas y créditos confirmados. No asumir recursos ilimitados.
- No ejecutar código generado dentro de FastAPI ni darle credenciales. API autoriza; B prepara ejecución aislada y evidencia.

## Estado comprobado

| Área | Evidencia | Pendiente |
| --- | --- | --- |
| Login real | Usuario confirmó login; Auth valida `/auth/v1/user` y usa profiles. | Resto de recorridos de Auth por verificar. |
| Catálogo | GET reales 200 y usuario confirma listas. | Matriz remota de RLS completa. |
| Clonación | POST real 201 y usuario confirma copia, también tras activar contratos. | Comparar contratos remotos no vacíos. |
| Privacidad de listas | Segunda cuenta no ve borrador privado, según usuario. | Acceso directo ajeno real debe dar 404; cubierto en simulación. |
| Definición estructurada | API/editor implementados, 32 pruebas HTTP simuladas y Playwright aislado. | Prueba autenticada del formulario nuevo. No genera ni ejecuta código. |

## Implementación y datos actuales

- FastAPI principal; React/Vite/Tailwind. `src/api.js` es el único cliente de FastAPI.
- Supabase real: `profiles` con display_name/bio; capabilities_owner_id_fkey referencia profiles(id).
- Catálogo PostgREST con clave pública y token de usuario; lecturas con visible_to en origen/resultados y RLS. Sin service_role.
- input_schema/output_schema JSONB existentes; permissions text[]; contadores no nulos default 0.
- Usuario aplicó SQL **03** (lectura), **04** (INSERT por columnas de borradores privados propios) y **05** (contratos). Reportó contratos=true; contador/UPDATE/DELETE=false.
- No habilitados: edición/borrado remotos, publicación, generación, versiones/builds ni motor real integrado. El código heredado no prueba esas funciones.
- Definición: POST /api/capabilities/definitions/check y /api/capabilities/definitions. Entrada/salida en columnas; parámetros, restricciones, recursos, errores y ejemplos en config.definition. Privado/draft, sin adaptador.
- Validación compartida: backend/services/contract_validation.py. Búsqueda/guardado: definition_service.py. jsonschema==4.26.0 instalado en .venv y declarado en requirements.
- Formulario A: DefinirCapacidad.jsx; HTTP en src/services/definiciones.js; helpers en src/utils/definiciones.js. Laboratorio B CrearCapacidad.jsx conservado y sin integrar.
- .NET se conserva para búsqueda/perfiles y migración posterior. Motor y mocks de otros módulos siguen pendientes; no presentar ejemplos como resultados reales.

## Organización de esta sesión

- Helpers, validación y fixtures compartidas separados de servicios HTTP y tests concretos.
- Mocks antiguos no activos en src/mocks/catalog/; inventario en src/mocks/README.md.
- Retirados: WeatherForecast y solicitud HTTP de ejemplo .NET; hero.png/favicon.svg/icons.svg sin referencias; .gitkeep redundantes y temporales de navegador. Solo captura final local ignorada conservada.
- Continuidad, estado y guía A anteriores archivados en docs/historial/. Guías actuales resumidas; visión/reparto mantienen sus rutas.
- Auditor de imports de solo lectura: scripts/maintenance/audit_structure.py. Documenta archivos de B pendientes sin borrarlos automáticamente.
- Inventario y reglas: [ESTRUCTURA.md](ESTRUCTURA.md). Limpieza validada: 32 pruebas HTTP, lint/build, auditoría de imports y enlaces Markdown correctos; sin módulos inactivos sin clasificar.
- Después de limpiar, usuario reportó diagnósticos `owner=mssql` en SQL 04/05 y en inspect_catalog_write.sql. Confirmada extensión MSSQL 1.47.0; analiza T-SQL, no PostgreSQL. Se añadió .vscode/settings.json con mssql.intelliSense.enableIntelliSense=false y enableErrorChecking=false solo para el workspace (claves/scope window verificados en manifiesto), y excepción precisa en .gitignore. No se alteró SQL ni Supabase; tampoco añade validador PostgreSQL. Pendiente recargar ventana para retirar diagnósticos anteriores. La prueba de definición sigue siendo el siguiente punto.

## Entorno, Git y validación

- 14/11/2026: el usuario autorizó commit y push del trabajo local a `miguel`, con mensaje de organización de carpetas. Incluye definición estructurada y limpieza; la prueba autenticada sigue pendiente. Frontend/API arrancados y comprobados (HTTP 200). Validación de entrega: lint/build y auditorías de imports/enlaces correctos; no se incluyen secretos ni artefactos locales. Confirmar el hash y el estado remoto en Git después del push.

- Carpeta C:\Users\USER\Documents\CAPACITA, rama miguel. Verificar Git al iniciar y no sobrescribir cambios.
- Bloque anterior subido a origin/miguel: **0ef8397**. Push verificado, árbol limpio antes de iniciar definición.
- Definición y organización incluidas en el bloque autorizado para commit/push; confirmar entrega con el historial y el remoto de Git. Sin despliegue.
- .env y backend/.env locales ignorados, mismo proyecto Supabase; .claude conservado ignorado. No mostrar ni subir credenciales.
- Arranque en [README](../README.md), .venv único en raíz. API sin reload en 127.0.0.1:8000; Vite 127.0.0.1:5173. Revalidar procesos al retomar.
- La red del sandbox bloqueaba Supabase: API con acceso autorizado fuera del sandbox resolvió la conexión. No abrir permisos BD para solucionar red.
- Tras limpiar: 32 pruebas HTTP simuladas, lint/build y git diff --check pasan. Auditoría de imports sin rutas rotas; enlaces locales correctos en 14 documentos. API reiniciada con módulos actuales: health healthy/200 y ambas rutas de definición presentes en OpenAPI. No se ejecutó la prueba autenticada nueva ni se modificaron datos remotos. Advertencias conocidas: bundle >500 kB y deprecación Starlette/httpx.
- Build .NET de referencia falló **antes de retirar plantillas**, NETSDK1045: SDK instalado 9.0.305 frente a proyecto net10.0. No se cambió target ni instaló SDK; compilación .NET sin validar.

## IA propuesta, todavía no configurada

Usuario sin proveedor; pidió recomendación. Se propuso probar Gemini API/Google AI Studio con gemini-4-hydrogen, cuyo [nivel gratuito](https://aistudio.google.com/docs/pricing#gemini-4-hydrogen) estaba publicado al consultar el 14/11/2026. Es recomendación, no aceptación/disponibilidad/cuota confirmadas.

[Términos gratuitos](https://aistudio.google.com/docs/terms#data-use-unpaid): contenido puede usarse para mejorar productos, usar datos no privados. Clave solo backend, nunca chat/frontend. No se crearon claves, activó facturación ni hicieron llamadas IA.

Después de la prueba pendiente, elegir/configurar proveedor, comprobar cuota y avanzar interpretación/generación con sandbox de Fahida. No empezar ese bloque durante la organización.
