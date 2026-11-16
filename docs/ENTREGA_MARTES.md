# Entrega del martes: frente Miguel y consumo B3/B4

16/11/2026. Prioridad del usuario: entrega del martes, con trabajo limitado a
Miguel. Fahida no está disponible hoy y el usuario prevé su siguiente bloque
mañana. Modalidad local/enlace público todavía no definida; no hay despliegue.

## Avance A del bloque

- App ya no monta Ejecutar.jsx ni el servicio heredado con fallback a mocks.
  Conserva esos archivos B. Abrir una capacidad usa TrabajoCapacidad, con datos
  reales y los componentes LaboratorioCandidato/VersionPrivada existentes de B.
  El enlace viejo de workflow abre el constructor B4 existente, no su motor antiguo.
- Inicio/Capacidades, después de guardar una definición, abren ese espacio.
  Catálogo, búsqueda y comunidad permiten abrirlo. El planner sin piezas permite
  continuar a definición conservando objetivo y pidiendo consentimiento nuevo.
- Reparación A: POST /api/candidates/{id}/repair, feedback 10–1500 caracteres y
  consentimiento explícito para definición, ejemplos, código anterior y observación.
  Crea candidato NUEVO en borrador; valida propietario, hashes, definición vigente,
  sintaxis/firma y cambio de código. No ejecuta ni hereda evidencia/habilitación.
- Límite de reparación configurable CANDIDATE_REPAIR_LIMIT=2, 0 desactiva, máximo 5;
  por usuario/hora/proceso, espera 30 s y también cuota general 10/h. Contadores no
  distribuidos ni persistentes entre reinicios. No hay reintento automático.
- Buscar tiene categoría exacta, autor/username y tipo en el servidor, conservados
  en URL y paginación. Semántica incluye filtros en el cursor y los revalida.
  Planner permite elegir semántica local explícitamente; 200 capacidades como máximo,
  veinte coincidencias, primeros 200 caracteres del objetivo para esa búsqueda.
  Un modelo ausente produce error, no cambia silenciosamente a texto.
- Perfil propio incorpora resumen, listado paginado de workflows/runs y detalle
  privado de resultados/definición, por endpoints B existentes. Perfil ajeno no
  monta ni consulta esas listas. No se publica actividad privada.
- Enlace de autor corregido a perfil, títulos al navegar/recargar y parámetros URI
  inválidos tolerados. Detalle identifica diálogo y permite Escape/ciclo de Tab.
  Retirados contadores heredados sin conexión al motor de tarjetas/detalle/perfil.

## Evidencia real registrada

- Sesión A: espacio de trabajo carga candidato y versión B3 previamente habilitada.
- Filtros reales de categoría, autor y tipo devuelven la capacidad propia esperada.
- Perfil propio: dos runs y tres workflows cargados en esa observación; detalle de
  run recuperado. Son recuentos de ese momento, no constantes del producto.
- Segunda cuenta autenticada y distinta: versión privada ausente del planner,
  selección forzada rechazada 409; capacidad, candidato, dos workflows de prueba
  y dos runs ajenos devuelven 404. Listados completos de runs/workflows ajenos
  no contienen esos recursos. Perfil público no consulta las listas privadas.
- Una reparación Gemini real responde 201, persiste al releer y deja intactos
  código/hash anteriores. Candidato nuevo 5ef7a607-36a5-464d-8e80-9c0bd0d236dc;
  draft, implementation_verified=false, NO ejecutado.
- Planner semántico real devuelve search_kind=semantic y encuentra la versión
  privada propia habilitada. Sin llamada Gemini para esa búsqueda.
- Comunidad real en B: detalle/enlace de autor/Escape y clonación 201 de una
  definición pública; copia e9849bbe persistente, privada, draft y cloned_from
  conservado. No se clonó ni habilitó una implementación. Un error del script
  ocurrió después del 201; se recuperó por lectura sin repetir la clonación.
- Comprobación cruzada adicional: A recibe 404 para la copia privada B; B recibe
  404 para los dos candidatos nuevos de A (reparación y mayúsculas).

Validación final del bloque: 160 pruebas backend; lint/build/imports correctos,
28 documentos con enlaces válidos y siete checks dashboard. Grupos visuales
interceptados: Buscar 7, Perfil 6, Inicio 8, A4 6, Planner 5, Trabajo/reparación 4.
No consumen IA ni escriben datos reales. Las dos llamadas reales Gemini de este
bloque fueron reparación y generación de la segunda candidata, registradas arriba.

## Segunda capacidad preparada para laboratorio B

Definición privada: Convertir texto a mayúsculas.
capability_id: c7e2ed9f-7aeb-4ed3-9b6b-66f927ca7718.
candidate_id: ba6d86d4-61de-4c08-aa6b-59205d2edb71.
artifact_hash: 8c4f2849aa81eebb9e75f565f6252791fbfbb83cfa640fb41be4b140992a26eb.

Se buscó antes en catálogo autorizado sin coincidencias de mayúsculas. Definición
y candidato generados/guardados realmente; hash conservado al releer. Solo
biblioteca estándar, contratos texto → resultado string, sin permisos/recursos.
No se ha ejecutado, probado ni habilitado. No confundir persistencia con corrección.

Casos de referencia independientes para introducir en el laboratorio existente:

```json
[
  {"name":"acentos", "inputs":{"texto":"Árbol azul"}, "parameters":{}, "expected_output":{"resultado":"ÁRBOL AZUL"}},
  {"name":"espacios intactos", "inputs":{"texto":"  Niño  azul  "}, "parameters":{}, "expected_output":{"resultado":"  NIÑO  AZUL  "}},
  {"name":"vacío", "inputs":{"texto":""}, "parameters":{}, "expected_output":{"resultado":""}},
  {"name":"tipo incorrecto", "inputs":{"texto":4}, "parameters":{}, "expect_rejection":true, "expected_output":null},
  {"name":"campo ausente", "inputs":{}, "parameters":{}, "expect_rejection":true, "expected_output":null}
]
```

Cuando B lo pruebe y habilite, usar en un plan distinto: Normalizar espacios →
Convertir a mayúsculas, conectando resultado del primer paso a texto del segundo.
Con entrada nueva «  Niño  azul  » el resultado esperado final es «NIÑO  AZUL».
Esa composición de dos capacidades distintas sigue pendiente de aceptación.

## Bloqueos que no debe ocultar la entrega

1. Publicación ejecutable entre cuentas requiere el contrato B descrito como
   propuesta en CONTRATO_PUBLICACION_A_B.md. No está implementado ni aprobado.
2. El worker autorizado/protocolo correcto debe estar disponible para ejecutar;
   no se configuraron credenciales ni arrancaron copias. No repetir SQL 07/08.
3. Pruebas/habilitación del candidato de mayúsculas y ejecución integrada del
   plan de dos capacidades, con resultados y reinicio, pertenecen al cierre A/B.
4. Modalidad de entrega y eventual alojamiento público siguen sin definir.
   No hay servicio contratado, facturación activada ni despliegue de esta rama.

## Orden del ensayo

Arrancar según README; verificar sesión/health, modelo local y worker B disponible.
Reutilizar primero la capacidad existente; demostrar creación/corrección con datos
sintéticos y acciones explícitas. Mostrar reporte B y versión probada. Proponer,
guardar y ejecutar el proceso de dos capacidades cuando ambas estén habilitadas.
Mostrar persistencia propia y aislamiento en la segunda cuenta. Publicación/uso
entre cuentas solo se presenta como funcional al superar su aceptación conjunta.
