# Perfil persistente — frente A

15/11/2026. Implementado localmente; usuario confirma SQL 07 aplicado y grants
true,true,true,false,false. Aceptación remota superada con dos cuentas.
No modifica motor, workflows, archivos de ejecución ni historial de Fahida.

Actualización 16/11: el perfil propio monta ResumenTrabajo y HistorialPropio sobre
/runs y /workflows B existentes, con páginas/detalle y salida privada como texto.
No cambia el backend B. A real lee dos ejecuciones y tres workflows, incluyendo
detalle de un run; B distinta abre el perfil A sin consultar esas listas ni montar
el historial privado. El endpoint público /users/{username}/activity sigue 503:
no se usa para publicar actividad privada. Workflows públicos siguen pendientes.

## Comportamiento

El perfil se lee desde profiles de Supabase con el JWT verificado. Nombre y
biografía se guardan mediante PATCH restringido al id de la sesión. El formulario
no admite id, username, permisos, estadísticas ni una URL de avatar arbitraria.
Otro perfil no ofrece edición; el backend no acepta un dueño de la petición.

Se retiraron el consumidor .NET y el fallback a ejemplos del recorrido de perfil.
Un 404 muestra perfil no encontrado; un fallo de proveedor muestra error y reintento.
La lista paginada contiene solo capacidades públicas del autor y pasa por visible_to.
Su total se muestra cuando terminó la paginación; métricas de B no integradas
aparecen como —. No se consulta ni publica actividad privada de ejecuciones.

## Fotos

PNG/JPG hasta 2 MiB, no animados y máximo 16 millones de píxeles. Pillow valida
el contenido, aplica orientación, reduce a 512×512 como máximo y genera PNG nuevo
sin metadatos. Se usa Storage avatars con ruta dueño/UUID.png, sin sobrescritura.
La foto de perfil es pública; nunca usar ese bucket para archivos de ejecución.

Si hay foto y texto, una sola petición multipart carga la foto y después guarda
la URL y los campos juntos en profiles. Si Storage falla, no se guarda el texto.
Si el PATCH falla, se consulta el perfil antes de limpiar: una respuesta perdida
puede ocultar una escritura confirmada y no debe borrarse la foto activa.
Después de éxito se intenta eliminar solo la imagen anterior de esta implementación
y del mismo dueño. Fallos de limpieza se registran sin datos privados; pueden
quedar objetos huérfanos para mantenimiento. No hay transacción distribuida ni GC.

## Contrato

Todas las rutas exigen sesión y usan APIResponse. Frontend solo usa src/api.js.

| Ruta | Resultado |
| --- | --- |
| GET /api/users/me | Perfil propio real; incluye id y campos públicos. |
| PATCH /api/users/me | JSON display_name y/o bio; guardar texto vacío borra bio. |
| POST /api/users/me/avatar | multipart file y opcionalmente display_name/bio; PNG normalizado y perfil guardado. |
| GET /api/users/{username} | Perfil público existente; no publica email ni metadatos Auth. |
| GET /api/users/{username}/capabilities | Página pública del autor, limit/cursor; visible_to en origen/resultados. |
| GET /api/users/{username}/activity | 503 explícito hasta disponer de un contrato de actividad respetuoso de la privacidad. |

## SQL 07

Archivo db/07_profile_edit_and_avatars.sql, aplicado según usuario; no repetir.
Habilita UPDATE solo de display_name/bio/avatar_url para authenticated, con
políticas permisiva/restrictiva propias que exigen auth.uid() = id.
No concede cambiar id o username. Conserva el resto de políticas/grants.

Crea avatars si falta y fija 2 MiB/PNG. Si ya es privado, se detiene sin hacerlo
público. Las nuevas políticas de Storage permiten insertar, consultar metadatos
y borrar solo en carpeta propia; prohíben sobrescribir avatares. Las restricciones
no afectan otros buckets. No elimina archivos ni modifica filas de profiles.

Resultado esperado de grants: true,true,true,false,false. Comprobar después
con dos cuentas: editar/recargar propio, actualizar ajeno sin filas y subida
a carpeta ajena rechazada. Un proveedor simulado no acredita RLS remoto.

## Verificación

Suite backend completa: 90 pruebas pasan, 15 de perfil. Lint/build e
imports correctos. Prueba visual interceptada: seis grupos pasan, sin escrituras
reales, cubriendo edición/recarga, texto seguro, fotos, errores, propiedad,
ausencia de fallback y móvil. Pruebas remotas reales: nombre/bio y foto guardados
con 200 y persistentes tras recargar; imagen pública 200. Se restauró el perfil
original y se retiró la foto sintética. Con otra cuenta autenticada, UPDATE al
perfil ajeno afecta cero filas, upload a su carpeta devuelve 403 por RLS y
cambiar id está denegado (42501). Perfil público por username responde tras
corregir comillas literales en el filtro; regresión con puntuación incluida.
No se prueba caída de Storage/DB simultánea ni recolección automática de huérfanos.
Estado final en docs/estado.md.

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-a run-code --filename scripts/maintenance/verify_profile_browser.js
```

Fuentes revisadas: [Pillow en PyPI](https://pypi.org/project/pillow/13.0.0/),
[control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control),
[límites por bucket](https://supabase.com/docs/guides/storage/uploads/file-limits).
