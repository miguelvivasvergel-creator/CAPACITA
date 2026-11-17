# CAPACITA — versión final soñada

Fecha: 17/11/2026. Acordada con Fahida en conversación. Es la **visión de producto
objetivo**: describe a dónde vamos, no lo que ya está implementado. El estado real
está en `CONTEXTO_Y_CONTINUIDAD.md`, `CONTEXTO_Y_CONTINUIDAD_FAHIDA.md` y `estado.md`.
Complementa a [VISION_MAESTRA.md](VISION_MAESTRA.md) (arquitectura, seguridad,
presupuesto), que sigue vigente en lo técnico.

> **No te responde. Te resuelve, y lo que resuelve se queda.**

## 1. Qué es

Capacita es un asistente que convierte **cualquier necesidad, de cualquier campo**,
en una solución que funciona. Usa capacidades existentes (propias o de la
comunidad), **crea las que faltan**, las une en procesos visuales y ejecuta de
verdad. Cada solución queda guardada para reutilizarla, automatizarla o compartirla.

No es "otro chat de IA":

| Chat de IA normal | Capacita |
|---|---|
| Da texto | Entrega resultados reales: archivos, imágenes, envíos |
| Empieza de cero cada vez | Cada solución queda como herramienta reutilizable |
| Caja negra | El proceso se arma en vivo y se ve |
| Solo tú y la IA | Comunidad: usas lo de otros, otros usan lo tuyo |
| Hace algo una vez | Asistentes que trabajan de forma recurrente con límites |
| "Confía en mí" | Ficha con pruebas, permisos y costo; nada sale sin aprobación |

Usuario principal: **cualquier persona sin conocimientos técnicos**. El modo
desarrollador existe, pero es secundario.

## 2. Pantalla principal: chat + taller

```
┌────────────────────────────┬──────────────────────────────────────────────┐
│ CHAT                       │ TALLER (se arma en vivo, estilo n8n)          │
│ Tú: 📎 tesis.pdf            │ [PDF]→[Extraer]→[Corregir]→[APA 🛠️]→[Correo 🔒]│
│ "arréglalo, APA y envíalo" │   🟢      🟢        🔵        ⚪         ⏸     │
│ Capacita: armé el proceso; │ Nodo: Aplicar APA · creada ahora · 12 pruebas │
│ "APA" no existía, la creo  │ Antes / después                               │
│ [Edición: 7ª ▾] [Aprobar]   │                                              │
│ 🎤 📎 📷 Escribe...           │ [Ver como desarrollador]                      │
└────────────────────────────┴──────────────────────────────────────────────┘
```

- El chat responde con **tarjetas y botones**: opciones, vistas previas, antes y
  después, aprobar. Pocos párrafos.
- Entrada por **texto, voz, foto o archivo**.
- El **taller** muestra el workflow armándose: nodos que aparecen, se conectan y
  cambian de estado.
- En móvil, el taller se abre como panel deslizable desde el chat.

## 3. Recorrido completo

1. La persona pide algo.
2. Capacita entiende y pregunta lo que falta, con botones.
3. Busca primero en sus capacidades y luego en las de la comunidad.
4. Arma el workflow: reutiliza lo que existe y **crea y prueba** lo que falta.
5. Muestra el resultado antes de actuar; se ajusta hablando o tocando nodos.
6. Pide aprobación para toda acción externa (enviar, publicar, programar, borrar).
7. Ejecuta de verdad y entrega resultados reales.
8. Ofrece guardar el proceso como capacidad, volverlo asistente y compartirlo.

## 4. Piezas

- **Capacidad:** herramienta que hace una cosa ("quitar fondo", "aplicar APA").
- **Workflow:** capacidades conectadas; cada conexión pasa una salida concreta a una
  entrada concreta.
- **Capacidad compuesta:** workflow guardado que funciona como una sola pieza y
  puede ir dentro de otros (nodo que se abre para ver su interior).
