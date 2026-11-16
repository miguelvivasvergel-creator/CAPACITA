# Bloque 6 — integración y publicación ejecutable

16/11/2026. Fahida autoriza rama nueva e integración con los apuntes de Miguel.
**En curso, no cerrado.** No merge a main, despliegue ni publicación automática.

## Rama y base

`integracion/Fahida-bloque-6`, creada desde `e4b286f` de Fahida, incorpora
`origin/miguel` hasta `3002946` mediante fast-forward: Miguel ya había integrado
B1–B5, por lo que no se duplicaron commits ni se resolvieron conflictos ficticios.
Se conservaron `.env` y la eliminación local previa de `backend/.env.example`.
Su eliminación también tiene respaldo Git stash `respaldo-b6-eliminacion-local-env-example`.
No aplicar ese stash sobre cambios nuevos sin revisar. La rama personal B no cambia.

Leídos PARA_FAHIDA_MARTES, CIERRE_MIGUEL, ENTREGA_MARTES y contrato de publicación.
Pillow 13.0.0 faltaba en este equipo: instalado en `.venv` con pip del sistema,
sin cambiar las versiones del repositorio. La instalación mediante uv falló por
permisos del caché de Windows. No se instalaron dependencias semánticas opcionales.
Fahida confirmó que Miguel detuvo su worker. El worker local anterior también
había terminado; se comprobó ausencia de procesos antes de las pruebas gVisor.

## Soporte implementado localmente

SQL 09 agrega publicaciones y acceso por descriptor sin abrir los candidatos.
No modifica implementaciones ni publica registros existentes. `PUBLICATIONS_ENABLED`
es false por defecto: activar únicamente después de aplicar/verificar 09.

- Publicar requiere dueño, consentimiento booleano explícito, versión habilitada,
  build compartido superado y coincidencia de manifiesto/hashes/evidencia.
- Publicación fija versión, autor y licencia elegida (MIT/Apache-2.0/CC0-1.0).
  Catálogo público/published y permiso de ejecución cambian en la misma transacción.
  Solo una versión activa por capacidad. Cambiar licencia requiere retirar antes.
- Descriptor autorizado: contratos, UUID, hashes, autor y licencia; nunca source,
  candidato, build, ejemplos privados, entradas, reportes ni resultados ajenos.
- Ejecución con datos del solicitante e idempotencia. El manifiesto se resuelve
  dentro de la BD y lo recibe únicamente el worker autorizado; API/cliente no
  recuperan el candidato privado del autor. El resultado pertenece al ejecutor.
- Retirada oculta catálogo si no queda publicación activa e impide nuevos usos
  y los encolados. Runs ya comenzados pueden terminar; workflows revalidan también
  en checkpoints. No borra historial. Republicar crea otra publicación y no
  resucita aprobaciones que dependían de la retirada.
- Workflows/planner admiten descriptores de versiones públicas; la validación
  por contratos no requiere código privado. La aprobación SQL fija manifiestos
  auténticos y publicación vigente; worker conserva validación completa de código.
- Interfaz desde Abrir capacidad: consultar versiones, consentimiento/licencia,
  publicar/retirar y formulario de datos de otra cuenta, con confirmación antes
  de ejecutar. No se publica nada por abrir la pantalla.

API autenticada implementada:

| Ruta | Uso |
| --- | --- |
| GET /api/publications/availability | Estado de activación del entorno |
| GET /api/publications?capability_id=UUID | Descriptores disponibles; paginación con cursor |
| POST /api/publications | version_id, license, consent=true |
| POST /api/publications/{publication_id}/withdraw | Retirada por dueño |
| POST /api/publications/{publication_id}/runs | inputs, parameters e Idempotency-Key |

`/runs`, `/workflows/available-versions` y planner también resuelven versiones
publicadas al activar el flag. Los contratos privados anteriores siguen intactos.

