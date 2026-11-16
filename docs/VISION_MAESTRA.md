# CAPACITA — visión maestra acordada

Fecha de referencia: 13/11/2026. Documento de producto y arquitectura propuesta, basado en la documentación maestra entregada por el usuario y las aclaraciones posteriores. No describe funcionalidades ya implementadas; consultar `CONTEXTO_Y_CONTINUIDAD.md` para estado real.

## 1. Definición y propósito

Capacita es un asistente de trabajo extensible que descubre, combina, ayuda a crear y ejecuta capacidades digitales reutilizables para resolver objetivos expresados en lenguaje natural. Personas con o sin conocimientos de programación pueden crear herramientas propias, probarlas, usarlas y compartirlas.

La conversación es una entrada al trabajo, no el producto completo. La plataforma debe ofrecer planes verificables, edición visual, permisos, ejecución real, resultados, historial y colaboración. No limitarse a respuestas de texto, un catálogo estático ni pantallas que simulan funcionalidad.

Frase central: **Conecta capacidades. Resuelve objetivos.**

## 2. Diferenciador

Una necesidad resuelta puede convertirse en una capacidad nueva y reutilizable. Una capacidad probada puede participar en procesos mayores; otras personas pueden utilizarla o derivar variantes preservando autoría, licencia y versiones.

El asistente amplía su repertorio de herramientas mediante creación y reutilización verificables. Esto no implica reentrenar automáticamente un modelo de IA. Preferencias y memoria del usuario son distintas del catálogo de capacidades.

La demostración diferencial propuesta utiliza dos usuarios: uno plantea una necesidad que requiere una pieza faltante; Capacita la construye, prueba y ejecuta; el creador la comparte; otro usuario la encuentra y la usa con otros datos y sus propias autorizaciones. No afirmar originalidad absoluta ni ausencia de competidores sin investigación.

## 3. Alcance abierto

Educación, documentos, comercio, marketing, inventarios, investigación, datos, diseño y administración son ejemplos. La plataforma no queda especializada en ninguno.

Aceptar ideas de distintos campos no garantiza ejecución inmediata de cualquier tarea. Algunas necesitan modelos, APIs, equipos, licencias, datos o revisión especializada. Mostrar qué recurso falta y conservar el trabajo como borrador; no inventar disponibilidad.

## 4. Conceptos separados

- **Capacidad:** función reutilizable con propósito y contratos de entradas/salidas.
- **Implementación:** mecanismo real que realiza la función: código controlado, modelo, composición o conector.
- **Proveedor:** quien mantiene o suministra una implementación.
- **Especialización:** parámetros y restricciones particulares de una capacidad general.
- **Workflow:** grafo de pasos y conexiones para un objetivo.
- **Capacidad compuesta:** workflow encapsulado detrás de un contrato reutilizable.
- **Agente guardado:** instrucciones, contexto, capacidades permitidas y política de actuación para una clase de trabajo.
- **Conector:** integración mantenida por el sistema hacia una API externa.
- **Conexión:** autorización concreta de un usuario sobre una cuenta externa.
- **Ejecución:** instancia de una versión determinada, con entradas, estados y resultados privados.

## 5. Experiencia principal

1. Autenticarse mediante Supabase Auth.
2. Describir un objetivo o explorar el catálogo.
3. Aclarar datos, restricciones y resultados deseados.
4. Buscar capacidades internas autorizadas y disponibles.
5. Proponer reutilización, especialización, composición o creación de piezas faltantes.
6. Mostrar plan, entradas, resultados esperados, permisos y recursos externos.
7. Construir y probar lo que falte, sin presentar candidatos como funcionalidad habilitada.
8. Revisar o editar parámetros y conexiones.
9. Aprobar las acciones que lo requieran.
10. Validar de nuevo en backend y ejecutar versiones concretas.
11. Mostrar avance, resultados parciales, fallos y resultado final.
12. Registrar historial y métricas reales.
13. Ofrecer guardar el procedimiento como capacidad reutilizable y compartirlo voluntariamente.

La búsqueda previa obligatoria es en el catálogo de Capacita, filtrado por permisos. No se acordó una búsqueda exhaustiva de internet para cada solicitud. La documentación técnica y las dependencias autorizadas pueden consultarse durante desarrollo, sin confundirlo con esa búsqueda de producto.

## 6. Creación de capacidades paso a paso

### 6.1 Definición

