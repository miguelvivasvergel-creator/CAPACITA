# Entrega del martes: frente Miguel y consumo B3/B4/B5

16/11/2026. Usuario confirma presentación del martes 17 en el PC de Fahida y
trabajo limitado a Miguel. B3/B4/B5 ya integrados; no asumir desarrollo B6,
motor, sandbox ni cambios SQL de Fahida. Prioridad: cerrar y verificar A para
esa entrega; avances adicionales después, si queda tiempo. No hay despliegue.

## Preparación en el PC de Fahida — pendiente de realizar allí

Leer primero el [resumen para Fahida](PARA_FAHIDA_MARTES.md): cambios de Miguel,
pendientes de cada dueño y aceptación completa; B6 no se presume terminado.

Estas instrucciones no acreditan que el ensayo ya haya pasado en ese equipo.

1. Conservar los cambios locales y la configuración de Fahida. Revisar `git status`
   antes de integrar la entrega revisada de `origin/miguel` en la rama de trabajo
   acordada. El usuario no requiere PR para el ensayo ni cambios en `main`.
   No usar reset/clean ni sobrescribir su rama o `.env`.
2. Usar la raíz de su copia de CAPACITA; no copiar rutas `C:/Users/USER/...` de
   Miguel. Revisar [README](../../README.md) y sus guías [B3](BLOQUE_3_EJECUCION.md),
   [B4](BLOQUE_4_WORKFLOWS.md) y [B5](BLOQUE_5_RESULTADOS.md).
3. Verificar dependencias instaladas, sin reinstalar si ya coinciden con los
   lockfiles. Si faltan, desde la raíz: `npm ci` y
   `.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt`.
   La búsqueda semántica opcional requiere su instalación local aparte; elegir
   búsqueda textual si no está preparada, sin presentarla como semántica.
4. Mantener sus `.env` locales. Frontend: `VITE_API_URL=http://127.0.0.1:8000/api`
   y su configuración Supabase. Backend/worker leen `backend/.env`: Supabase,
   Gemini si se generará una propuesta, cuenta worker autorizada y
   `WORKFLOW_PROTOCOL=2`. No copiar claves de Miguel ni enviarlas por chat/Git.
   No repetir SQL 07/08 ni crear otra cuenta worker.
5. Coordinar un único equipo worker. El worker de Miguel ha quedado activo:
   antes del ensayo, detenerlo cuando esté libre si Fahida atenderá la misma
   cola. No arrancar duplicados ni terminar una ejecución en curso.
6. Desde la raíz, en terminales separadas, solo si no están ya activos:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
   ```

   ```powershell
   npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
   ```

   El trabajador se inicia con el comando B existente, cuando Fahida confirme
   sandbox y reserva disponibles:

   ```powershell
   .\.venv\Scripts\python.exe backend/services/shared_worker.py
   ```

   Debe confirmar «Trabajador compartido listo; sandbox recuperado». Si falla,
   seguir su guía B; Miguel no sustituye el aislamiento ni modifica su motor.

## Ensayo del frente Miguel en ese PC

- [ ] Abrir en modo **Guiado** (inicial por cuenta): necesidad → autorización IA
  → propuesta automática → guardar solución → completar campos normales →
  confirmar y ejecutar → resultado. No copiar JSON ni seleccionar versiones.
- [ ] Cambiar a **Desarrollador** para inspeccionar contratos, código y constructor
  avanzado; ambos modos conservan los permisos. Consultar [guía de modos](MODOS_USO_A.md).
- [ ] Para pieza faltante, revisar definición/similares y consentimiento separado
  de generación. Aportar una referencia conocida y esperar reporte B antes de
  habilitar. Si hay cola/cuota/recurso pendiente, mostrar ese estado real.
- [ ] API responde en `/api/health` y frontend abre `http://127.0.0.1:5173`.
- [ ] Entrar con las dos cuentas de prueba en ventanas aisladas. Método previsto:
  correo/contraseña, ya usado en la aceptación de Miguel; confirmarlo allí.
  OAuth y cambio de credenciales reales no se declaran certificados.
- [ ] Inicio: herramientas/resumen reales; «Abrir mis resultados» abre resultados
  guiados («Abrir mis ejecuciones» en desarrollador).
- [ ] Perfil propio: Actividad → detalle → resultado completo; Workflows → detalle
  → abrir proceso exacto, sin aprobación heredada. Perfil ajeno sin listas privadas.
- [ ] Búsqueda textual, filtros, detalle, autor y clonación privada con atribución.
  Reutilizar datos de prueba; no clonar/generar repetidamente durante el ensayo.
- [ ] Planner encuentra las dos versiones privadas habilitadas. Si se muestra IA,
  una propuesta explícita con datos sintéticos y consentimiento; revisar conexiones.
  El proceso guardado permite demostrar el uso sin regenerar código.
- [ ] Con la cuenta dueña, abrir workflow `a1518d9e-6fb9-4fa6-9c97-4a3e5573f442`:
  normalizar extremos → mayúsculas. Entrada `{"texto":"  Niño  azul  "}`;
  resultado `{"resultado":"NIÑO  AZUL"}`, con doble espacio interior conservado.
  Guardar/revisar y aprobar datos antes de una ejecución nueva.
- [ ] Historial: dos pasos, resultado final, recarga, copia/descarga. El run de
  evidencia `f89dd4c7-f2b8-4ed0-9c8a-6cab44ad2a13` ya existe; no repetirlo para leerlo.
