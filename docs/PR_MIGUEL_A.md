# Integrar trabajo de capacidades, reparación acotada y actividad privada

El recorrido del catálogo no conectaba con los contratos privados B3/B4 y la ruta
de ejecución conservaba un cliente heredado con fallback a mocks. App conecta ahora
el espacio de trabajo de capacidades con los componentes existentes de Fahida;
guardar una definición y resolver una pieza faltante mantienen la continuidad del
objetivo, con acciones y consentimiento explícitos.

El objetivo pendiente se recupera desde Inicio y el espacio de capacidad, por
cuenta y durante 48 h en la pestaña. No hereda selección ni consentimiento.
Configuración recupera fallos de red y distingue solicitud de correo de su
confirmación, con mensajes accesibles y limpieza del campo de contraseña.

Añade reparación de candidatos propios con cuota configurable, nuevo ID/hash y
revalidación de contratos sin heredar pruebas. Integra filtros de búsqueda en el
servidor y semántica local en el planner, actividad/workflows privados en el perfil,
navegación de autor, títulos y controles de teclado del detalle. Conserva los
archivos B y sus contratos de ejecución; no aplica SQL ni configura trabajadores.

Validación: 160 pruebas backend, lint/build, imports, enlaces y comprobaciones de
dashboard. Batería visual interceptada: búsqueda 7 grupos, perfil 6, Inicio 8,
dashboard/comunidad 6, planner 5, integración A/B3 y reparación 4. Aceptación real
con dos identidades: filtros, lecturas propias, aislamiento de planner/candidatos/
workflows/runs y ausencia de historial privado en perfil ajeno. Reparación Gemini
201 con persistencia y candidato original intacto; segunda capacidad candidata
preparada con casos independientes para laboratorio B.

Verificación adicional: seis grupos visuales del retorno al planner, cinco de
Configuración con Auth simulado y pruebas Node de caducidad/aislamiento. Regresiones
Inicio, planner e integración B3 pasan; no se modificaron credenciales reales.

Límites: candidatos nuevos sin ejecutar/habilitar; composición de dos capacidades
distintas depende del laboratorio B. Publicación ejecutable entre cuentas requiere
el contrato propuesto en CONTRATO_PUBLICACION_A_B.md; no está implementada.
Semántica local acotada a 200 capacidades, cuotas por proceso y bundle >500 kB.
Detalle de evidencia y ensayo en ENTREGA_MARTES.md.
