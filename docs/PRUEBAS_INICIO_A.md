# Inicio — verificación del frente A

15/11/2026. Propiedad de Miguel. No modifica el motor, sandbox ni workflows de Fahida.

Inicio usa el catálogo autorizado y el intérprete existente de objetivos. Un
objetivo produce aclaraciones, un bloqueo o una definición revisable; no un
workflow ejecutable. Cargar la propuesta no guarda una capacidad.

## Prueba visual reproducible

Con Vite/API disponibles y una sesión Playwright autenticada en Capacita:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-a run-code --filename scripts/maintenance/verify_home_browser.js
```

La CLI recibe una expresión de función. El script intercepta respuestas de negocio
solo durante la prueba y las retira al finalizar. Usa src/mocks/inicio.js y la
fixture de definición; no genera IA ni escribe registros reales. No guarda tokens.

Comprueba catálogo sin cifras/plan ficticios, detalle sin ejecución disponible,
filtro propio, búsqueda, paginación sin duplicados, vacío, error sin fallback,
respuesta obsoleta, contenido como texto, consentimiento, propuesta al formulario
sin autoguardado y ancho móvil. Al finalizar retira las intercepciones, restaura
el ancho del navegador y recarga Inicio para consultar otra vez la API real.

## Evidencia real separada

Playwright con sesión real verificó búsqueda de Normalizar espacios HTTP 200.
Una interpretación de ejemplo público devolvió HTTP 200/define, coincidencia
autorizada y formulario cargado sin guardar. Hubo un primer fallo de transporte
503 mostrado en interfaz; metadatos 200 y único intento adicional superado.

Dos cuentas autenticadas: capacidad efe6b264 y candidato 452d1c47 devuelven 200
al dueño y 404 a la otra cuenta; la búsqueda ajena no contiene la capacidad
privada y no tiene página siguiente. Esto no verifica todos los datos/permisos.

No se modificaron SQL, Supabase, versiones ni ejecución. El planner dependerá
del contrato de workflows/versiones que entregue Fahida.