- **Asistente:** workflow con horario o disparador y reglas de qué hace solo y qué
  debe preguntar.

## 5. Workflows tipo n8n

Tarea compleja = varias capacidades unidas. La IA arma el lienzo sola; la persona
solo mira, ajusta y aprueba.

Estados de nodo: ⚪ en espera · 🔵 trabajando · 🟢 listo · 🔴 falló ·
🛠️ creándose · 🔒 requiere aprobación.

Al tocar un nodo: qué recibió, qué produjo, ficha (autor, pruebas, accesos, costo)
y opciones en lenguaje humano. Se edita **hablando** ("agrégale una portada antes
de enviar") o **tocando** (arrastrar, conectar, borrar). Si un nodo falla, el chat
explica por qué y propone solución; los pasos completados se conservan.

## 6. Fábrica de capacidades: "primero interno"

Cuando falta una pieza, Capacita la fabrica en **Python**:

1. **Define** entradas, salidas, parámetros y errores esperados.
2. **Escribe el código** usando solo la **caja de herramientas aprobada**.
3. **Prueba**: casos normales, difíciles (vacío, enorme, dañado) y de referencia
   independientes del código generado; límites de tiempo y memoria.
4. **Empaqueta** una versión con dependencias fijas y hash. Se fabrica una vez y
   se reutiliza sin regenerar.
5. **Habilita** solo si pasa todo. Editar crea una versión nueva; la anterior sigue.

**Caja de herramientas aprobada** (librerías y modelos abiertos, preinstalados y
revisados, licencia incluida). Ejemplos: Pillow y OpenCV (imagen), rembg
(quitar fondo), pypdf, reportlab y python-docx (documentos), pandas y openpyxl
(datos), Tesseract (OCR), pydub y ffmpeg (audio). La IA **combina** estas piezas;
no inventa modelos entrenados. Pedir una librería nueva la deja pendiente de
revisión; nunca se instala a escondidas.

Todo corre **dentro de Capacita**, pero en el **sandbox aislado** (gVisor), nunca
en el proceso de la API, sin credenciales y con red bloqueada por defecto.

Sellos visibles para la persona:

- 🏠 **Interna:** fabricada y ejecutada en Capacita; gratis y privada.
- 🌐 **Conectada:** usa un servicio externo; puede costar o requerir permisos.

Regla: **preferir siempre lo interno**; usar lo externo solo cuando no hay otra
forma, y avisarlo.

| Tarea | ¿Interna? |
|---|---|
| Quitar fondo, editar, comprimir, convertir imágenes | ✅ |
| Corregir PDF, APA, generar Word/PDF | ✅ |
| Analizar Excel/CSV, informes, gráficas | ✅ |
| OCR | ✅ |
| Redactar o entender lenguaje | ⚠️ modelo de lenguaje externo o local potente |
| Generar imagen o video desde cero | ⚠️ local solo con GPU |
| Enviar correo, publicar en redes | ❌ siempre conectada |

## 7. Los 7 pilares

1. **Chat + taller en vivo.**
2. **Tarjetas y botones** en lugar de párrafos; voz, foto y archivo.
3. **Mi negocio / Mi perfil:** memoria de identidad, tono, logo y cuentas; todo lo
   creado ya sale con ella.
4. **Mis asistentes:** procesos recurrentes ("cada lunes…") con límites claros.
5. **Comunidad viva:** remezclar ("igual que el de @pizzeria, pero para mi barbería"),
   valoraciones, "usada por N", autoría preservada, packs por sector.
6. **Confianza visible:** ficha de pruebas, accesos y costo antes de usar;
   aprobación explícita para lo externo.
7. **Deshacer y versiones en lenguaje humano:** "vuelve a como estaba ayer".

## 8. Secciones

| Sección | Contenido |
|---|---|
| Inicio (chat + taller) | Donde se resuelve todo |
| Mi negocio / Mi perfil | Memoria y cuentas conectadas |
| Mis capacidades | Creadas o guardadas, con versiones |
| Mis asistentes | Procesos automáticos y sus límites |
| Comunidad | Capacidades y procesos públicos, remezcla, autoría |
| Historial | Ejecuciones, resultados, fallos, volver a correr |
| Conexiones | Gmail, Instagram, Drive… autorizadas y revocables |
| Modo desarrollador | Código, contratos, pruebas y edición avanzada de nodos |

## 9. Ejemplos de referencia

- **Restaurante:** foto → mejorar imagen (comunidad) → textos (propia) →
  calendario (🛠️ creada) → Instagram (🔒 aprobación). Se guarda como
  "Campaña semanal para restaurantes" y se comparte.
- **Estudiante:** PDF → extraer → corregir → APA (🛠️) → generar PDF →
  correo (🔒). Se guarda como "Entregar trabajo en APA".
- **Interna pura:** "quítale el fondo" → Capacita fabrica la capacidad con rembg,
  la prueba en sandbox y la deja disponible para todos.

## 10. Límites honestos

- Si falta un recurso (API, permiso, modelo de pago), Capacita lo dice y guarda el
  borrador. Nunca finge éxito.
- Publicar o enviar depende de conectar cuentas y de las reglas de cada plataforma
  (Meta y Google exigen revisión de apps).
- Lo que usa IA externa de imagen o video puede costar; el costo se muestra antes.
- Si faltan datos (por ejemplo, autores de una referencia APA), se preguntan, no se
  inventan.
- Seguridad sin excepciones: cada persona ve solo lo suyo (404 para lo ajeno),
  el código generado nunca recibe credenciales y lo externo exige aprobación.

## 11. Qué de lo ya construido se aprovecha

| Ya existe (según continuidad) | Papel en la versión final |
|---|---|
| Auth Supabase, perfiles | Se conserva |
| Laboratorio: definición, candidato, build, gVisor, habilitación | Base de la fábrica |
| Motor de workflows con React Flow, aprobación, recuperación | Base del taller |
| Historial y resultados | Sección Historial |
| Publicación ejecutable entre cuentas (B6) | Base de la comunidad |
| Planner con Gemini y búsqueda local | Base del orquestador |
| Modos Guiado y Desarrollador | El Guiado se convierte en el chat |

Falta, entre otros: chat + taller unificados, orquestador conversacional que arme
el lienzo, archivos privados (subida y descarga), caja de herramientas de imagen y
documentos, capacidad compuesta registrada, asistentes recurrentes, memoria de
negocio, remezcla y valoraciones, conectores reales.

## 12. Hoja de ruta

Cada fase debe terminar con un recorrido usable y probado, sin presentar lo
pendiente como hecho.

| Fase | Entrega | Demuestra |
|---|---|---|
| 0. Orden | Inventario de pantallas/código, qué se conserva, qué se retira; documentación única | Proyecto entendible |
| 1. Chat + taller | Pantalla única: chat a la izquierda, lienzo React Flow a la derecha, sobre el planner y motor actuales | El workflow se arma y ejecuta en vivo |
| 2. Archivos | Subida y descarga privadas (Supabase Storage), entrada y salida de archivo en capacidades | PDF e imagen entran y salen |
| 3. Caja de herramientas | Imagen del sandbox con Pillow, rembg, pypdf, reportlab, python-docx, pandas | "Quitar fondo" y "APA" fabricadas internamente |
| 4. Composición | Guardar workflow como capacidad compuesta; usarla como nodo | Soluciones completas reutilizables |
| 5. Comunidad | Publicar desde el chat, buscar, remezclar, valorar, autoría | Persona 2 usa y adapta lo de persona 1 |
| 6. Memoria y asistentes | Mi negocio, asistentes recurrentes con límites | Trabajo automático y personalizado |
| 7. Conectores | Gmail primero; Instagram cuando haya permisos de Meta | Acciones externas reales con aprobación |