La ruta heredada `/files` anunciaba éxito y descartaba el archivo sin autenticación.
Ahora exige sesión y responde 501 explícito: no simular persistencia. No implica
soporte real de archivos; almacenamiento/descarga privados siguen pendientes.

## Validación realizada

- Base integrada: 160 tests backend, lint y build correctos.
- Pruebas nuevas de API: contratos/consentimiento, dueño, feature flag, catálogo
  visible, ejecución sin pedir candidato y compilación por contratos sin source.
  Batería actual completa: **168 tests backend correctos**.
- PostgreSQL 17 temporal: 06/07_shared_execution/08/09, publicación/retirada,
  consentimiento, descriptor sin source, dos identidades, idempotencia, workflow
  ajeno usando versión pública, retirada antes de claim y aprobaciones obsoletas.
  Regresiones privadas de builds, versiones, workflows y recuperación pasan.
- La misma batería con `--sandbox`: candidato fixture probado y ejecutado en
  gVisor, tanto uso ajeno directo como workflow, salida correcta y persistida.
  No usa Supabase, cuentas ni código reales; contenedor temporal eliminado.
- Chrome temporal escritorio 1280/móvil 390: publicar con consentimiento, datos
  nuevos y confirmación, retry con misma clave, retirada y desactivación explícita.
  HTTP simulado, sin sesión real. Capturas ignoradas en output/playwright.
- Build mantiene aviso conocido de bundle >500 kB; no equivale a un fallo.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend/tests -t backend
npm.cmd run lint
npm.cmd run build
.\.venv\Scripts\python.exe scripts/maintenance/verify_publication_ui.py
# Sin workers activos, porque recupera el mismo sandbox local:
.\.venv\Scripts\python.exe scripts/maintenance/verify_shared_database.py --publications --sandbox
```

## Activación remota y siguiente paso

SQL09 **aplicado por Fahida con Success y RPC comprobada realmente**, 16/11/2026.
PUBLICATIONS_ENABLED=true guardado; API y worker reiniciados. No repetir 07/08/09
ni confundir `07_profile_edit_and_avatars` de A con `07_shared_execution` de B.

`verify_publications_remote.py --protected-run UUID_AJENO` pasó sin escrituras:
activación, descriptores y contratos, 401 sin sesión, 404 publicación inexistente
y run ajeno, 422 sin consentimiento. No publicó ni creó ejecuciones; reporte
ignorado `output/laboratory/block6-activation-remote.json`. No sustituye prueba
real de publicar/retirar y ejecutar entre dos cuentas.

Secuencia de referencia para otros entornos (pasos 1–3 ya realizados aquí):

1. Aplicar `db/09_executable_publications.sql` completo una vez.
2. Comprobar RPC con cuenta normal y activar `PUBLICATIONS_ENABLED=true` en backend/.env.
   `scripts/maintenance/activate_publications.py` verifica la RPC y cambia solo
   ese flag; conserva las credenciales y no publica ni aplica SQL.
3. Reiniciar API; un único worker autorizado/protocolo 2 en el equipo coordinado.
4. Ensayo de dos cuentas: autor publica voluntariamente su versión probada;
   otra cuenta encuentra/ejecuta con datos nuevos y consulta historial propio;
   candidatos/builds/runs del otro continúan 404. Comprobar retirada y no duplicados.
5. Registrar evidencia real por separado de fixtures, sin secretos ni contenido privado.

API integrada reiniciada y health 200 comprobado. Trabajador local normal activo:
«Trabajador compartido listo; sandbox recuperado». No abrir otra copia.

No cerrar B6 por compilar o por aplicar SQL. Aún faltan aceptación remota de la
publicación y ensayo completo en este equipo; creación guiada nueva real sigue
pendiente según Miguel. Compuesta registrada en catálogo con dependencias,
agente guardado y archivos privados no están implementados por este avance.
Conectores siguen condicionados a accesos; no se simulan ni se eliminan de la visión.
