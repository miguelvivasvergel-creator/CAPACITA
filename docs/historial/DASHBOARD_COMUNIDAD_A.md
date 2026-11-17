# Dashboard y comunidad A

Implementación local, 15/11/2026. Consume los contratos B3/B4 incorporados en
`f11e8c4`; no modifica motor, workers, workflows, políticas ni base de datos.

Inicio muestra capacidades propias, workflows propios no archivados y ejecuciones
propias (capacidades y workflows, sin builds), con desglose por estado. Usa
`src/api.js`, sesión Supabase y los endpoints existentes `/capabilities?scope=mine`,
`/workflows` y `/runs`. No usa consultas SQL ni credenciales administrativas.

El resumen recorre hasta diez páginas de cien registros por sección, descarta
duplicados y marca `+` y recuento parcial si hay más. No es una instantánea
transaccional ni una métrica global. Cada servicio falla por separado: no se
sustituyen errores por cero. Actualización manual, sin polling ni generación IA.
El límite reduce solicitudes, pero las listas B existentes pueden transferir
definiciones y reportes propios: un endpoint de agregados mínimos sería una mejora
posterior a acordar con B, no implementada aquí.

Aceptación autenticada posterior: sesión verificada contra Supabase y las tres
secciones cargan de endpoints reales, sin truncado: tres capacidades, un workflow
y dos ejecuciones completadas en esa consulta. Después se crearon dos workflows
privados de aceptación del planner; los recuentos anteriores son una observación
fechada, no valores esperados permanentes.

Comunidad consume el catálogo público autorizado, busca en backend, pagina sin
duplicados, muestra detalle y enlaza al perfil del creador. La clonación es
explícita y produce un borrador privado. Sin ranking ni contadores de usos que
todavía no están conectados a métricas verificadas; no expone workflows privados.

Validación:

- `node scripts/maintenance/verify_dashboard.mjs`: siete comprobaciones pasan.
- `npm run lint`, `npm run build`, auditoría de imports y `git diff --check`: pasan;
  advertencia conocida de bundle mayor de 500 kB.
- Playwright: seis grupos pasan con componentes reales y API interceptada;
  paginación, error parcial, texto literal, clonación simulada, vacío/error,
  navegación al perfil y móvil de 390 px sin desborde. Captura local en
  `output/playwright/a4-comunidad-mobile.png`.

Para repetir la prueba visual, arrancar Vite y ejecutar
`playwright-cli run-code --filename scripts/maintenance/verify_a4_browser.js`.
El montaje no necesita login y no escribe datos reales. No acredita integración
remota, RLS ni ejecución aislada. La consulta autenticada del resumen descrita
arriba supera su pendiente anterior; comunidad remota con segunda cuenta sigue
pendiente.

Siguiente A: planner con búsqueda autorizada y contratos de workflows B. Historial,
motor y composición siguen bajo propiedad de Fahida; no declarar todo A4 terminado.
