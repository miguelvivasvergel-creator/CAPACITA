# Modos de uso — frente Miguel

16/11/2026. Implementación A que consume las APIs B3/B4/B5 existentes.
No cambia motor, laboratorio, worker, SQL ni permisos de Fahida.

## Modo guiado

Es la experiencia inicial cuando una cuenta no tiene preferencia guardada.
La persona describe su necesidad; no debe elegir entre buscar, componer o crear.

1. Busca versiones habilitadas del catálogo autorizado sin invocar IA.
2. Con autorización explícita, envía objetivo, aclaraciones y metadatos/contratos
   de hasta doce herramientas encontradas a Gemini. La selección es automática;
   el proveedor propone reutilizar, combinar, aclarar o declarar un faltante.
3. Presenta pasos y opciones de forma legible. Guarda directamente la definición
   validada mediante la API existente: no requiere copiar/importar JSON.
4. La persona completa campos de texto, números, opciones, listas u objetos
   estructurados. «Confirmar y ejecutar» solicita la aprobación de esa revisión
   y esos datos y después encola mediante la API B. No ejecuta desde el navegador.
5. Muestra estado, pasos, resultados parciales/finales y recuperación desde
   Mis resultados. Los valores se muestran como texto, nunca HTML.

La búsqueda guiada inicial es textual y limitada; una coincidencia no prueba
equivalencia. El recorte se indica explícitamente. La semántica local E5 sigue
disponible en las herramientas avanzadas; no se declara pgvector global.

## Si falta una herramienta

- Si la búsqueda no encuentra versiones habilitadas, interpretación A busca en
  el catálogo y propone una definición o preguntas. Una propuesta `create` del
  planner también permite diseñar una pieza faltante con nueva autorización.
- Se muestran propósito, datos que recibe/entrega y reglas. Antes de guardar se
  revisan similares; si los hay, se exige reconocer que hace falta otra definición.
- Guardar crea una definición privada, no una implementación disponible.
- Preparar código requiere una autorización distinta para definición/ejemplos
  sin datos sensibles. El código permanece como candidato privado y no se ejecuta
  en frontend ni dentro de la API.
- La persona aporta datos y un resultado conocido mediante formularios. Se envía
  un caso de referencia al laboratorio B existente, con idempotencia y estado real.
  No se rellena ese caso automáticamente con el ejemplo que propuso la IA.
- Solo un reporte compartido superado permite ofrecer la habilitación privada;
  B vuelve a verificar evidencia, hashes y propietario. Superar un ejemplo no
  garantiza todos los casos ni sustituye la batería interna B.
- Después se vuelve a buscar y revisar la solución. No se heredan consentimiento,
  selección del planner ni aprobación. El objetivo se conserva por cuenta con el
  mecanismo existente de pestaña, máximo 48 horas.

Si faltan permisos/recursos externos, se indica que la herramienta aún no está
disponible. No se generan conectores ni se concede acceso externo automáticamente.

## Modo desarrollador y privacidad

Conserva las pantallas técnicas existentes: definición manual, contratos,
generación/reparación, código para inspección, laboratorio y constructor B.
No se añadió un editor arbitrario de código ni se alteró el ejecutor de B.

La preferencia se guarda en `localStorage`, separada por UUID de cuenta; si ese
almacenamiento está bloqueado funciona en memoria. No guarda tokens ni objetivos
en esa preferencia. Cambiar de modo no cambia roles, visibilidad ni autorizaciones.
Las rutas y APIs son las mismas; otra cuenta sigue recibiendo 404 para recursos
privados. Una operación guiada en curso bloquea el cambio de modo; el trabajo
sin guardar tiene aviso antes de descartarlo.

## Límites y tratamiento de errores

- Formularios para contratos estructurados con tipos básicos, enumeraciones,
  objetos cerrados y listas. Hasta seis niveles y cincuenta elementos por lista
  desde estos controles. Contratos abiertos, referencias y combinadores complejos
  requieren el modo desarrollador; se muestra el motivo y se bloquea el envío
  guiado. El backend sigue siendo la autoridad de validación.
- Un texto vacío válido puede elegirse expresamente en «Opciones de este dato».
  Las entradas de ejecución no se copian de ejemplos o resultados anteriores.
- Editar datos invalida aprobación/clave local. Un fallo de transporte al encolar
  conserva la misma aprobación y clave para evitar duplicados. No hay reintentos
  automáticos, ni nuevas llamadas IA por cargar una pantalla.
- Un guardado cuya respuesta se perdió no se repite automáticamente: se pide
  revisar las soluciones/herramientas guardadas antes de crear otra copia.
- Una cola sin trabajador muestra espera, nunca un resultado ficticio.
- Publicación ejecutable entre autores, archivos/conectores y el ensayo completo
  en el PC de Fahida siguen sujetos a sus pendientes; los modos no los implementan.

## Validación y evidencia

`verify_guided_data.mjs`: aislamiento de preferencias entre cuentas, almacenamiento
bloqueado, datos tipados sin ejemplos heredados, rechazo de esquemas no soportados
y orden de lectura por dependencias sin modificar el grafo.

`verify_guided_browser.js`: siete grupos con identidad/API simuladas en navegador
aislado. Consentimiento, búsqueda/selección automática, bloqueo de cambio de modo,
guardado separado, datos/aprobación, idempotencia, resultado legible, preferencia
desarrollador tras recarga, creación/generación/prueba/habilitación explícitas,
aclaraciones, recursos pendientes y fallos 409/503. Cero llamadas IA/escrituras reales.

Regresión del modo desarrollador: Perfil, seis grupos; Inicio, ocho grupos,
sin escrituras reales. Lint, build, helpers, imports y enlaces locales pasan.
Build conserva el aviso de tamaño del bundle.

Aceptación real con cuenta dueña verificada: una llamada Gemini 200 `compose`
selecciona dos versiones distintas sin selección manual ni JSON. Propuesta
revisada, sin guardar un workflow adicional. Formulario guiado sobre workflow
existente `a1518d9e-6fb9-4fa6-9c97-4a3e5573f442`: entrada «  Café nuevo  », aprobación
y run `024402c8-6183-4669-bc18-99bc20d3023d`, ambos pasos completed y resultado
«CAFÉ NUEVO». Historial guiado conserva salida tras recargar; móvil 390 sin
desborde. Segunda cuenta autenticada obtiene 404 y no ve el resultado en la ruta
guiada. El worker anterior se había detenido: se reinició una sola copia del
worker existente y procesó el mismo run, sin reenviar ni cambiar código B.

La creación de una nueva herramienta mediante esta interfaz está verificada con
fixtures, no con otra generación remota. La evidencia real previa de generación
y laboratorio se conserva separada. Capturas/scripts reales ignorados en
`output/playwright/guided-*`. No hay SQL ni nuevas dependencias.
