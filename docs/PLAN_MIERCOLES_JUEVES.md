# Plan final — miércoles 18 y jueves 19/11/2026

Decisión de Fahida (17/11, 3:27 PM): **listo para mostrar lo más posible el miércoles 18/11 a las
6:00 PM**. El "paso 3" del plan anterior (archivos) es el bloque 1 de esta tabla. Lo del
jueves (pulido) se adelanta al miércoles por la tarde si hay tiempo. Visión: [VISION_FINAL.md](VISION_FINAL.md).
Avance diario: [CONTEXTO_Y_CONTINUIDAD_FAHIDA.md](CONTEXTO_Y_CONTINUIDAD_FAHIDA.md).

## Ya funciona (verificado con la cuenta real de Fahida, 17/11)

- Chat que busca en el catálogo, arma la solución y pide los datos como mensaje.
- Fábrica automática: diseña, escribe, prueba en gVisor, se corrige (máx. 2) y activa.
- Taller tipo n8n con los nodos en vivo; flujos de varias herramientas.
- Caja de herramientas del sandbox (PDF, Word, Excel, imágenes) — solo por dentro:
  todavía no entran ni salen archivos.

## Miércoles 18 — construir (en este orden)

| # | Bloque | Hecho cuando… |
|---|---|---|
| 1 | **Archivos de punta a punta**: convención base64 en contratos, límites del sandbox y del motor, SQL 12 (límites en Supabase), 📎 en el chat, vista previa de imagen y 📥 Descargar | Subo una foto y descargo otra |
| 2 | **Fábrica con archivos**: archivos de muestra para las pruebas (foto, PDF, Word, Excel), comparación inteligente de archivos, instrucciones a Gemini | La fábrica crea y prueba sola una herramienta que recibe y devuelve archivos |
| 3 | **Demo principal real: foto del restaurante** (mejorar + nombre del local → imagen para Instagram) | Recorrido completo con la cuenta de Fahida |
| 4 | **Herramientas complejas**: probar 2 más con archivos (PDF unir+portada; Excel → informe PDF) | Funcionan o queda anotado por qué no |
| 5 | **"Créalas todas"** cuando faltan varias piezas | Un clic crea todas seguidas |
| 6 | **Compartir con la comunidad** desde el chat (B6 ya existe por dentro) | Botón en la herramienta creada |
| 7 | **Menú ordenado**: Soluciones con el mismo flujo del chat; ocultar pantallas viejas en modo guiado | Nada repetido ni confuso |
| 8 | **Respaldo para la demo**: dejar creadas y activas las herramientas de la demo | El jueves no depende de que Gemini esté libre |

Si el tiempo no alcanza, se recorta desde abajo (8 nunca se recorta: es el seguro del jueves).
Fuera de alcance esta semana: guardar flujo como herramienta compuesta, Instagram/correo
reales, IA pesada (quitar fondo, OCR), publicar en internet, memoria.

## Avance 17/11 (noche) — sin commit todavía

- **Verificado por Fahida en navegador**: subir una foto en el chat ya no da `input_limit`
  (SQL 12 corregido: `\1` en el reemplazo; la versión con `\g` habría dañado las funciones).
- **Corregido, probado con pruebas**: la fábrica bloqueaba herramientas de imagen porque Gemini
  declaraba Pillow como «recurso externo». Instrucción + limpieza en `objective_service.py`.
- **Pedido de Fahida, implementado, falta probar en navegador**: antes de guardar, la
  herramienta se activa «en prueba» (privada), se ejecuta con el archivo de la persona y se
  ajusta con controles o escribiendo («ponle 30 %» → resultado → «mejor 40 %»). Números claros
  se aplican sin IA; frases relativas van a `POST /objectives/adjust` (solo frase y opciones,
  nunca archivos; límite propio 60/h). Si pide algo que las opciones no permiten, diseña una
  versión mejorada. Botones «Me gusta, guardarla» / «Descartar» (desactiva la versión).
  Archivos: `VistaPrevia.jsx`, `ajustes.js`, `FabricaHerramienta.jsx`, `ChatTaller.jsx`.
- Validación: backend 40/40 (objetivos, Gemini, candidatos, reparación), `vite build` OK,
  lógica de ajuste probada en Node. Aún sin recorrido real con trabajador y Gemini.
- **Bloque 5 «Créalas todas», implementado, falta probar en navegador**: botón en la tarjeta
  «Me falta una herramienta» cuando faltan 2 o más. Crea cada pieza en modo automático
  (diseño → código → pruebas → activar, sin vista previa) y al terminar la última rearma la
  solución con el archivo de la persona. Si una pieza falla o sale bloqueada, se detiene y
  dice cuáles quedaron pendientes. Turno local de Gemini subido a 30 llamadas/hora (commit
  `564ad58`); lo comparten diseño, código, correcciones y planner.
- **Bloque 6 «Compartir con la comunidad», implementado, falta probar en navegador**: botón
  🌎 en la tarjeta de la herramienta guardada. Usa la publicación B6 existente (licencia
  MIT/Apache-2.0/CC0, consentimiento explícito, «Dejar de compartir»). Archivo:
  `CompartirHerramienta.jsx`. `vite build` OK.
- **Bloque 7 «Menú ordenado», implementado, falta probar en navegador**: en modo guiado,
  Soluciones abre la solución guardada en el chat + taller (`#inicio/solucion/<id>`: carga el
  workflow, no lo vuelve a guardar, no usa Gemini y pide los datos). Herramientas tiene como
  acción principal «Usar en el chat» (`#inicio/usar/<texto>`, deja el pedido escrito) y la
  ficha técnica queda como «Ver detalles y preparación». `vite build` OK.

## Jueves 19 — mostrar y hacer llamativo

- Pulido visual del chat y del taller (bienvenida, animaciones, ejemplos sugeridos de la demo).
- Guion de la presentación: problema → chat → fábrica creando en vivo → taller → resultado.
- Archivos de ejemplo listos (foto del plato, PDF, Excel) y ensayo completo.
- Capturas o video corto de respaldo por si falla internet o Gemini.
- Documentación y continuidad al día. Sin funciones nuevas.