La IA convierte la idea en una especificación: nombre, propósito, categoría, entradas, salidas, parámetros, restricciones, permisos, ejemplos, fallos esperados y recursos necesarios. Preguntar si hay ambigüedad. Mostrar una descripción entendible; guardar internamente contratos estructurados.

Ejemplo: detectar productos agotados. Entrada CSV con producto y existencias; umbral configurable; salida lista de productos y cantidades; errores si faltan columnas o cantidades válidas.

### 6.2 Búsqueda y compatibilidad

Combinar texto y embeddings de descripciones mediante PostgreSQL/pgvector. Recuperar candidatos y verificar contratos, parámetros, permisos, estado, implementación habilitada y versiones. Una similitud alta no demuestra equivalencia funcional. No filtrar información privada en la búsqueda ni enviar al modelo capacidades que el usuario no puede conocer.

### 6.3 Decisión

- Equivalente existente: reutilizar.
- Cambio de parámetros: especializar/configurar.
- Piezas suficientes: componer.
- Transformación faltante: generar implementación candidata.
- Integración o recurso inexistente: declarar dependencia y estado pendiente.

### 6.4 Generación

Empezar con Python. La IA produce código, contrato, dependencias solicitadas con versiones, ejemplos, pruebas propuestas y manifiesto de recursos. No permitir que el modelo decida unilateralmente el entorno, permisos, comandos de infraestructura ni dependencias arbitrarias.

Usar entornos preparados con paquetes permitidos; solicitudes nuevas requieren evaluación. La generación aislada ocurre en un taller separado del motor que ejecuta versiones habilitadas.

### 6.5 Preparación y pruebas

Validar manifiesto, sintaxis, contrato y dependencias; construir artefacto identificable; ejecutar en sandbox con límites. Añadir casos derivados del contrato y casos de referencia independientes del código generado, incluyendo entradas inválidas, límites, salidas incorrectas y consumo de recursos.

La revisión estática o una lista de imports no sustituye aislamiento. Pasar pruebas no demuestra seguridad ni exactitud universal. Guardar evidencia y límites conocidos. Permitir correcciones automáticas con intentos y consumo limitados; nunca un bucle indefinido.

### 6.6 Prueba y habilitación

El creador prueba muestras propias y revisa resultados. Diferenciar ejecución experimental privada, habilitación de versión y publicación para terceros. Mayor riesgo implica revisión más exigente. Una edición del código invalida la evidencia anterior y genera versión candidata nueva.

Estados propuestos: borrador, definiendo, generando, en pruebas, requiere cambios, habilitada, deshabilitada/retirada. Afinar nombres y transiciones al implementar.

## 7. Contratos, versiones y procedencia

Una capacidad debe conservar esquema de entrada, parámetros y salida; propiedad, visibilidad, licencia, tipo de implementación y referencias a versiones. Cada versión registra código/artefacto, hash, dependencias, configuración del modelo si aplica, permisos, pruebas y fecha.

Ejecutar código ya preparado, sin regenerarlo en cada uso. Fijar versiones en workflows. Una actualización de una dependencia no debe cambiar procesos existentes silenciosamente. Guardar versiones permite investigar fallos y volver a una anterior; no garantiza salidas idénticas de servicios externos o modelos probabilísticos.

Representar derivaciones y dependencias; impedir ciclos incluso entre capacidades compuestas. Mantener atribución al clonar o proponer mejoras. No compartir datos privados ni credenciales con una definición publicada.

## 8. Planner, workflows y motor

La IA propone JSON validable con objetivo, ids de capacidades reales, versiones, pasos, parámetros, conexiones, entradas faltantes y resultados esperados. No inventar identificadores ni ejecutar una respuesta como código.

El backend comprueba existencia, visibilidad, estado, disponibilidad de implementaciones, esquemas, parámetros, compatibilidad de conexiones, entradas requeridas y ausencia de ciclos. Empezar con DAG y ejecución secuencial; paralelismo posterior.

Cada conexión mapea una salida concreta hacia una entrada concreta. El motor conserva orden y datos entre pasos. No basta con encadenar strings indiscriminadamente.

Estados deseados de ejecución: PREPARANDO, VALIDANDO, PERMISOS, EJECUTANDO, FINALIZANDO, COMPLETADO, ERROR, CANCELADO. Los estados actuales del repositorio son otros; migrarlos coherentemente, no asumir que ya existen. Considerar resultados parciales y pasos omitidos tras un fallo.

