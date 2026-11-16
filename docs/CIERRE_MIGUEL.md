# Cierre completo del frente Miguel

## Entrega actual — 16/11/2026

Nuevo bloque A: modos Guiado/Desarrollador implementados; evidencia y límites en
[modos de uso](MODOS_USO_A.md). Guiado sin JSON manual, con formularios,
aprobación y resultado. Siete grupos simulados y helpers pasan; propuesta Gemini
y ejecución guiada reales con resultado persistente y privacidad entre cuentas.
La creación nueva desde esta UI tiene aceptación simulada, no otra generación
remota. Usuario prefiere mantener entrega en miguel; no PR ni main para ensayar.

Bloque anterior entregado y verificado en `origin/miguel`: `0b06172` (consulta directa a
GitHub y HEAD coincidentes). Árbol limpio al iniciar este cierre. B3/B4/B5 de
Fahida están integrados; los últimos cambios de producto son exclusivamente A.
La entrega se prepara para el PC de Fahida. No hay merge a main ni despliegue.

**Verificado:** catálogo/búsqueda/perfil, definición y generación privada,
reparación acotada, planner real con dos capacidades distintas, guardado y
reapertura, ejecución real, historial tras recarga/reinicio API y privacidad con
dos cuentas normales. Inicio y perfil enlazan a recursos exactos; móvil sin
desborde a 320/390/640. Lint/build/imports y regresiones A pasan; batería backend
previa de 160 pruebas, sin cambios backend posteriores por estos enlaces.

**Pendientes que impiden afirmar «todo terminado»:**

- Ensayo del modo guiado en el PC de Fahida y, si se exige para la aceptación,
  nueva creación remota desde esa UI. Los modos ya están implementados y probados
  con los alcances diferenciados en su guía.
- Publicación/retiro ejecutable y reutilización entre autores: A tiene propuesta
  de contrato y espera soporte B de resolución/ejecución compartida. No se ha
  implementado la publicación A ni se ha aceptado retirarla de la entrega.
