# Publicación A/B: contrato propuesto para revisión

16/11/2026. PROPUESTA, no API implementada ni contrato aceptado por Fahida.
Usuario mantiene propiedad de archivos: Miguel trabaja solo en A y consume B3/B4;
Fahida entrega su bloque siguiente. No se aplicó SQL ni se modificaron sus archivos.

## Bloqueo concreto

Para la entrega en el PC de Fahida: B3/B4/B5 ya están integrados y la ejecución
privada de dos capacidades, historial y privacidad están aceptados. Esos bloques
no entregan publicación ejecutable. El usuario mantiene trabajo SOLO Miguel:
A puede cerrar su UI/API de publicación al recibir un contrato operativo de B,
pero no modifica unilateralmente sus RPC, motor, worker ni SQL. Esta dependencia
continúa abierta; no se ha aceptado retirar publicación de la entrega del martes.

Las RPC actuales de versiones y ejecución autorizan solo al propietario.
CandidateRepository también exige propietario. Hacer pública la definición no
habilita el uso del código por otra cuenta. Mantener esas restricciones mientras
no exista un contrato probado para publicación; no abrir candidatos privados.

## Interfaz mínima a acordar

1. B resuelve un descriptor de versión por ID si el solicitante es su dueño o
   existe una publicación activa autorizada. Incluye capability_id, version_id,
   artifact_hash, definition_hash, estado, permisos y contratos. Nunca source,
   tokens, entradas, salidas ni reportes privados.
2. Publicar requiere propietario, versión habilitada y evidencia de build
   persistida sobre esos hashes. La operación fija exactamente esa versión y la
   atribución/licencia elegida; publicar código es consentimiento separado.
3. A muestra el descriptor real en catálogo/búsqueda/perfil y ofrece Usar.
   Para un usuario distinto, B acepta el version_id público con inputs/parameters
   propios e Idempotency-Key. B resuelve el artefacto sin entregar al cliente el
   candidato privado del creador. El run, sus archivos y resultados son del ejecutor.
4. B vuelve a comprobar publicación/versión al encolar y ejecutar. Una retirada o
   deshabilitación impide nuevas ejecuciones según política acordada; conserva
   historial privado y versiones fijadas. Un cambio de código requiere pruebas
   y una versión/publicación nuevas, no hereda evidencia anterior.
5. Publicar/despublicar catálogo y permiso de resolver la versión deben conservar
   coherencia transaccional. Un booleano del navegador no concede permisos.

Rutas y nombres de RPC finales deben acordarse con B; no se añade un endpoint
vacío para simular que esta interfaz ya existe. A conserva la clonación de
definiciones como borrador privado, que no copia habilitación ni evidencia B.

## Aceptación conjunta pendiente

- A publica una versión realmente probada; B la encuentra en catálogo/planner.
- B ejecuta con datos nuevos y resultado correcto; no necesita regenerar código.
- B recibe 404 al pedir candidato, reportes y runs privados del creador.
- A recibe 404 al pedir entradas, archivos y resultados de B.
- Editar o deshabilitar la implementación no reutiliza evidencia ni aprobación vieja.
- La retirada impide nuevos usos y no borra historial ni revela contenido privado.
- Repetir una solicitud con la misma clave no duplica el run del mismo usuario.
