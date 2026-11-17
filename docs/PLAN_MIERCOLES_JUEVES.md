# Plan final — miércoles 18 y jueves 19/11/2026

Decisión de Fahida (17/11): **todo funcionando el miércoles**; el **jueves es para
mostrar y hacer llamativo** lo creado, no para construir. Visión: [VISION_FINAL.md](VISION_FINAL.md).
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

## Jueves 19 — mostrar y hacer llamativo

- Pulido visual del chat y del taller (bienvenida, animaciones, ejemplos sugeridos de la demo).
- Guion de la presentación: problema → chat → fábrica creando en vivo → taller → resultado.
- Archivos de ejemplo listos (foto del plato, PDF, Excel) y ensayo completo.
- Capturas o video corto de respaldo por si falla internet o Gemini.
- Documentación y continuidad al día. Sin funciones nuevas.