- Revisión del PR e integración/ensayo en el PC de Fahida, pendientes hasta que
  se realicen allí. [Guion y arranque](ENTREGA_MARTES.md).
  [Comparación oficial para abrir el PR](https://github.com/miguelvivasvergel-creator/CAPACITA/compare/main...miguel),
  con [descripción preparada](PR_MIGUEL_A.md); aún no creado al revisar este cierre.
- OAuth y cambios reales de correo/contraseña no certificados. Las sesiones de
  presentación previstas usan correo/contraseña; los fallos de Configuración
  tienen aceptación simulada, sin alterar credenciales personales.
- pgvector global y búsqueda de workflows públicos permanecen pendientes de
  decisión de alcance. La semántica local actual no se presenta como pgvector.

Miguel no asume las pruebas internas/desarrollo B6, motor, sandbox, workers,
archivos de ejecución ni conectores de Fahida. El candidato de reparación nuevo
requiere evidencia B antes de habilitarse; no es código A pendiente de generar.

La auditoría original conservada debajo explica los hitos previos. Sus casillas
no constituyen el estado actual; prevalecen este resumen y la tabla actualizada.

Auditoría del 16/11/2026 sobre `miguel`, HEAD `8f879ab`. Fuentes: reparto A1–A5,
visión maestra, continuidad, guías A/B y código actual. Inspección documental y
estática; no se ejecutaron nuevas pruebas remotas durante esta auditoría.
Las tareas de aquella auditoría eran pendientes entonces, no nuevas asignaciones a B.

## Avance posterior a esta auditoría — 16/11/2026

El inventario original de abajo se conserva como referencia. Estado actualizado:

Usuario confirma entrega en PC de Fahida y trabajo exclusivamente Miguel, con
extras posteriores si queda tiempo. Guía de arranque/ensayo preparada allí;
su ejecución en ese equipo no verificada. A integra accesos de resumen/perfil
al historial B5 y recursos exactos, y corrige menú móvil. No asume el desarrollo B6.

Aceptación posterior con worker local protocolo 2: mayúsculas build 8a2c1355
5/5, habilitación privada 28be84c1, planner real compose con dos versiones
distintas y transferencia resultado → texto. Workflow a1518d9e guardado/reabierto
idéntico y run f89dd4c7 completed, ambos pasos correctos en gVisor. M06 ya tiene
aceptación positiva integrada. Reinicio API conserva ocho huellas y resultado UI;
privacidad técnica pasa con cuenta worker distinta (5 GET 404 y listas sin recursos).
Privacidad repetida desde segunda cuenta normal en navegador: cinco 404,
listas sin recursos privados, selección planner forzada 409 y enlaces directos
historial/workflow bloqueados. Faltan errores B6 y publicación conjunta.
M13 dispone de worker activo. B5 integrado en
9ef14a5; no incluye publicación. Detalle y UUID completos en continuidad.

| Bloque | Avance verificado | Lo que sigue pendiente |
| --- | --- | --- |
| M01–M02 | Propuesta de contrato en CONTRATO_PUBLICACION_A_B.md; sin abrir candidatos privados | Acordar e integrar el soporte B para publicar versiones ejecutables |
| M03 | Catálogo/búsqueda abren TrabajoCapacidad; mayúsculas habilitada y proceso de dos versiones ejecutado realmente; worker local activo | Uso por otro autor depende de publicación B |
| M04 | Pieza faltante → definición → espacio de implementación; retorno del objetivo por cuenta hasta 48 h y nueva revisión; seis grupos visuales pasan; segunda capacidad habilitada y planner real aceptado | Ensayo de la transición completa en el PC de Fahida |
| M05 | Reparación explícita acotada implementada y aceptada con Gemini real 201; candidato anterior intacto, nuevo borrador persistido | Pruebas/habilitación del nuevo candidato por B |
| M06 | Mayúsculas 5/5, habilitada; planner real, guardado/reapertura, aprobación y dos pasos distintos completed; reinicio API conserva ocho huellas e historial; privacidad con worker y segunda cuenta normal pasa | Errores/resto de matriz B6 |
| M07 | Dos identidades reales distintas: versión oculta, selección forzada 409, seis lecturas privadas 404 y listados sin recursos ajenos | Repetir privacidad para publicación cuando exista ese contrato |
| M09 | Filtros servidor por categoría/autor/tipo y paginación; planner con semántica local explícita, aceptada realmente | pgvector global y búsqueda de workflows no implementados; interpretación/generación conservan búsquedas textuales |
| M10 | Perfil propio con resumen y listas/detalles privados B; lectura real de dos runs/tres workflows; perfil ajeno no consulta listas privadas | Workflows públicos dependen de publicación B; la actividad privada no se publica |
| M11 | Autor #perfil, títulos, teclado; resumen/perfil enlazan al historial B5 y recursos exactos; menú móvil 320/390/640 correcto | Ensayo final en PC de Fahida |
| M12 | Sesiones A/B reales; Configuración recupera errores de red y distingue confirmación de correo, cinco grupos con Auth simulado | Confirmaciones reales de correo/contraseña y OAuth no certificadas; no se alteraron credenciales reales |
| M13–M14 | A/B3/B4/B5 integrados; worker autorizado activo, 160 pruebas y recorrido positivo real de dos capacidades con historial tras recarga | Resto de matriz B6 y publicación conjunta |
| M15 | Código y guías actualizados y subidos a origin/miguel 0b06172, remoto confirmado; borrador PR preparado | Crear/comprobar PR y revisión cruzada; ensayo en PC Fahida |

El usuario reiteró que solo se edita el frente Miguel; no se transfirieron archivos B.
Los registros nuevos son privados: una reparación y una segunda definición/candidato
de datos sintéticos, más una copia B de una definición pública. Comunidad real:
clonación 201, persistencia privada/draft y atribución comprobadas sin duplicar.
No se ejecutó código nuevo ni se repitieron migraciones.

## Base disponible

- Auth real en FastAPI, visibilidad y repositorios persistentes de catálogo.
- Definición estructurada, interpretación y generación de candidatos privados.
- Perfil propio editable, avatar y perfil público; aceptación real documentada.
- Búsqueda textual y semántica local E5; privacidad real de búsqueda documentada.
- Dashboard con consultas reales y comunidad conectada; aceptación comunitaria
  completa entre cuentas pendiente.
- Planner con selección, consentimiento, huellas y validación del contrato B.
  Un paso y dos pasos sobre una misma versión: propuestas reales guardadas y
  reabiertas. Esos planes no se han ejecutado.
- Integración de B3/B4 privados de Fahida. Evidencia remota de B pertenece a su
  entrega; no equivale a repetirla en el equipo de Miguel.
- Última batería: 145 pruebas backend, lint/build/imports/enlaces correctos;
  pruebas simuladas no certifican RLS ni toda la aplicación desplegada.

## P0: recorrido funcional completo y privacidad

### M01. Cerrar el contrato de publicación con Fahida — A/B

- [ ] Definir cómo publicar una versión probada, retirarla y resolver acceso de
  otro usuario sin mostrar candidato/código privado ni datos del creador.
- [ ] Acordar evidencia exigida, permisos, procedencia/licencia y comportamiento
  al editar o deshabilitar una versión usada por un workflow.
- [ ] A integra el contrato compartido; B adapta resolución/ejecución de versiones.

Evidencia del bloqueo: `execution_versions` y enqueue de SQL 07 restringen a
`owner_id=auth.uid()`; `CandidateRepository` solo lee candidatos propios. Cambiar
únicamente `visibility` del catálogo no permite reutilizar una implementación.

Aceptación: un segundo usuario resuelve y usa una versión publicada sin poder
consultar candidato privado, entradas, reportes ni resultados del creador.

### M02. Implementar publicación/despublicación A — Miguel, depende de M01

- [ ] Operaciones backend y UI explícitas, propietario verificado y evidencia B
  persistida ligada al hash. Separar habilitar, publicar y compartir código.
- [ ] Mostrar versión ejecutable real, estado, permisos, ejemplo y pruebas resumidas.
- [ ] Derivar conservando atribución y sin heredar evidencia de código modificado.

Evidencia: `require_draft` en capabilities rechaza publicar por status; actualmente
no hay recorrido completo de publicación verificada. Clonar crea borrador privado.

### M03. Conectar catálogo con ejecución real — A/B

- [ ] A conecta Usar desde catálogo, búsqueda y detalle con la versión autorizada;
  un borrador o versión inactiva no debe aparecer como ejecutable.
- [ ] B entrega/adapta la pantalla de entrada, aprobación, resultado e historial
  para los contratos actuales; A integra navegación y revisa el recorrido.
- [ ] Impedir entrar a la ruta heredada con fallback a mocks mientras no se adapte.

Evidencia: `MisCapacidades.handleUsar` solo muestra pendiente; `Ejecutar.jsx`
sigue montado en App y usa `services/ejecucion.js`, cuyo catch devuelve mock y
cuyo POST usa capability_id/workflow_id/text. El router real exige version_id,
inputs/parameters e Idempotency-Key. Es incompatibilidad comprobada por inspección;
la reparación de archivos B requiere coordinación, no edición unilateral de A.

### M04. Completar objetivo → pieza faltante → capacidad funcional — Miguel + B

- [ ] Conectar decisiones reuse/compose/create/clarify/blocked con acciones útiles.
- [ ] Si falta una pieza: conservar objetivo y restricciones al pasar al formulario,
  generar candidato, entregar al laboratorio B, recuperar evidencia/habilitación
  y retomar el plan. Revisión/consentimiento/guardado explícitos en cada transición.
- [ ] Evitar que una coincidencia existente termine innecesariamente en clonación
  o generación nueva; reutilizar/configurar parámetros cuando corresponda.

Evidencia: interpretación, definición, generación y planner existen, pero el
planner `create` solo lista faltantes y no conduce a su creación; el flujo sigue
fragmentado. A no reemplaza el laboratorio ni el motor B.

### M05. Cerrar reparación acotada de candidatos — Miguel, usa evidencia B

- [ ] Crear nuevo candidato a partir de un fallo sanitizado, con intento explícito,
  límite de intentos/cuota y hash nuevo. No alterar el candidato ya probado.
- [ ] Repetir pruebas B y no heredar habilitación de la versión anterior.

Estado: generación inicial y validaciones existen; no se encontró un recorrido de
reparación implementado. Es entregable de A3 del reparto, no función completada.

### M06. Aceptar el planner con dos capacidades distintas — Miguel + B

- [ ] Disponer de dos versiones compatibles realmente habilitadas por B.
- [ ] Objetivo real → propuesta → revisar/importar → guardar/reabrir → aprobar y
  ejecutar en sandbox; comprobar transferencia de una salida a la siguiente.
- [ ] Cambiar opciones/entradas y verificar comportamiento, errores y persistencia.

Lo probado hasta ahora: dos pasos independientes reutilizando una sola versión;
dos versiones distintas solo en pruebas con transporte/proveedor simulados.

### M07. Cerrar privacidad real entre dos cuentas — Miguel, revisión B

- [ ] Segunda sesión verificada distinta; planner no lista versiones privadas A.
- [ ] Forzar ID/huella de A desde B: rechazo antes de Gemini, sin filtrar metadatos.
- [ ] Workflow generado: lectura propia 200, ajena 404 y ausente del listado ajeno.
- [ ] Repetir límites de acceso al publicar, retirar y ejecutar versiones compartidas.

No repetir innecesariamente pruebas de perfil/búsqueda ya documentadas salvo
regresión por cambios; la nueva aceptación de planner sigue pendiente.

### M08. Demostración de reutilización entre usuarios — Miguel + B

- [ ] Usuario A crea una capacidad desde una necesidad, la prueba, habilita y
  publica voluntariamente; usuario B la encuentra y usa con datos nuevos.
- [ ] Comprobar resultado correcto, atribución y aislamiento de los datos de ambos.
- [ ] Guardar evidencia del recorrido completo, no unir pruebas parciales como si
  fueran una ejecución integrada. Este es el diferenciador comprometido.

## P1: completar módulos y experiencia de Miguel

### M09. Integrar búsqueda con el trabajo del asistente — Miguel

- [ ] Reutilizar la búsqueda semántica autorizada al buscar piezas/similares en el
  asistente, o documentar como alcance aceptado que esos recorridos son textuales.
- [ ] Completar filtros de categoría/autor/tipo y paginación desde backend donde
  se prometan globales; MisCapacidades filtra solo las filas cargadas.
- [ ] Resolver búsqueda de workflows con contrato B o mantener exclusión explícita
  acordada. `workflow_search_available` sigue siendo false.
- [ ] Si se exige la arquitectura completa del plan: índice/backfill/versionado de
  embeddings; E5 local limitado a 200 no implementa pgvector global.

Los dos últimos puntos exigen decisión de alcance: no son defectos ocultos ni
deben darse por completados con la solución local actual.

### M10. Terminar perfil, métricas y comunidad — Miguel, datos B donde aplique

- [ ] Aceptación remota de comunidad: buscar, paginar, abrir detalle/perfil,
  clonar y comprobar persistencia/atribución con otra cuenta.
- [ ] Conectar métricas/actividad propia autorizadas; decidir actividad pública
  agregada sin exponer ejecuciones privadas. No publicar historial privado.
- [ ] Resolver pestaña workflows públicos mediante contrato de publicación B o
  retirar del alcance acordado. Perfil muestra pendientes en workflows/actividad;
  `/users/{username}/activity` responde 503 explícito.
- [ ] Revalidar dashboard después de runs reales completados/fallidos y cambio de
  sesión. Un endpoint de agregados mínimos es mejora de eficiencia, no requisito
  para sustituir el resumen paginado ya funcional.

### M11. Cerrar navegación y acciones visibles — Miguel, coordinación de pantallas B

- [ ] Corregir enlace de autor del detalle: hoy usa `#u/...`; App admite `perfil/...`.
- [ ] Verificar atrás/adelante, enlaces directos, recarga, cambio de sesión y móvil.
- [ ] Mantener contexto del objetivo al pasar entre planner, creación y constructor.
  La importación manual actual funciona; transferencia automática es mejora hasta
  que se acuerde exigirla para la entrega.
- [ ] Repasar estados vacío/error/carga, teclado, foco de modales y formularios;
  ningún error de servicio debe sustituirse por ejemplos en el recorrido real.

### M12. Cerrar aceptación de cuenta/configuración — Miguel

- [ ] Registro, login/logout, expiración/renovación y OAuth/callback configurado
  para el entorno de entrega. Documentar qué método se usará en la presentación.
- [ ] Verificar cambio de correo/contraseña con cuenta de prueba cuando entre en
  el alcance; existen llamadas reales, no evidencia de aceptación aquí.
- [ ] Comprobar que usuario/perfil y datos se limpian correctamente al cambiar
  de cuenta; no modificar las credenciales personales para hacer pruebas.

## P2: integración y entrega A5

### M13. Verificar el entorno integrado de Miguel — A/B

- [ ] Confirmar worker B autorizado/protocolo correcto y sandbox operativo antes
  de ejecutar; no arrancar duplicados ni volver a aplicar SQL 07/08 ya aplicados.
- [ ] Resolver ausencia actual de configuración worker local o usar un trabajador
  autorizado existente, coordinando con Fahida.
- [ ] Arranque limpio, reinicio API/worker y recuperación, con datos no sensibles.
  Evidencia de B se conserva como tal hasta repetir el recorrido integrado.

### M14. Matriz final y ensayo — Miguel integrador + Fahida revisora

- [ ] Matriz del apartado 10 del reparto: casos positivos, entradas nuevas,
  errores de contratos, permisos, servicio IA/sandbox caído y reinicios.
- [ ] Repetir checks afectados tras cambios, lint/build y pruebas completas.
- [ ] Guion con dos usuarios, resultados esperados y límites; ensayo en el equipo
  de entrega y grabación identificada como respaldo.

### M15. Cerrar documentación y Git — Miguel

- [ ] Actualizar README e inventarios que aún describen .NET/bloques B como
  pendientes pese a la integración; conservar historial sin contradicciones actuales.
- [ ] Documentar arranque, variables sin secretos, migraciones aplicadas, contratos,
  cuotas/límites y evidencia de cada criterio de aceptación.
- [ ] Subir los commits locales de miguel cuando se autorice su entrega; abrir PR,
  revisión cruzada y resolver observaciones. Nunca push directo a main.
- [ ] Versión candidata integrada y guía reproducible; despliegue solo si se
  requiere y está autorizado. No confundir push, merge y publicación de la app.

Git observado: árbol limpio antes de esta auditoría; HEAD 8f879ab. Tracking local
origin/miguel está cinco commits por detrás, sin divergencia. No se consultó el
remoto por red en esta auditoría: ese dato no acredita su estado actual en GitHub.

## Dependencias que no son implementación exclusiva de Miguel

Capacidades compuestas, agente guardado, conectores OAuth, archivos de ejecución,
motor, historial/resultados y sandbox son de B según el reparto. Miguel integra
navegación, catálogo/visibilidad, contratos y verificación cruzada. Para declarar
terminada toda la visión, también hay que resolver esos frentes; no se cierran
con pantallas A. El piloto de conexión depende de accesos aprobados y era
condicional. No se acordó que Miguel implemente todos los proveedores externos.

Orden recomendado: M01–M04 y M13 → M06–M08 → M05/M09–M12 → M14–M15. Las pruebas
de privacidad acompañan cada bloque. Resolver primero publicación/ejecución y
recorrido integrado antes de ampliaciones visuales o métricas secundarias.