Registrar usuario, workflow/capacidad y versiones, aprobación, inicio/fin, duración, estado de pasos, errores y referencias a resultados. Logs de infraestructura sin contenido sensible. Estadísticas derivadas de registros reales; definir qué cuenta como uso, intento y éxito.

## 9. Ejecución aislada

Separar API, cola/trabajadores y entorno de código no confiable. La API autoriza y registra; el trabajador solicita el sandbox; el código recibe solo entradas y herramientas permitidas; el resultado vuelve validado.

Prohibido ejecutar código generado con exec/eval o importarlo dentro del proceso principal de FastAPI. El usuario comparó la idea con un compilador; la solución propuesta es una cadena de preparación y pruebas más runtime aislado, no necesariamente compilación a binario.

Controles: límites de tiempo/CPU/memoria/procesos/salida, usuario sin privilegios, sistema de archivos de solo lectura salvo temporal asignado, sin montajes del host ni socket Docker, sin credenciales generales, red denegada inicialmente, limpieza del entorno y control de concurrencia.

Opciones propuestas: Linux con contenedores y gVisor, o proveedor administrado de sandboxes evaluado. Docker convencional no es la única barrera propuesta para código arbitrario. Windows local puede servir para UI/API; el aislamiento reforzado requiere entorno compatible. No ejecutar código peligroso en el computador personal por ahorrar hosting.

## 10. Conectores y autorizaciones

Usar OAuth y APIs oficiales. Login de Google para entrar a Capacita no concede acceso a Gmail. Conector del sistema distinto de conexión del usuario. Mantener tokens cifrados en backend, claves de cifrado separadas, renovación/revocación y selección de cuenta explícita.

La capacidad solicita una operación estructurada; un intermediario del backend valida propietario, scopes del proveedor, permisos del agente, aprobación de la acción y límites. El código generado no recibe tokens y no decide abrir red libremente.

Permisos de producto: preparar, leer, enviar/publicar, programar, eliminar y administrar son acciones separadas. Aprobación ligada a contenido, destino, parámetros relevantes y versión del plan. Cambios invalidan aprobación. Automatización recurrente requiere autorización explícita y límites; desconectar impide acciones pendientes.

Reintentos con control de duplicados, ids externos y reconciliación; no prometer ejecución exactamente una vez en todas las APIs. Mostrar resultados por canal y fallos parciales.

Referencias de scopes discutidas, sujetas a verificación al implementar:

- Gmail: gmail.send para envío; gmail.readonly solo si realmente se necesita lectura. Google aplica requisitos distintos a scopes sensibles/restringidos.
- Instagram Login: instagram_business_basic e instagram_business_content_publish; orientado a cuentas profesionales. Facebook Login usa otra familia de permisos.
- Facebook Pages: pages_show_list, pages_read_engagement, pages_manage_posts y acceso apropiado a la página.
- Revisión de aplicaciones, verificación y cuotas de proveedores pueden condicionar disponibilidad pública. No prometer cuentas personales o acciones no soportadas.

## 11. Interfaz y módulos finales

Requisito de experiencia confirmado por el usuario el 16/11/2026: ofrecer un
modo guiado para personas sin conocimientos técnicos y otro modo desarrollador.
Es un requisito acordado. Su implementación y evidencia actual están separadas
en [modos de uso A](MODOS_USO_A.md); no asumir completa toda la visión por existir esos modos.
En modo guiado, la persona describe su necesidad; la IA interpreta, pregunta si
falta información, busca primero en el catálogo autorizado y propone reutilizar,
configurar, combinar o crear capacidades faltantes. La persona revisa datos,
resultados esperados y aprobaciones; no copia JSON ni necesita conocer candidatos,
hashes, contratos o versiones para avanzar. La preparación de capacidades nuevas
debe mostrar sus estados reales y exigir pruebas aisladas antes de habilitarlas.
La IA hace la mayor parte de la preparación sin concederse permisos ni sustituir
la aprobación para acciones externas.

El modo desarrollador conserva edición de contratos/código, pruebas, versiones
y grafos avanzados. Ambos modos consumen los mismos servicios, catálogo y
autorizaciones: cambiar de experiencia no cambia privilegios ni visibilidad.
La existencia de una interfaz técnica no sustituye la aceptación del recorrido guiado.
Miguel diseña e integra la experiencia A usando contratos existentes de B;
cualquier soporte faltante de motor/laboratorio se coordina con Fahida.

