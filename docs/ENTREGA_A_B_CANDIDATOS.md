# Entrega de candidatos de Miguel a Fahida

14/11/2026. Guía y pruebas propuestas, no implementación de sandbox. El usuario
confirma que Fahida todavía no tiene sandbox: bloquea pruebas, habilitación y
ejecución de candidatos. No ejecutar código generado en FastAPI ni en el host.

## Paquete disponible

- Usuario confirmó generación, guardado y recarga del candidato `452d1c47…`, hash
  `07cef1a8d62fafdeb4f2cb57bfda7e208a7ebb150b81f6f874de1477d032e301`.
- Modelo `schemas.candidates.CandidateManifest`: código en proposal.source,
  contratos/ejemplos en definition, entrypoint main.run. Draft y sin pruebas.
- API autorizada: GET /api/capabilities/{capability_id}/candidates y
  GET /api/candidates/{candidate_id}; respuesta estándar en data. Usar UUID
  completo de la respuesta; el prefijo de ocho caracteres de UI no sirve como id.
- Usuario autorizó commit/push del bloque posterior a 711eacf para el cierre.
  B debe actualizar desde la entrega verificada de miguel; confirmar hash en Git.
  No asumir que los cambios están en main.

## Primer objetivo B

Demostrar transformación real dentro de aislamiento reforzado, con límites
comprobados y evidencia ligada a candidate_id/artifact_hash. Python y biblioteca
estándar inicialmente, sin red/conectores/archivos del usuario. No duplicar IA/catálogo.
Infraestructura, recursos y créditos aún no confirmados; no activar facturación.
Docker o una lista de imports no demuestran por sí solos aislamiento suficiente.

1. API verifica al dueño y obtiene el candidato mediante repositorio existente.
   B puede generar uno con su propia cuenta; no compartir contraseñas/tokens.
2. Revalidar paquete y recalcular hash según CONTRATO_INTEGRACION.md. Un estado,
   hash o campo provider insertable por el dueño no acredita pruebas del laboratorio.
3. API/trabajador entrega al runner solo código, contratos y datos autorizados.
   Nunca JWT, claves, .env, rutas arbitrarias del host ni permisos generales.
4. Dentro del sandbox, materializar main.py y llamar run(inputs, parameters)
   mediante harness mantenido por B. Validar contratos antes/después de invocar.
5. Persistir reporte privado con dueño, candidate_id, hash, entorno, límites,
   casos, tiempos y errores sanitizados. B propone esquema/repositorio con revisión A;
   aún no hay builds persistentes integrados. Un mensaje UI no sustituye evidencia.
6. Cambiar código/definición invalida evidencia anterior. Pasar casos no publica
   ni habilita automáticamente. No conectar candidatos al motor heredado como atajo.

## Casos independientes del candidato de espacios

Pruebas propuestas, no ejecutadas. parameters={} salvo indicación. Verificar
compatibilidad con la definición real guardada antes de adoptar esta tabla.

| inputs | Esperado |
| --- | --- |
| {"texto":"  Árbol  azul  "} | {"resultado":"Árbol  azul"}: conserva acentos/espacios interiores. |
| {"texto":"   "} | {"resultado":""}. |
| {"texto":""} | {"resultado":""}. |
| {"texto":"sin cambios"} | {"resultado":"sin cambios"}. |
| {"texto":"\tHola\n"} | {"resultado":"Hola"}; confirmar regla de whitespace. |
| {} | Rechazo por faltar texto. |
| {"texto":7} | Rechazo por tipo. |
| {"texto":"Hola","extra":true} | Rechazo por propiedad adicional. |
| {"texto":"Hola"}, parameters={"extra":true} | Rechazo de parámetros. |
| [] como inputs o null como parameters | Rechazo de contrato. |

Entradas inválidas deben rechazarse antes de ejecutar; la defensa interna del código
puede comprobarse aparte, siempre dentro del sandbox. No presentar expectativas como resultados.

## Evidencia de aislamiento requerida

Probar con candidatos separados: bucle infinito, exceso de memoria/procesos/salida,
salida no JSON y contrato de salida incorrecto. Nunca modificar candidato conservando
hash/evidencia. Verificar timeout, limpieza y concurrencia acotada; red denegada,
usuario sin privilegios, temporal por trabajo y ausencia de secretos/montajes del host
o socket Docker. Registrar límites concretos y resultados. Otra cuenta no puede
leer reportes/outputs/archivos/runs: 404. Ningún control está probado por figurar aquí.

## Trabajo A disponible mientras tanto

Privacidad real con segunda cuenta y comprensión de objetivos/planner con búsqueda
autorizada. El planner debe declarar ejecución pendiente mientras no haya versión
habilitada/evidencia B. El recorrido completo para el martes sigue en riesgo.
