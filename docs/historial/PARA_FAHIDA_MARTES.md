# Fahida: entrega de Miguel y cierre del martes

Actualizado: 16/11/2026. Presentación: martes 17, en el PC de Fahida, para la
selección de Exposoftware. Esta guía reúne el estado conocido; no certifica el
trabajo que Fahida todavía no haya entregado o demostrado.

## 1. Qué recibir de Miguel

Rama `origin/miguel`. Cambios de producto más recientes, ya subidos:

| Commit | Entrega | Evidencia y límite |
| --- | --- | --- |
| `3606a57` | Modo Guiado inicial y modo Desarrollador; necesidad, propuesta, formularios, ejecución y resultados sin copiar JSON | Propuesta Gemini real y ejecución privada real; la creación nueva desde esta interfaz tiene pruebas simuladas, falta aceptación real completa |
| `be49e6a` | Unificación visual A con el login: marca, navegación, encabezados, tarjetas, iconos SVG sin emojis y móvil | 16 comprobaciones con lecturas reales, cero escrituras; Guiado 7 grupos, Inicio desarrollador 8 y Perfil 6 con APIs simuladas; lint/build/imports/enlaces pasan |

B3/B4/B5 ya estaban integrados antes de estos commits. Miguel no modificó el
backend, SQL, motor, laboratorio, worker ni servicios de B durante estos dos
bloques. No hay nuevas dependencias. El aviso conocido de bundle >500 kB permanece.
Los cambios visuales no equivalen a completar funcionalidades pendientes.

## 2. Qué revisar y cerrar en el frente de Fahida

El usuario informa que Fahida va en **B6**. No hemos revisado su entrega B6 ni
confirmado su alcance o pruebas. No deducir que publicación está incluida por
el nombre del bloque. Contrastar esta lista con su trabajo y aportar evidencia;
no rehacer lo que ya tenga verificado.

- [ ] Entregar referencia de rama/commit B6, archivos cambiados, contratos y
  resultados de sus pruebas; indicar explícitamente qué queda pendiente.
- [ ] Completar la matriz B de errores y límites: timeout/recursos/salida inválida,
  fallo intermedio sin éxito falso, contratos y conexiones inválidos, cambios que
  invalidan aprobación o evidencia, reintentos sin duplicados y recuperación del
  worker. El recorrido positivo privado ya tiene evidencia, no toda esta matriz.
- [ ] Verificar privacidad de runs, reportes y archivos desde otra cuenta. Si se
  presenta soporte de archivos, demostrar carga, recuperación y descarga reales,
  además de negar acceso ajeno; no darlo por probado con resultados de texto.
- [ ] Revisar con Miguel el [contrato de publicación](CONTRATO_PUBLICACION_A_B.md).
  Sigue siendo una propuesta sin aceptación de B. Para usar código de otro autor,
  B debe resolver y ejecutar una versión publicada y probada sin exponer su
  candidato privado; revalidar disponibilidad, permisos y retirada.
- [ ] Dejar instrucciones reproducibles de arranque del worker/sandbox y errores
  conocidos. Confirmar disponibilidad y configuración en el PC de presentación.

No abrir candidatos privados ni relajar permisos para simular publicación.
Las rutas/RPC definitivas se acuerdan con su dueña; no están implementadas por
existir en el documento de propuesta.

## 3. Lo que sigue siendo trabajo de Miguel

- [ ] Integrar publicación/retiro en catálogo, búsqueda, perfil y acción de uso
  al disponer del contrato B operativo. Esa interfaz de publicación A también
  está pendiente; no es una tarea terminada esperando solo una prueba de Fahida.
- [ ] Conducir la aceptación real completa de creación desde modo Guiado:
  necesidad nueva, búsqueda previa, definición, consentimiento, generación,
  referencia independiente, prueba aislada, habilitación y ejecución con datos nuevos.
  Fahida revisa el laboratorio/motor; Miguel corrige su experiencia A.
- [ ] Corregir fallos A que aparezcan en la integración y el ensayo, y registrar
  la evidencia. Conservar la estética acordada y los dos modos.

Miguel puede adelantar creación guiada, revisión y documentación sin esperar a
B6. Solo la integración que requiera soporte nuevo de motor depende de B.

## 4. Qué falta contrastar con toda la versión acordada

Además del recorrido principal, el [reparto](PLAN_DOS_PERSONAS_MARTES.md) y la
[visión](../VISION_MAESTRA.md) incluyen capacidad compuesta reutilizable con
dependencias/versiones, configuración de agente guardado, archivos privados,
procedencia, búsqueda y métricas reales. No hay en este cierre evidencia suficiente
para marcarlos todos completos. Revisar con ambos dueños qué está implementado,
parcial o pendiente; un workflow guardado no certifica automáticamente una
capacidad compuesta publicada ni un agente guardado.

pgvector global y búsqueda de workflows públicos no están certificados como
implementados; la búsqueda semántica local existente no equivale a pgvector.
Conectores/automatizaciones externas dependen de acceso, permisos y recursos;
el piloto del plan era condicional. No prometerlos ni simular acciones reales.
Estos puntos no se eliminan de la visión por priorizar el ensayo.

## 5. Aceptación conjunta que cierra la presentación

Todos los puntos siguientes están pendientes de realizar en el PC de Fahida:

- [ ] Integrar las entregas preservando cambios y `.env` de cada persona. Anotar
  commit resultante y resolver conflictos con el dueño del archivo. Entrega en
  ramas de trabajo, sin tocar `main`; el usuario no exige PR para el ensayo.
- [ ] Arranque limpio de UI/API/BD/IA/sandbox y un worker coordinado. Confirmar
  si el de Miguel sigue activo antes de iniciar otro sobre la misma cola.
- [ ] Persona 1 describe una necesidad en Guiado; se reutilizan herramientas
  existentes y se crea/prueba lo que falta con servicios reales, sin JSON manual.
- [ ] Ejecutar con datos nuevos; mostrar pasos y resultado, guardar/reabrir y
  recargar/reiniciar sin perder el historial. Mostrar también el modo Desarrollador.
- [ ] Persona 1 publica voluntariamente una versión probada. Persona 2 la
  encuentra y ejecuta con datos propios sin regenerar código. Comprobar retirada.
- [ ] Ambas cuentas reciben 404 para candidatos, reportes, entradas, archivos y
  resultados privados ajenos. Publicar una definición no supera el caso anterior.
- [ ] Mostrar un fallo comprensible sin resultado ficticio; conservar trabajo y
  no duplicar ejecuciones al reintentar.
- [ ] Registrar fecha, commit y resultado de cada caso. Preparar un guion breve
  y grabación identificada de respaldo. No llamar «versión final verificada» a un
  recorrido parcial; publicación y segundo usuario no se han retirado de la entrega.

Arranque y casos privados existentes: [guía del martes](ENTREGA_MARTES.md).
Contratos, estados y evidencia de los modos: [guía de uso A](MODOS_USO_A.md).
Este documento está disponible en Git; no se ha enviado un mensaje a Fahida ni
se ha verificado que lo haya leído.