Conservar autenticación y diseño existente donde aporte. Espacio central con objetivo/conversación, propuesta visual, entradas y resultados. Formularios derivados de contratos para capacidades individuales. Editor de nodos con parámetros y conexiones; mapa exploratorio de capacidades y procedencia como evolución funcional, no decoración.

Módulos: Auth, dashboard, perfil propio y público, catálogo, búsqueda tradicional/semántica, detalle, estudio de creación, detección de similares, planner, constructor y validador, permisos/aprobación, ejecución/resultados, historial, estadísticas, conexiones y administración.

Claridad, responsividad, accesibilidad, cargas, estados vacíos, errores y acciones funcionales. No presentar datos inventados como reales. Mocks solo identificados durante desarrollo; no usarlos para ocultar indisponibilidad o demostrar una función como terminada.

## 12. Arquitectura tecnológica propuesta

- Frontend: React, Vite, Tailwind, JavaScript actuales; no migrar todo a TypeScript durante la entrega.
- Grafos: React Flow abierto, @xyflow/react. Su UI no sustituye validación del backend.
- API: Python, FastAPI, Pydantic/JSON Schema; backend modular antes que múltiples microservicios.
- Persistencia: Supabase Auth, PostgreSQL, RLS, pgvector y Storage privado con URLs limitadas.
- IA: interfaz de proveedor propia para interpretación, generación, embeddings y operaciones de IA. Elegir modelo disponible después de probar casos; credenciales solo backend.
- Procesos: Celery y un broker compatible, inicialmente propuesta Redis; fijar versión y revisar licencia/despliegue antes de adoptar. PostgreSQL conserva estado persistente. Puede evaluarse un worker más simple para la entrega sin bloquear evolución.
- DAG: graphlib de Python inicialmente; contratos y conexiones explícitos.
- HTTP/conectores: cliente Python controlado y SDKs oficiales cuando aporten.
- Sandbox: servicio independiente autogestionado con gVisor o administrado.
- Calidad: lint existente, pytest y Playwright para recorridos críticos.
- No se acordó comprar un framework de agentes, una base vectorial separada ni desplegar Kubernetes.

## 13. Modelo de datos orientativo

Inspeccionar primero Supabase real y mapear nombres; no crear tablas paralelas en español/inglés sin razón.

- Perfiles asociados al UUID de Auth.
- Capabilities: identidad, autoría, visibilidad, propósito, categoría, estado y fechas.
- Versiones/implementaciones: contratos, tipo, proveedor, artefactos, hashes y dependencias.
- Especializaciones/configuraciones.
- Workflows/versiones, pasos y conexiones con versiones fijadas.
- Construcciones y pruebas: resultados y evidencia.
- Runs y pasos: estados, datos/referencias, errores, tiempos.
- Connections: autorizaciones por usuario; secretos protegidos.
- Approvals y política de acciones.
- Derivaciones y atribución de capacidades.
- Embeddings con modelo y versión para consistencia y regeneración.

RLS y controles de aplicación; si se usa una credencial que omite RLS, filtrar explícitamente en backend. Datos de ejecuciones y archivos solo para su dueño. No guardar información sensible sin necesidad y política de retención.

## 14. Presupuesto y límites

Equipo universitario con poco presupuesto. El usuario aceptó conservar visión y controlar recursos, no convertir el proyecto en una demo visual o limitarlo permanentemente a documentos/marketing.

Sin licencias de pago necesarias para la base React/Vite/Tailwind, FastAPI/Pydantic, PostgreSQL/pgvector, Celery y herramientas de pruebas. Software gratuito no elimina costos de hardware, mantenimiento, energía o alojamiento.

Opciones revisadas a 13/11/2026, verificar condiciones antes de utilizarlas:

- Supabase Free: referencia de 500 MB de BD y 1 GB de archivos; cuotas, pausa por inactividad y ausencia de backups automáticos. No contratar Pro por anticipado.
- Gemini API: modelos seleccionados con nivel gratuito, cuotas sujetas a cuenta/modelo/región. Contenido gratuito puede usarse para mejorar productos según términos; usar datos no privados y revisar condiciones.
- E2B Hobby: referencia de USD 100 de crédito único, sin mensualidad base y con cobro de uso; no ilimitado ni crédito mensual. No contratar Pro para evaluar.
- Equipo del grupo o recursos universitarios para API/trabajadores; disponibilidad depende del equipo.
- GitHub Student Developer Pack para beneficios sujetos a elegibilidad y aprobación; no dar créditos por obtenidos.
- Dominio propio y hosting público continuo opcionales para una primera demostración, según modalidad de entrega.
- APIs de imágenes, video, modelos especializados u otros proveedores pueden tener costos independientes. OAuth no vuelve gratis un servicio.

Objetivo de factura inicial USD 0 condicionado a cuotas, créditos y equipos; no garantía permanente. No comprar ni activar facturación sin autorización. Medir consumo con casos reales antes de fijar reserva de presupuesto.

Controles: reutilizar implementaciones, generación solo cuando falte una pieza, intentos limitados, cuota por usuario, concurrencia acotada, límites de archivos/tiempo/tokens, expiración de temporales y registro de costos. Cambiar proveedor mediante interfaz sin rehacer módulos.

## 15. Fases y entrega

1. Estabilizar identidad, rutas, dependencias y persistencia; conservar Auth.
2. Unificar catálogo y contratos/versiones con ejecución real.
3. Búsqueda interna, planner y validación de propuestas.
4. Taller de creación, sandbox, pruebas y habilitación.
5. Composición guardable y reutilización entre usuarios.
6. Conectores, aprobaciones y automatización con límites.
7. Historial, métricas, colaboración, calidad y ampliación de recursos.

Son dependencias conceptuales; cada etapa debe entregar recorrido usable y pruebas pertinentes. No afirmar que todo cabe en una fecha sin comprobar capacidad del equipo y servicios disponibles.

Demostración propuesta para el martes interpretado como 17/11/2026: necesidad → búsqueda interna → pieza faltante → contrato → generación Python limitada → pruebas aisladas → ejecución real → publicación voluntaria → reutilización por otra cuenta. Priorizar texto/CSV/JSON y paquetes preparados para demostrar la arquitectura abierta con recursos controlados. No es una reducción permanente del alcance.

Conexiones externas reales pueden añadirse si permisos y recursos ya están disponibles; nunca simular publicación como éxito. No prometer revisión de Google/Meta aprobada para la fecha.

## 16. Criterios de aceptación

- Registro/login/logout y sesión siguen funcionando; rutas privadas y API autorizadas.
- Catálogo persistente y coherente con el motor; disponible significa implementación habilitada.
- Búsqueda respeta privacidad; planner no inventa ids.
- Creación genera contratos, código cuando haga falta, pruebas y versión; no solo una descripción.
- Código candidato aislado; límites se comprueban y fallos no se marcan como éxito.
- Workflows guardables, conexiones compatibles y sin ciclos.
- Aprobación concreta para acciones externas y credenciales fuera del sandbox.
- Ejecución real con resultados e historial persistentes y métricas verificables.
- Dos usuarios pueden reutilizar una capacidad sin compartir datos privados.
- Versiones y procedencia visibles; cambios no alteran procesos anteriores silenciosamente.

## 17. Referencias consultadas

Precios y condiciones no son acuerdos de contratación y pueden cambiar.

- https://supabase.com/docs/guides/ai/hybrid-search
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/pricing
- https://reactflow.dev/learn/customization/custom-nodes
- https://pydantic.dev/docs/validation/latest/concepts/json_schema/
- https://docs.celeryq.dev/en/main/getting-started/backends-and-brokers/redis.html
- https://gvisor.dev/docs/architecture_guide/intro/
- https://gvisor.dev/docs/architecture_guide/security/
- https://docs.docker.com/engine/security/
- https://ai.google.dev/gemini-api/docs/pricing
- https://e2b.dev/pricing
- https://education.github.com/pack
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/workspace/gmail/api/auth/web-server
- https://developers.facebook.com/docs/graph-api/reference/page/feed/
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api

## 18. Preguntas abiertas

Confirmar cuando sean necesarias: modalidad y fecha de entrega, infraestructura disponible, RAM/CPU del equipo, acceso administrativo a Supabase, cuotas de IA, elegibilidad de sandbox, proveedor de embeddings, conectores prioritarios, revisión de capacidades públicas, política de datos y presupuesto máximo. No pedir claves por chat ni interpretar la falta de respuesta como permiso de gasto.
