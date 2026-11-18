# Guion de la demo — jueves 19/11/2026

Duración objetivo: **8 minutos de demo + 4 de preguntas**. Solo se muestra lo que funciona
hoy (ver [PLAN_MIERCOLES_JUEVES.md](PLAN_MIERCOLES_JUEVES.md)). No se prometen envíos por
correo/Instagram, asistentes recurrentes ni IA pesada: son visión, no producto.

> **Frase central:** «No te responde. Te resuelve, y lo que resuelve se queda.»

## Antes de empezar (checklist, 30 min antes)

- [ ] Tres terminales abiertas: backend (:8000), frontend (`npm run dev`, :5173) y
      trabajador (`shared_worker.py`, mensaje «Trabajador compartido listo»).
- [ ] Docker Desktop y WSL encendidos.
- [ ] Sesión iniciada con la cuenta de Fahida, **modo guiado**, chat vacío (recargar).
- [ ] Archivos en el escritorio: `plato.jpg` (foto del plato), `informe.pdf`, `ventas.xlsx`.
- [ ] Herramientas de respaldo ya creadas y guardadas (bloque 8): filtro con intensidad,
      mejora de foto + texto encima, portada de PDF, Excel → informe PDF.
- [ ] Probar una vez la sugerencia 🎨 (calienta Gemini y el trabajador).
- [ ] Plan B de Gemini a mano: `GEMINI_MODEL=gemini-3.5-flash-lite` en `backend/.env`.
- [ ] Video/capturas de respaldo abiertos en otra pestaña.

## Recorrido

### 1. El problema (40 s) — sin tocar la pantalla

> «Doña Marta tiene un restaurante. Quiere subir a Instagram la foto de su plato del día,
> bonita y con el nombre del local. No sabe de diseño ni de programación. Un chat de IA le
> daría *consejos*; ella necesita *la foto lista*.»

### 2. Pedirlo como se le pediría a una persona (1 min)

- Tocar la sugerencia 🍽️ «Mejora la foto de mi plato y ponle encima el nombre de mi
  restaurante» → elegir `plato.jpg` → completar «La Fogata» → enviar.

> «Primero busca en las herramientas que ya existen: las mías y las de la comunidad.»

### 3. Lo que falta, se crea (2 min) — el momento «wow»

- Si falta una pieza: tarjeta 🛠️ → **Crear y probar**. Si faltan varias: **⚡ Créalas todas**.
- Señalar la bitácora: «La IA está escribiendo el código… Probándola en el entorno aislado…».

> «Capacita no inventa una respuesta: **fabrica una herramienta**, la prueba en un entorno
> aislado sin internet y sin acceso a nada mío, y solo si pasa las pruebas la puedo usar.»

- Señalar el **taller** (derecha): los nodos se encienden en vivo.

### 4. El resultado, y ajustarlo conversando (1 min 30 s)

- Aparece la foto con el filtro/texto. Escribir: **«bájale al 50 %»** → nuevo intento.
  Luego **«un poco más cálido»** (lo interpreta la IA). Usar la **barra** una vez.
- **Volver a este** en el intento favorito → **✅ Me gusta, guardarla** → 📥 Descargar.

> «No tuve que explicarle a nadie qué es un parámetro. Lo dije como lo diría en la cocina.»

### 5. Lo que resuelve, se queda (1 min)

- Menú **Soluciones** → abrir la del restaurante → pide la foto → usar otra foto.

> «Mañana, con la foto de otro plato, ya no se crea nada: se reutiliza. Cada necesidad
> resuelta deja una herramienta.»

### 6. Compartir con la comunidad (40 s)

- En la tarjeta: **🌎 Compartir con la comunidad** → MIT → autorizar → Publicar.

> «Otros restaurantes la pueden usar con sus fotos. Mi código y mis fotos siguen privados.»

### 7. No es solo fotos (40 s) — si sobra tiempo

- Sugerencia 📊 «Convierte mi Excel de ventas en un informe PDF con los totales» con
  `ventas.xlsx` (herramienta ya creada de respaldo: sale rápido).

### 8. Cierre (20 s)

> «Capacita convierte lo que necesitas en algo que funciona, lo guarda y lo comparte.
> No te responde: te resuelve.»

## Si algo falla en vivo

| Falla | Qué hacer sin perder el ritmo |
|---|---|
| Gemini lento u «ocupado» | Decir «la IA está pensando» y pasar a la sugerencia con herramienta ya creada (respaldo). |
| «Alcanzó su cuota» | Cambiar a `gemini-3.5-flash-lite`, reiniciar backend (1 min) o mostrar el video. |
| Se queda «En cola: esperando al trabajador» | Revisar la terminal del trabajador; reiniciarlo. Mientras, mostrar Soluciones. |
| La fábrica no logra crearla | «Por seguridad no la activo si no pasa las pruebas» (es una virtud) → usar la de respaldo. |
| Sin internet | Video/capturas de respaldo. |

## Preguntas probables

- **¿No existe ya? (RapidAPI, Zapier, n8n…)** — Esos bancos solo tienen lo que alguien ya
  programó y están hechos para programadores. Capacita crea lo que falta desde una frase,
  lo prueba aislado y lo deja reutilizable y compartible, sin programar.
- **¿Es seguro ejecutar código hecho por una IA?** — Corre en gVisor, sin red, solo
  lectura, con límites de tiempo y memoria, sin credenciales. Solo se activa si pasa sus
  pruebas, y cada acción necesita tu aprobación.
- **¿Qué ve la IA de mis datos?** — Lo que escribes y los contratos de las herramientas.
  Nunca tus archivos ni los resultados: esos solo los ve quien ejecuta.
- **¿Cuánto cuesta?** — Hoy, nada: software abierto y el nivel gratuito de Gemini, con un
  límite propio para no gastar de más.
- **¿Qué sigue?** — Conectores reales (correo, redes) con permisos, asistentes que trabajan
  solos con límites, y herramientas de la comunidad con reputación.