- [ ] Segunda cuenta: enlaces privados dan 404, sin resultados/editor ajenos;
  planner no ofrece la versión privada. Mantener separadas las sesiones.
- [ ] Registrar fecha, commit integrado y resultado de este ensayo en continuidad.

## Alcance que sigue pendiente

Publicación ejecutable y uso entre autores siguen pendientes del contrato A/B;
B5 no los incorpora. La aceptación privada existente no sustituye ese hito de
la visión. Antes de prometerlo para el martes, Fahida debe entregar su soporte y
Miguel integrar su parte A. No se ha acordado eliminarlo de la entrega.

pgvector global, búsqueda de workflows públicos, OAuth certificado y proveedores
externos no se presentan como implementados. Si queda tiempo tras cerrar A,
priorizar publicación coordinada y luego mejoras A; no iniciar motor/B6 de Fahida.

## Avance A del bloque

- Retorno al planner: objetivo y modo conservados en la pestaña por cuenta,
  máximo 48 h, asociación al guardar la definición y botón de regreso desde el
  espacio de capacidad. Requiere nueva búsqueda, selección y consentimiento;
  descartable y limpiado al cerrar sesión. No conserva código ni resultados.
- Configuración se recupera de caídas de red, presenta errores accesibles y
  diferencia solicitud de cambio de correo de confirmación. Auth simulado:
  cinco grupos pasan, sin cambios de correo/contraseña reales ni prueba OAuth.
- Nueva verificación: seis grupos visuales de retorno con API interceptada,
  pruebas Node de aislamiento/caducidad y regresiones Inicio 8, planner 5 y
  trabajo/B3 4 pasan. Lint/build correctos; backend sin cambios (160 pruebas
  del bloque anterior). Bundle >500 kB sigue advertido.

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

Actualización de aceptación, 16/11/2026: build 8a2c1355 pasó sus cinco casos en
el worker local protocolo 2. Versión habilitada privadamente desde UI:
28be84c1-5dd3-4d13-a1fa-298c920a6201. Planner real compuso las dos versiones,
workflow a1518d9e guardado/reabierto idéntico y run f89dd4c7 completado con
transferencia entre pasos. Resultado «NIÑO  AZUL», preservando doble espacio
interior. Historial B5 muestra 2/2 pasos y conserva salida y ruta tras recargar.
UUID completos/hashes en continuidad. Las notas de cola/no habilitación debajo
son el registro previo superado, no el estado actual. Sin publicación entre cuentas.

Definición privada: Convertir texto a mayúsculas.
capability_id: c7e2ed9f-7aeb-4ed3-9b6b-66f927ca7718.
candidate_id: ba6d86d4-61de-4c08-aa6b-59205d2edb71.
artifact_hash: 8c4f2849aa81eebb9e75f565f6252791fbfbb83cfa640fb41be4b140992a26eb.

Se buscó antes en catálogo autorizado sin coincidencias de mayúsculas. Definición
y candidato generados/guardados realmente; hash conservado al releer. Solo
biblioteca estándar, contratos texto → resultado string, sin permisos/recursos.
No se ha ejecutado, probado ni habilitado. No confundir persistencia con corrección.

Prueba real solicitada después mediante el laboratorio B3 existente: POST /builds
202, build_id `8a2c1355-d1d4-4d14-af64-663c89e556ec`, almacenamiento Supabase. Los
cinco casos de abajo quedaron encolados; después de consultar durante unos 45 s
seguía `queued`, sin reporte de ejecución. No se habilitó versión ni se encoló
otra copia. Al disponer de worker autorizado, recuperar este build mediante
«Cargar reportes guardados» y actualizar su estado; no repetir la solicitud.
Captura local ignorada: output/playwright/second-build-live.png.

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
Con entrada nueva «  Niño  azul  » el resultado esperado final es «NIÑO  AZUL»;
Normalizar espacios quita únicamente extremos, conserva el doble espacio interior.
La aceptación positiva de esta composición ya pasó, según la actualización anterior.

## Bloqueos que no debe ocultar la entrega

1. Publicación ejecutable entre cuentas requiere el contrato B descrito como
   propuesta en CONTRATO_PUBLICACION_A_B.md. No está implementado ni aprobado.
2. Worker local autorizado con protocolo 2 ya activo; configuración solo en .env
   ignorados. Confirmar disponibilidad al retomar, sin duplicados ni repetir SQL 07/08.
3. Mayúsculas probada/habilitada y proceso de dos capacidades completado con
   historial tras recarga. Reinicio API conserva ocho huellas; privacidad técnica
   pasa con cuenta worker distinta (cinco 404 y listas sin recursos ajenos).
   Recorrido con segunda cuenta normal también pasa: cinco 404, listas sin
   recursos A, planner rechaza selección forzada 409 y rutas directas bloqueadas.
   Falta resto de errores/matriz B6 y publicación conjunta.
4. Modalidad de entrega y eventual alojamiento público siguen sin definir.
   No hay servicio contratado, facturación activada ni despliegue de esta rama.

## Orden del ensayo

Arrancar según README; verificar sesión/health, modelo local y worker B disponible.
Reutilizar primero la capacidad existente; demostrar creación/corrección con datos
sintéticos y acciones explícitas. Mostrar reporte B y versión probada. Proponer,
guardar y ejecutar el proceso de dos capacidades cuando ambas estén habilitadas.
Mostrar persistencia propia y aislamiento en la segunda cuenta. Publicación/uso
entre cuentas solo se presenta como funcional al superar su aceptación conjunta.
