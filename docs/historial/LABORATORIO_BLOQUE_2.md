# Laboratorio local — bloque 2 de Fahida

Implementación local del 14/11/2026. Es un laboratorio de candidatos, no el motor
de runs del bloque 3. No habilita versiones, publica capacidades ni modifica
estados del catálogo. El seguimiento y la evidencia están en
[continuidad de Fahida](../CONTEXTO_Y_CONTINUIDAD_FAHIDA.md).

## Guía manual detallada: empieza aquí

Esta guía parte de tu equipo y de lo instalado durante los bloques anteriores.
No necesitas reinstalar Windows, Ubuntu, Docker ni gVisor. Tampoco ejecutar SQL
ni generar otro candidato si ya tienes uno guardado en tu propia cuenta.

Sigue las secciones en orden. Cada bloque de comandos indica en qué ventana
se escribe. Copia solamente lo que aparece dentro del bloque, sin las marcas
de tres comillas invertidas que lo rodean. Pulsa **Enter** para ejecutar.

Si un resultado no coincide con lo indicado, detente en ese paso: no hace falta
continuar con los siguientes para intentar arreglarlo. Anota el número del paso
y el mensaje de error, sin incluir contraseñas, tokens ni archivos `.env`.

### 1. Entender qué funciona en Windows y qué funciona en Ubuntu

Sigues usando **Windows durante toda la prueba**. Ubuntu funciona dentro de
Windows mediante WSL2; no tienes que reiniciar el computador para cambiar de
sistema ni abrir un escritorio de Ubuntu.

| Parte | Dónde funciona | Para qué sirve |
| --- | --- | --- |
| Navegador | Windows | Muestra Capacita y sus botones. |
| Interfaz o frontend | Windows | Vite sirve la página en el puerto 5173. |
| API o backend | Windows | FastAPI comprueba tu sesión, recupera candidatos y guarda tareas/reportes en el puerto 8000. |
| Trabajador | Windows | Busca tareas pendientes y pide que se prueben dentro del sandbox. |
| Docker Engine y gVisor | Ubuntu dentro de WSL2 | Preparan el entorno aislado donde se ejecuta el candidato. |
| Base de datos de builds | Disco de Windows | El archivo SQLite guarda tareas y reportes aunque cierres los programas. |
| Auth y candidatos guardados | Supabase, por internet | Permiten iniciar sesión y recuperar tus candidatos privados. |

El recorrido es:

```text
Navegador en Windows
  → API en Windows: guarda la tarea en la cola local
  → trabajador en Windows: recoge la tarea
  → Ubuntu/WSL: Docker + gVisor ejecutan el caso aislado
  → trabajador: comprueba la salida y guarda el reporte
  → navegador: muestra el reporte cuando pulsas Actualizar estado
```

**Una terminal** es la ventana donde escribes comandos. Aquí usaremos PowerShell,
que es una terminal de Windows. Un comando que empieza por `wsl` pide a Windows
que ejecute el resto dentro de Ubuntu. Cuando termina, sigues en PowerShell.

El comando `wsl --list --verbose`, por ejemplo, se escribe en PowerShell, no dentro
de una ventana de Ubuntu. No copies estos comandos en un lugar cuyo prompt sea
`root@...#` o `usuario@...$`. Si ya estás dentro de Ubuntu, escribe `exit`; si se
cierra esa ventana, abre PowerShell como se explica a continuación.

El usuario `root` que aparece en los comandos WSL administra Docker en Ubuntu.
El candidato se ejecuta con otro usuario, sin privilegios, dentro del contenedor.
No se ejecuta como administrador de tu Windows.

### 2. Abrir las ventanas que vas a usar

2.1. Si tienes una prueba automática del sandbox en curso, deja que termine antes
de comenzar. No ejecutes las baterías B1/B2 mientras hagas esta prueba manual:
comparten un único puesto de ejecución.

2.2. Si tienes una API, Vite o trabajador de Capacita abiertos en terminales de
una sesión anterior, ve a cada una y pulsa **Ctrl+C** para detener ese programa.
Hazlo solo en terminales que reconozcas como procesos de Capacita. No detengas
procesos de otras aplicaciones ni cierres Docker Desktop para esta prueba.

2.3. En Windows, pulsa la tecla **Inicio**, escribe **PowerShell** y abre
**Windows PowerShell** o **PowerShell**. De entrada no necesitas elegir
«Ejecutar como administrador».

2.4. Abre otras tres ventanas de PowerShell de la misma manera. Si Windows las
agrupa como pestañas de Terminal, también sirve: deben ser cuatro sesiones
distintas, cada una con su propia línea donde escribir.

2.5. Identifícalas en una hoja o por su posición:

| Ventana | Nombre que usaremos | Qué debes hacer con ella |
| --- | --- | --- |
| 1 | CONTROL | Comprobaciones. Normalmente vuelve a mostrar el prompt después de cada comando. |
| 2 | API | Mantenerla abierta mientras usas Capacita. |
| 3 | WEB | Mantenerla abierta mientras usas Capacita. |
| 4 | TRABAJADOR | Dejarla sin iniciar hasta que lleguemos al paso 9. |

No necesitas abrir una quinta ventana de Ubuntu. Los comandos `wsl` de CONTROL
y los que lanza el trabajador son suficientes para usar Ubuntu.

2.6. En **cada una de las cuatro ventanas**, escribe:

```powershell
Set-Location 'C:\Users\Fahida\Desktop\CAPACITA'
```

2.7. En cada ventana, comprueba la carpeta:

```powershell
Get-Location
```

Debe indicar `C:\Users\Fahida\Desktop\CAPACITA`. No cambies después a la carpeta
`backend`: los comandos de esta guía ya están preparados para ejecutarse desde
la raíz del proyecto.

Si ves algo como `PS C:\Users\Fahida\Desktop\CAPACITA>`, eso es el **prompt**:
indica que PowerShell está esperando un comando. No lo incluyas al copiar.

### 3. Comprobar los archivos y programas de Windows

Usa únicamente **CONTROL** en esta sección.

3.1. Ejecuta estas líneas una por una:

```powershell
Test-Path '.\.venv\Scripts\python.exe'
Test-Path '.\node_modules'
Test-Path '.\.env'
Test-Path '.\backend\.env'
Test-Path '.\backend\services\build_worker.py'
```

Cada línea debe responder **True**. Solo se comprueba que existen, sin mostrar
claves ni abrir su contenido. Si alguna responde False, indica cuál: esta guía
no te pide recrear el entorno ni sobrescribir la configuración existente.

3.2. Comprueba que Python y Node arrancan:

```powershell
.\.venv\Scripts\python.exe --version
node --version
npm.cmd --version
```

Cada comando debe mostrar una versión y volver al prompt. Durante la entrega se
usó Python 3.12.9. No necesitas activar el entorno con `Activate.ps1`: estamos
llamando directamente al Python de `.venv`.

Usamos `npm.cmd` para evitar el bloqueo de scripts `npm.ps1` que puede aplicar
PowerShell. No necesitas cambiar la política de ejecución de Windows.

3.3. Si habías dejado una API o Vite antiguos y no sabes si siguen encendidos,
puedes consultar los puertos:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess
```

Si no muestra filas, no detectó programas escuchando en esos puertos. Si muestra
filas, hay un programa usándolos. No lo mates por su número: busca primero la
terminal de Capacita que quedó abierta. Si no la encuentras, informa el resultado
antes de iniciar una segunda copia. Si Windows niega esta consulta, tampoco
modifiques permisos; los mensajes de arranque posteriores permitirán detectar
un puerto ocupado.

### 4. Comprobar Ubuntu, Docker y gVisor desde Windows

Continúa en **CONTROL**. Cada comando de esta sección termina y debe devolverte
el prompt de PowerShell; no deja una terminal interactiva de Ubuntu abierta.

4.1. Escribe:

```powershell
wsl --list --verbose
```

Busca una fila llamada **Ubuntu-24.04** y una columna **VERSION** con **2**.
Puede aparecer `Stopped` o `Running`: `Stopped` no es un fallo. El siguiente
comando dirigido a Ubuntu lo inicia cuando haga falta. Puede aparecer también
`docker-desktop`; es otra distribución, no la que usamos para el sandbox.

Si Ubuntu-24.04 no aparece, detente. No vuelvas a ejecutar una instalación a ciegas.

4.2. Comprueba que Ubuntu responde:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/python3 --version
```

Debe imprimir una versión de Python. Este Python pertenece a Ubuntu y puede tener
una versión distinta de la del paso 3.2. Es normal: son dos instalaciones
separadas en dos sistemas diferentes.

4.3. Inicia el servicio Docker **de Ubuntu**, si estaba detenido:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/systemctl start docker
```

Si termina sin imprimir nada y vuelve al prompt, puede haber funcionado
correctamente. Compruébalo con:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/systemctl is-active docker
```

Debe responder **active**. Este comando no inicia Vite, la API ni el trabajador.

4.4. Comprueba el socket exclusivo del sandbox:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/test -S /run/capacita-docker.sock
```

Esta comprobación no imprime un mensaje. Justo después, sin ejecutar otro
programa entre medias, escribe:

```powershell
$LASTEXITCODE
```

Debe mostrar **0**. Significa que encontró el socket. Un socket es el punto de
conexión con el Docker de Ubuntu; no es una carpeta donde guardar archivos.

Si muestra otro número, y todavía no has iniciado el trabajador, ejecuta:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /bin/bash /mnt/c/Users/Fahida/Desktop/CAPACITA/scripts/maintenance/configure_sandbox_socket_wsl.sh
```

Ese script configura el socket y reinicia solamente el servicio Docker de
Ubuntu. Ya se ejecutó durante el cierre del bloque 2; normalmente no hará falta
repetirlo. Debe terminar mostrando la versión del Engine. Repite después la
comprobación del socket y `$LASTEXITCODE`. Si sigue sin dar 0, detente.

La ruta `/mnt/c/Users/Fahida/Desktop/CAPACITA` es cómo Ubuntu ve tu carpeta
`C:\Users\Fahida\Desktop\CAPACITA`. Es el mismo repositorio, no otra copia.
El controlador puede leer allí su propio script, pero esa carpeta no se monta
dentro del contenedor que ejecuta el candidato.

4.5. Comprueba que ese Docker conoce gVisor:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/docker --host unix:///run/capacita-docker.sock info --format '{{json .Runtimes}}'
```

Debe salir un objeto de texto que incluya el nombre **runsc**. Puede incluir
otros nombres además de runsc. Si falta runsc o aparece un error de conexión,
detente: no cambies el comando a Docker Desktop ni quites el runtime.

4.6. Consulta la versión de gVisor:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/runsc --version
```

En la validación anterior aparecía `release-20261109.0`. Debe responder con una
versión, sin el mensaje «No such file or directory».

4.7. Comprueba que sigue guardada la imagen fijada para las pruebas:

```powershell
wsl --distribution Ubuntu-24.04 --user root --exec /usr/bin/docker --host unix:///run/capacita-docker.sock image inspect python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b --format '{{json .RepoDigests}}'
```

Debe mostrar una lista que contenga ese digest `python@sha256:...`. Si dice que
no existe la imagen, informa ese error antes de seguir. El laboratorio no la
descarga automáticamente y no debemos sustituirla por una etiqueta distinta.

Al terminar esta sección, deja **CONTROL abierta**. Ubuntu ya puede trabajar
en segundo plano: no tienes que mantener una aplicación Ubuntu visible.

### 5. Encender la API en la ventana API

5.1. Ve a la ventana **API**. Comprueba que está en la raíz con `Get-Location`.

5.2. Ejecuta:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

5.3. Espera mensajes equivalentes a:

```text
Application startup complete.
Uvicorn running on http://127.0.0.1:8000
```

La ventana **ya no debe volver al prompt**: el programa sigue trabajando. Eso es
lo esperado. Déjala abierta y no escribas los siguientes comandos allí.

Si aparece «address already in use», «WinError 10048» o «error while attempting
to bind», hay otro programa en 8000. No cambies de puerto para seguir esta guía:
encuentra la API anterior o informa el error.

Si aparece «No module named ...», falta una dependencia. Anota el módulo y
detente; no reinstales Python ni borres `.venv`.

5.4. Abre tu navegador habitual en Windows. En la barra de direcciones, escribe:

```text
http://127.0.0.1:8000/api/health
```

Debe aparecer texto JSON con `success: true` y `status: "healthy"` dentro de
`data`. Es normal que no sea una página bonita. Esto comprueba que la API
responde, no que Supabase o el sandbox ya hayan pasado todas sus pruebas.

5.5. En otra pestaña del navegador, abre:

```text
http://127.0.0.1:8000/docs
```

Busca la sección **Laboratorio privado**. Deben estar estas operaciones:

```text
POST /api/builds
GET  /api/builds
GET  /api/builds/{id}
```

Puedes usar **Ctrl+F** y buscar `builds`. No necesitas pulsar «Try it out» ni
«Authorize». Si las rutas no aparecen, probablemente estás viendo una API vieja:
vuelve a tu ventana API, pulsa Ctrl+C, ejecuta de nuevo el comando del paso 5.2
y recarga `/docs`. Si siguen sin aparecer, detente.

### 6. Encender la interfaz en la ventana WEB

6.1. Ve a **WEB**. Comprueba que está en la raíz con `Get-Location`.

6.2. Ejecuta:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

6.3. Espera a ver una dirección como:

```text
http://127.0.0.1:5173/
```

Deja esta ventana abierta. Igual que la API, no debe volver al prompt mientras
el servidor siga encendido. `--strictPort` evita que cambie silenciosamente a
otro puerto si 5173 está ocupado.

6.4. Abre una pestaña de navegador y entra en:

```text
http://127.0.0.1:5173
```

Usa esta misma dirección durante toda la prueba. Aunque `localhost` también
pueda funcionar, cambiar entre `localhost` y `127.0.0.1` puede hacer que el
navegador use otra sesión guardada y parezca que cerraste sesión.

6.5. Inicia sesión con **tu cuenta de Capacita**, la que es dueña del candidato
que vas a probar. No son la cuenta de Ubuntu ni una contraseña de Windows.
Introduce credenciales solo en la aplicación, nunca en comandos de la terminal.

Si no puedes iniciar sesión o no cargan capacidades, no sigas todavía con el
sandbox: primero debe funcionar la conexión de la aplicación con Supabase.

### 7. Encontrar tu candidato guardado

7.1. En Capacita, entra a **Capacidades** y después a **Mis capacidades**.

7.2. Busca tu capacidad privada de normalización de texto, si es la que ya tienes
guardada. Pulsa **Ver** para abrir su detalle. Si no hay una capacidad así en tu
cuenta, ve a la sección 16 antes de continuar.

7.3. En el detalle debe aparecer **Privada** y **Borrador**. Baja dentro de esa
ventana; la barra de desplazamiento del detalle puede ser distinta de la de la
página que está detrás.

7.4. Localiza **Preparar implementación Python**. Pulsa:

```text
Revisar catálogo y cargar candidatos
```

Esta acción busca coincidencias y recupera candidatos guardados. No genera otro
candidato ni consume una generación de Gemini.

7.5. Busca **Candidatos guardados**. Cada candidato tiene una línea que empieza
por «Python · borrador». Pulsa esa línea para desplegarlo.

7.6. Verás proveedor, modelo, SHA-256 y código. Más abajo debe aparecer
**Laboratorio privado**, un cuadro **Casos de prueba (JSON)** y los botones
**Encolar prueba aislada** y **Cargar reportes guardados**.

El SHA-256 identifica el contenido exacto del candidato. No tienes que calcularlo
ni escribirlo: el panel lo manda al backend. No cambies el código del candidato
para probarlo. Los casos de prueba se escriben en el cuadro del laboratorio,
no encima del código mostrado.

Si no aparece «Preparar implementación Python», comprueba que estás en Mis
capacidades, que eres la dueña y que la capacidad tiene definición estructurada.
Si aparecen candidatos pero no el laboratorio, recarga con **Ctrl+F5** y vuelve
a abrir el detalle. Si sigue sin aparecer, anota en qué pantalla estás.

### 8. Primera prueba: comprobar la cola con el trabajador apagado

8.1. Asegúrate de que **TRABAJADOR todavía está esperando comandos**. No ejecutes
su programa aún. API y WEB deben seguir encendidas.

8.2. Para esta primera prueba **deja los casos que el panel cargó automáticamente**.
Son los ejemplos de la definición del candidato. La salida esperada está escrita
de antemano; todavía no fue calculada en esta prueba.

8.3. Pulsa **Encolar prueba aislada una sola vez**. Espera la respuesta del botón.

8.4. Debe aparecer:

```text
En cola: esperando al trabajador
Prueba: un UUID completo
```

Un UUID es un identificador largo, por ejemplo
`aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`. El tuyo tendrá otros caracteres.

8.5. Selecciona y copia **tu identificador completo de Prueba**, no el SHA-256 ni
el identificador corto de ocho caracteres del candidato. Guárdalo en una nota
como «prueba inicial de Fahida». Lo usaremos para localizar el reporte y verificar
privacidad. El UUID no es una contraseña.

8.6. Espera unos cinco segundos y pulsa **Actualizar estado**. Debe seguir en cola,
porque nadie está recogiendo las tareas todavía. El cuadro de casos puede quedar
deshabilitado mientras hay una prueba pendiente: es normal.

Si aparece una prueba completada aunque no has iniciado este trabajador, quizá
quedó otro trabajador de una sesión anterior. No demuestra que la cola falle:
anota ese resultado y localiza la otra terminal.

Si aparece un error rojo, copia su texto. No pulses repetidamente para llenar
la cola. «En cola» no significa que el código ya se ejecutó.

### 9. Encender el trabajador y procesar la prueba

9.1. Ve a **TRABAJADOR** y confirma la carpeta con `Get-Location`.

9.2. Ejecuta:

```powershell
.\.venv\Scripts\python.exe backend/services/build_worker.py
```

No agregues `--once` en este recorrido: queremos dejar al trabajador atendiendo
las siguientes pruebas también.

9.3. Al principio puede no imprimir nada mientras comprueba Ubuntu y busca
tareas. Si la ventana no vuelve al prompt, puede estar funcionando correctamente.
Cuando termine un build debe mostrar una línea como:

```text
Build TU-UUID: passed
```

También podría mostrar `failed`: eso se interpreta revisando el reporte, no
reiniciando todo automáticamente. La línea normal no debe incluir tu texto de
entrada, claves ni una traza completa del candidato.

Si vuelve al prompt con «Trabajador no disponible...», se detuvo. No lo dejes por
encendido: revisa la sección 17 y el resultado de las comprobaciones de Ubuntu.

9.4. Vuelve al navegador, al mismo laboratorio, y pulsa **Actualizar estado**.
Puede pasar por **Probando en aislamiento** o llegar directamente al resultado si
terminó rápido. El panel no se actualiza solo: pulsa el botón de nuevo cada pocos
segundos mientras siga pendiente.

9.5. Un caso válido dispone de hasta 12 segundos de ejecución, más el tiempo de
crear y limpiar su contenedor. Varios casos requieren más tiempo que uno. Si una
prueba de un único ejemplo sigue pendiente durante varios minutos, consulta la
ventana TRABAJADOR y anota qué muestra; no encoles más copias para desbloquearla.

9.6. Si todo coincide con los ejemplos, debe aparecer **Casos superados** y cada
caso debe indicar **superado · Salida correcta**. Si aparece **Prueba fallida**,
abre el resultado de cada caso y guarda el motivo: puede ser un problema real
del candidato o de infraestructura. No todo candidato generado tiene por qué
funcionar correctamente.

9.7. En **CONTROL**, puedes confirmar que se creó la base local:

```powershell
Test-Path '.\output\laboratory\builds.sqlite3'
```

Debe responder **True**. No abras ni borres ese archivo para continuar. Contiene
el estado persistente de las pruebas, no una nueva tabla en Supabase.

### 10. Probar más entradas: texto, vacíos y rechazos de contrato

Esta sección tiene un conjunto concreto para la capacidad **quitar espacios
de los extremos**. Primero verifica su contrato. No lo pegues en un candidato
que recibe otros campos o hace otra operación.

10.1. En el detalle de la capacidad, abre **Ver contratos y definición guardada**.
Comprueba estas condiciones en el JSON:

- `input_schema` tiene una propiedad `texto` de tipo `string` y la exige en
  `required`. `additionalProperties` es `false`.
- `parameter_schema` permite un objeto vacío `{}` y no permite parámetros extra.
- `output_schema` exige `resultado` de tipo `string`.
- Las reglas piden quitar espacios al principio/final y conservar acentos y
  espacios interiores. Para el caso con tabulador/salto de línea, la operación
  debe quitar whitespace en los extremos, como `strip()` de Python.

Si algo no coincide o no sabes identificarlo, conserva la prueba inicial y
comunica la duda antes de usar los once casos. No cambies la definición para
forzar que encaje con esta guía.

10.2. Vuelve al laboratorio. Cuando la prueba inicial tenga resultado final,
pulsa **Preparar otra prueba**. Esto deja el reporte guardado y permite editar
los casos; no elimina el candidato ni la prueba anterior.

10.3. Haz clic **dentro del cuadro Casos de prueba (JSON)**. Pulsa Ctrl+A para
seleccionar su contenido y pega este bloque completo, desde `[` hasta `]`:

```json
[
  {
    "name": "Acentos y espacios interiores",
    "inputs": {"texto": "  Árbol  azul  "},
    "parameters": {},
    "expected_output": {"resultado": "Árbol  azul"},
    "expect_rejection": false
  },
  {
    "name": "Solo espacios",
    "inputs": {"texto": "   "},
    "parameters": {},
    "expected_output": {"resultado": ""},
    "expect_rejection": false
  },
  {
    "name": "Texto vacío",
    "inputs": {"texto": ""},
    "parameters": {},
    "expected_output": {"resultado": ""},
    "expect_rejection": false
  },
  {
    "name": "Texto sin cambios",
    "inputs": {"texto": "sin cambios"},
    "parameters": {},
    "expected_output": {"resultado": "sin cambios"},
    "expect_rejection": false
  },
  {
    "name": "Tabulador y salto de línea",
    "inputs": {"texto": "\tHola\n"},
    "parameters": {},
    "expected_output": {"resultado": "Hola"},
    "expect_rejection": false
  },
  {
    "name": "Falta el campo texto",
    "inputs": {},
    "parameters": {},
    "expected_output": null,
    "expect_rejection": true
  },
  {
    "name": "Texto de tipo incorrecto",
    "inputs": {"texto": 7},
    "parameters": {},
    "expected_output": null,
    "expect_rejection": true
  },
  {
    "name": "Campo de entrada adicional",
    "inputs": {"texto": "Hola", "extra": true},
    "parameters": {},
    "expected_output": null,
    "expect_rejection": true
  },
  {
    "name": "Parámetro no permitido",
    "inputs": {"texto": "Hola"},
    "parameters": {"extra": true},
    "expected_output": null,
    "expect_rejection": true
  },
  {
    "name": "Lista en lugar de objeto de entrada",
    "inputs": [],
    "parameters": {},
    "expected_output": null,
    "expect_rejection": true
  },
  {
    "name": "Parámetros null en lugar de objeto",
    "inputs": {"texto": "Hola"},
    "parameters": null,
    "expected_output": null,
    "expect_rejection": true
  }
]
```

10.4. Qué significa cada parte:

| Campo | Significado |
| --- | --- |
| `name` | Nombre que tú le das al caso. El reporte actual los numera por su posición. |
| `inputs` | Datos de entrada para la capacidad. |
| `parameters` | Opciones de ejecución; `{}` significa que no estás mandando ninguna. |
| `expected_output` | Resultado que debería obtenerse; lo escribes antes de ejecutar. |
| `expect_rejection: true` | El caso debe rechazarse por entrada o parámetros inválidos antes de invocar el candidato. |
| `null` | Ausencia de un valor; no equivale a `{}` ni al texto `"null"`. |

Las comillas deben ser rectas (`"`), los nombres de campos se mantienen en inglés
y `true`, `false`, `null` van en minúscula y sin comillas. En el caso del tabulador,
conserva `\t` y `\n` dentro de la cadena; JSON los interpreta al enviar los datos.

10.5. Pulsa **Encolar prueba aislada** una vez. Guarda el nuevo UUID en tu nota
como «once casos». Debe ser diferente del UUID de la primera prueba.

10.6. Mantén TRABAJADOR encendido y pulsa **Actualizar estado** hasta que termine.
Un candidato que cumpla ese contrato y esa operación debe dar:

- Casos 1–5: **superado · Salida correcta**.
- Casos 6–11: **superado · Entrada rechazada antes de ejecutar**.
- Resultado general: **Casos superados**.

Que los casos 6–11 estén superados significa que la plataforma bloqueó datos
inválidos como esperabas. No significa que ejecutó once veces el código ni que
la función interna del candidato comprobó esas entradas: solo se ejecutan los
cinco casos válidos.

### 11. Verificar que una salida equivocada se detecta

Hazlo solo si estás usando la misma capacidad de texto descrita en la sección 10.
No cambies el código: vamos a declarar a propósito una expectativa incorrecta.

11.1. Espera a que termine la prueba anterior y pulsa **Preparar otra prueba**.

11.2. Haz clic en el cuadro de casos, pulsa Ctrl+A y reemplázalo por:

```json
[
  {
    "name": "Expectativa incorrecta intencional",
    "inputs": {"texto": "  Hola  "},
    "parameters": {},
    "expected_output": {"resultado": "OTRO RESULTADO"},
    "expect_rejection": false
  }
]
```

11.3. Pulsa **Encolar prueba aislada**, guarda su UUID y actualiza el estado.

11.4. Lo esperado es **Prueba fallida** y un caso con **Salida distinta de lo
esperado o contrato incorrecto**. Si la función devuelve `Hola`, no coincide con
`OTRO RESULTADO`. Este fallo es intencional y demuestra que no se marca éxito
solo porque el proceso termine sin excepción.

11.5. No borres ese reporte ni intentes arreglar el código por este caso: lo que
hicimos mal a propósito fue la expectativa. Al preparar la siguiente prueba,
vuelve a usar expectativas correctas.

### 12. Verificar errores del editor antes de ejecutar

12.1. Con la prueba anterior terminada, pulsa **Preparar otra prueba**.

12.2. Guarda temporalmente en una nota el contenido válido del editor.

12.3. Dentro del cuadro de casos, elimina solamente el `]` del final.

12.4. Pulsa **Encolar prueba aislada**. Debe aparecer el error:

```text
Los casos deben ser un JSON válido.
```

No debería aparecer un UUID nuevo ni ejecutarse un build por esa pulsación.

12.5. Restaura el `]` final o pega de nuevo el JSON completo que guardaste.
Con esto el editor vuelve a tener un contenido válido.

12.6. Un segundo error que puedes comprobar, para el contrato de texto anterior,
es pegar este caso bien formado como JSON pero inválido según el contrato:

```json
[
  {
    "name": "Entrada inválida presentada como válida",
    "inputs": {"texto": 7},
    "parameters": {},
    "expected_output": {"resultado": "7"},
    "expect_rejection": false
  }
]
```

12.7. Al encolarlo, la API debe responder un error de validación, como **El caso
no cumple los contratos o carece de salida esperada**, sin crear un build nuevo.
No podemos pedir una ejecución válida con un número donde se exige texto.

Para probar el rechazo esperado, se usa `expect_rejection: true` y salida `null`,
como en la sección 10. Además, cada build necesita al menos un caso válido con
salida esperada: un conjunto formado solo por rechazos no acredita implementación.

### 13. Verificar que el reporte sigue guardado al recargar y reiniciar

13.1. Espera a que no queden pruebas en cola ni probándose. Conserva los UUID
anotados de los builds ya terminados.

13.2. Recarga la aplicación con **F5**. Inicia sesión otra vez solo si la aplicación
lo pide. Vuelve por Capacidades → Mis capacidades → Ver → Revisar catálogo y
cargar candidatos → desplegar el mismo candidato → Laboratorio privado.

13.3. Pulsa **Cargar reportes guardados**. Deben aparecer las pruebas anteriores.
No aparecen automáticamente solo por abrir el candidato. Si hay muchos, pulsa
**Más reportes**. No asumas que el primero de la lista es el último que hiciste;
compara fecha e identificador.

13.4. Pulsa la línea de un reporte. Comprueba que muestra el resultado y que el
UUID completo corresponde a uno de los que anotaste. El UUID corto de la lista
debe coincidir con los primeros ocho caracteres de tu UUID completo.

13.5. Para comprobar también el reinicio de procesos, ve a **TRABAJADOR** y pulsa
**Ctrl+C** cuando esté sin una tarea activa. Espera a que vuelva el prompt.

13.6. Ve a **API**, pulsa Ctrl+C y espera a que vuelva el prompt. No borres la base
SQLite. WEB puede permanecer encendida.

13.7. En **API**, vuelve a ejecutar exactamente:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Espera «Application startup complete».

13.8. En **TRABAJADOR**, vuelve a ejecutar:

```powershell
.\.venv\Scripts\python.exe backend/services/build_worker.py
```

13.9. Recarga la aplicación y repite los pasos 13.2–13.4. Los mismos reportes deben
seguir disponibles con los mismos UUID y estados finales. No hace falta volver
a ejecutar esos casos para que existan sus resultados.

Esta prueba comprueba reinicio con tareas terminadas. No prueba qué ocurre si
se apaga Windows durante la ejecución; ese caso sigue pendiente.

### 14. Verificar privacidad con una segunda cuenta

Para esta parte necesitas **otra cuenta de Capacita**. No basta con abrir otra
pestaña con la misma sesión. No uses la contraseña de Miguel ni compartas tokens.
Si no tienes otra cuenta disponible, registra este apartado como **pendiente**;
no como superado.

14.1. Mantén abierta tu sesión normal como cuenta A. Copia a tu nota el UUID
completo de un build y el del candidato, si lo tienes. Para el acceso directo
al reporte usaremos el **UUID del build**, el que aparece después de «Prueba».

14.2. Abre una ventana privada/incógnito de tu navegador desde su menú. En ella
entra también a `http://127.0.0.1:5173` e inicia sesión como cuenta B. Si ya tenías
una sesión en otra ventana privada del mismo navegador, ciérrala o confirma que
de verdad es la cuenta B: las ventanas privadas pueden compartir entre sí sesión.

14.3. En esa cuenta, entra a Mis capacidades. La capacidad privada de A no debe
aparecer como propia. No cambies la capacidad a pública para probar este caso.

14.4. Comprobar solo la lista no prueba que GET directo al reporte dé 404.
La interfaz actual no tiene un campo «abrir reporte por UUID». Para ese control
adicional puedes usar las herramientas del navegador con esta llamada de lectura.
No necesitas obtener, copiar ni pegar un JWT.

14.5. Primero, en la ventana **normal de A**, con Capacita abierta, pulsa **F12**
(en algunos teclados, Fn+F12). Se abre un panel lateral o inferior. Busca la
pestaña **Console/Consola**; si no la ves, puede estar en el menú `»` del panel.

14.6. En la línea de entrada de la consola, escribe esta llamada, sustituyendo
`TU_UUID_DE_BUILD` por el UUID completo anotado y conservando las comillas:

```javascript
await (await import('/src/api.js')).api('/builds/TU_UUID_DE_BUILD')
```

Es una lectura al mismo backend desde el cliente de la aplicación, con la sesión
que está abierta en esa ventana. No cambia datos ni imprime el token.
No escribas esto en PowerShell ni en la barra de direcciones.

Si el navegador impide pegar comandos por su protección, no desactives esa
protección ni escribas frases para habilitar el pegado. Deja la comprobación
directa como pendiente y comunícalo; el resto de la guía puede completarse.

14.7. En A debe devolver un objeto con el id y estado de **su propio build**.
Puedes desplegar el objeto con su flecha. No hace falta compartir el objeto
completo ni datos de otros apartados de la consola.

14.8. Repite la misma llamada en la **consola de la ventana privada de B**, con
la aplicación abierta y B autenticada. Debe fallar con **Prueba no encontrada**.
Para confirmar el código HTTP, abre también la pestaña **Network/Red** de las
herramientas; mantenlas abiertas, vuelve a la consola y repite esa lectura.
Regresa a Network/Red y busca la petición que contiene `/builds/` y el UUID.
La columna Status/Estado, o Headers/Encabezados → Status Code/Código de estado,
debe indicar **404**. En A esa misma lectura debe dar **200**.

El cliente de la aplicación convierte el error HTTP en un mensaje; por eso
la consola por sí sola puede mostrar el texto sin el número 404.

14.9. Si obtienes **401**, la cuenta B no tiene una sesión válida: eso no prueba
el control de acceso entre dos usuarios. Si abres la URL del API directamente
en una pestaña, tampoco estarás mandando automáticamente el token del frontend;
un 401 allí no equivale al 404 que buscamos con B autenticada.

14.10. Para comprobar que tampoco puede listar reportes de A, en la consola de B
ejecuta, cambiando el UUID por el mismo **UUID del build de A**:

```javascript
(await (await import('/src/api.js')).api('/builds?limit=100')).items.some(item => item.id === 'TU_UUID_DE_BUILD')
```

Debe devolver **false**. Si B ya tiene muchos reportes y hay paginación, una sola
página no demuestra toda la lista; el control decisivo de este recorrido es el
GET directo 404 del paso 14.8. No necesitas que B no tenga ningún reporte propio.

14.11. Si B puede leer el reporte de A o el GET directo responde 200, detén esa
comprobación y comunícalo como fallo de privacidad, sin compartir el contenido.
Al terminar puedes cerrar la ventana privada y el panel de herramientas.

### 15. Apagar todo al terminar

15.1. Espera a que las pruebas que encolaste lleguen a un estado final.

15.2. En **TRABAJADOR**, pulsa Ctrl+C y espera el prompt.

15.3. En **API**, pulsa Ctrl+C y espera el prompt.

15.4. En **WEB**, pulsa Ctrl+C. Si Windows pregunta si deseas terminar el trabajo
por lotes, confirma la opción afirmativa que indique el propio mensaje, y pulsa
Enter. Cuando vuelva el prompt, Vite está detenido.

15.5. Puedes cerrar las ventanas PowerShell y el navegador. Los reportes quedan
guardados; no necesitas exportar SQLite ni hacer commit de ese archivo.

No hace falta apagar Ubuntu ni Docker Desktop manualmente. Ubuntu puede seguir
activo en segundo plano; dejarlo así no significa que los candidatos sigan
ejecutándose. Si quieres detener **solo Ubuntu-24.04**, primero comprueba que
no estás usando otra tarea allí y, desde CONTROL, puedes ejecutar:

```powershell
wsl --terminate Ubuntu-24.04
```

Este último paso es opcional y detiene todos los procesos de esa distribución.
No uses `wsl --shutdown` para este recorrido: afectaría también a otras
distribuciones, incluido Docker Desktop. La próxima vez los comandos dirigidos
a Ubuntu volverán a iniciarlo.

### 16. Qué hacer si tu cuenta no tiene candidato

Un candidato privado de Miguel no aparece automáticamente en tu cuenta por
compartir el repositorio Git. Git comparte código de la aplicación; Supabase
conserva candidatos y propietarios por cuenta.

16.1. Confirma primero que estás en la cuenta correcta. Si tienes una cuenta
propia donde ya guardaste un candidato, usa esa y vuelve al paso 7.

16.2. Si no tienes ninguno, puedes preparar uno desde la aplicación. Esto ya
incluye una generación nueva en Gemini, con su consentimiento y consumo de
cuota. No es necesario para comprobar solo el arranque de Windows/Ubuntu.

16.3. En Capacidades → Crear, pulsa **Cargar ejemplo editable**. El ejemplo es
«Normalizar espacios de un texto». Revisa nombre, entradas, salidas y reglas.
Mantén permisos y recursos externos vacíos y usa datos de ejemplo sin información
personal. No necesitas escribir un objetivo para llamar a la interpretación IA.

16.4. Pulsa **Comprobar definición y buscar similares**. Revisa los resultados.
Si realmente necesitas una definición distinta, marca la confirmación de
coincidencias que aparezca y pulsa **Guardar definición privada**. Si una
capacidad existente resuelve lo que necesitas, no generes otra innecesariamente.

16.5. Abre la definición guardada desde Mis capacidades → Ver. En Preparar
implementación Python pulsa **Revisar catálogo y cargar candidatos**.

16.6. Lee las coincidencias y el consentimiento a Google Gemini. Si decides
generar, confirma solo lo que corresponda y pulsa **Generar y guardar candidato
privado** una vez. No actives facturación ni cambies claves por esta guía.

16.7. Espera el resultado. Si aparece un error de cuota, falta de configuración
o permisos, anótalo y detente: no repitas muchas veces. SQL 06 ya se reportó
aplicado; no debe reaplicarse para intentar arreglar un fallo de red.

16.8. Si el candidato se guarda, recarga la página, vuelve al detalle y pulsa
Revisar catálogo y cargar candidatos. Comprueba que sigue allí y vuelve al
paso 7.5. Si no existe una generación configurada o autorizada para tu cuenta,
la prueba con candidato real queda pendiente; no se sustituye por un resultado
ficticio ni por ejecutar el código a mano en Windows.

### 17. Problemas frecuentes y dónde detenerte

| Lo que ves | Qué significa / siguiente paso |
| --- | --- |
| Ubuntu figura Stopped antes de empezar | Puede ser normal. Sigue con el comando del paso 4.2 para iniciarlo. |
| Error al ejecutar `wsl`, Ubuntu ausente o acceso denegado | Guarda ese mensaje y detente en sección 4. No reinstales ni cambies permisos a ciegas. |
| Docker is-active no dice active | El Engine de Ubuntu no está listo; no inicies el trabajador. |
| Falta socket o runsc | Revisa 4.4–4.6 antes de continuar. No uses Docker Desktop como sustituto. |
| Puerto 8000 o 5173 ocupado | Localiza la terminal anterior; detén únicamente el proceso que reconozcas. No saltes a otro puerto. |
| La página pide configurar Supabase o no permite login | Es configuración/conexión de la aplicación; no se arregla reiniciando gVisor. No muestres `.env`. |
| No se ven builds en /docs | Probablemente API anterior. Reinicia la API de esta guía y recarga. |
| Error 404 al recuperar un candidato | Puede ser otra cuenta, otro proyecto o un UUID inexistente. No cambies privacidad para saltarlo. |
| En cola sin cambios | Comprueba que TRABAJADOR sigue abierto y no volvió al prompt. Luego Actualizar estado. |
| Trabajador no disponible | Puede faltar Ubuntu/Docker/runsc o estar ocupado el lock por otro trabajador/batería. No abras más copias. Detén solo tus pruebas/worker anteriores cuando estén inactivos y repite comprobaciones. |
| Casos superados pero la capacidad sigue Borrador | Es correcto. Probar no habilita ni publica automáticamente. |
| Prueba fallida en sección 11 | Es lo esperado por la salida equivocada que declaramos intencionalmente. |
| Entrada rechazada en casos 6–11 | Es el éxito esperado del control de contrato si aparece «superado». |
| OOM/memoria, tiempo agotado, sandbox no disponible o limpieza no confirmada en una prueba simple | Anota UUID, motivo y mensaje del trabajador; no sigas encolando hasta revisarlo. |
| No ves reportes después de F5 | Vuelve a desplegar el candidato y pulsa Cargar reportes guardados. |
| Error al pegar en consola del navegador | No desactives protecciones. Deja el acceso directo entre cuentas como pendiente. |

### 18. Qué resultados anotar para contarme cómo fue

Puedes copiar esta lista a una nota y marcar **OK**, **FALLÓ** o **PENDIENTE**.
Un paso no realizado se queda pendiente, aunque los automáticos hayan pasado.

```text
1. Python/Node y archivos de Windows:
2. Ubuntu-24.04 en WSL2:
3. Docker de Ubuntu, socket exclusivo, runsc e imagen:
4. API healthy y rutas builds en /docs:
5. WEB abierta y login propio:
6. Candidato propio visible con Laboratorio privado:
7. Build queda en cola con trabajador apagado:
8. Trabajador procesa los ejemplos del candidato:
   UUID del build:
   Resultado y motivo si falla:
9. Once casos del contrato de texto (si corresponde):
   UUID del build:
10. Expectativa incorrecta produce prueba fallida:
11. JSON roto/entrada incompatible se rechazan sin build nuevo:
12. Reportes conservados tras F5 y reinicio de API/trabajador:
13. Cuenta A obtiene su reporte con HTTP 200:
14. Cuenta B autenticada obtiene 404 para el mismo UUID:
15. Fin de la prueba, procesos detenidos:
Paso exacto donde me quedé o mensaje que apareció:
```

No copies contraseñas, tokens, claves ni contenido de `.env`. Si necesitas
mostrar una captura, basta el área del error o el reporte de tus datos de prueba.
Esta lista no afirma que ya hayas hecho la verificación: queda pendiente hasta
que la realices y tengamos sus resultados.

---

## Referencia técnica del bloque 2

Las secciones siguientes describen la implementación y sus límites. Para hacer
la prueba manual basta con el recorrido anterior; no hay que ejecutar además
las baterías automáticas ni repetir instalaciones.

## Separación de procesos

1. FastAPI autentica con la dependencia de A y obtiene el candidato privado con
   `CandidateRepository`. La lectura del origen usa el catálogo y `visible_to`.
2. Revalida definición, AST, contratos, identificadores y ambos hashes. Rechaza
   permisos/recursos externos, dependencias extra y casos inconsistentes.
3. Guarda una instantánea del candidato y casos en SQLite local, asignando el
   dueño desde la sesión. Solo devuelve metadatos y reportes al dueño.
4. Un trabajador separado reclama la tarea atómicamente y vuelve a revalidar.
   No importa ni ejecuta el source en Windows, FastAPI o el trabajador.
5. El controlador Linux crea un contenedor gVisor nuevo por caso válido y pasa
   únicamente source, inputs y parameters por stdin. El harness mantenido por B
   invoca `run` dentro del invitado. Los casos con entrada inválida no lo invocan.
6. El trabajador comprueba JSON finito, contrato de salida y resultado esperado
   fuera del invitado. Conserva solo resultado de caso, motivo, tiempos, límites
   y entorno; descarta stdout, stderr, valores y trazas del candidato.

Los casos los aporta quien prueba (`test_origin=owner_supplied`), inicialmente a
partir de sus ejemplos. No son pruebas independientes auditadas de seguridad o
corrección universal. Los tests de B incluyen casos adicionales con resultados
conocidos. Ni el estado pasado ni un reporte local autorizan habilitación en A.

## Entorno y almacenamiento

- Windows: API y trabajador usan el mismo `.venv` y
  `output/laboratory/builds.sqlite3` (ignorado). SQLite sobre el disco local:
  no compartir ese archivo entre procesos Windows y Linux o equipos distintos.
- Ubuntu 24.04/WSL2: Engine propio con runsc. El nuevo socket exclusivo
  `/run/capacita-docker.sock` evita que la integración Docker Desktop reemplace
  `/run/docker.sock`. No se cambia el daemon de Docker Desktop.
- Imagen Python fijada al digest del bloque 1. No hay pull automático ni fallback
  a runc. El controlador registra versiones de Docker/runsc y digest.
- Red none, uid/gid 65534, raíz de solo lectura, sin capabilities ni privilegios
  nuevos, sin montajes del host/socket, tmpfs 16 MiB, memoria+swap total 256 MiB,
  CPU 0,5, 64 tareas del host, máximo 8 procesos invitados, 64 descriptores y
  archivos de hasta 1 MiB. Salida combinada limitada a 64 KiB, sin logs Docker.
- Tiempo de ejecución por caso: 12 s, igual al perfil general B1. El primer
  intento a 3 s cortó la prueba de memoria antes de OOM; no se contó como prueba
  de límite de memoria. Crear/inspeccionar/eliminar tiene timeout separado.
- Un trabajador por BD mediante lock del sistema. Una tarea de sandbox a la vez
  mediante el mismo flock del bloque 1. Máximo 3 trabajos pendientes por dueño,
  20 pendientes globales y 1–20 casos por build, hasta 64 KiB de casos.

La persistencia es real pero local, sin RLS de PostgreSQL: autorización por
propietario en la API y archivo del host fuera del sandbox. Un administrador
local puede modificarlo. No tiene firma ni almacenamiento compartido/retención
de producción. A/B deben revisar el contrato y el almacenamiento confiable antes
de usar evidencia para habilitación o desplegar en varios equipos. No se creó
ni aplicó una migración remota y no se necesita una credencial de servicio.

## API implementada

Envelope habitual `APIResponse`; errores `{detail}`. Todas las rutas exigen sesión.

| Operación | Contrato |
| --- | --- |
| `POST /api/builds` | Header obligatorio `Idempotency-Key` (1–128 caracteres), body `{candidate_id, artifact_hash, cases}`; 202 con BuildResponse. No acepta source ni owner del cliente. |
| `GET /api/builds/{uuid}` | Reporte/metadatos propios; inexistente o ajeno 404. |
| `GET /api/builds` | `{items,next_cursor}`, límite 1–100, cursor UUID y filtro opcional candidate_id; solo propios. |

La clave se aplica por dueño y petición completa: repetir devuelve el mismo build;
reutilizarla con otros casos devuelve 409. El cliente conserva la clave tras una
respuesta perdida y la cambia al editar casos o preparar otra prueba.

Estados: `queued → testing → passed/failed`; una tarea testing encontrada al
reiniciar pasa a `interrupted`, sin reejecución automática. `passed` solo significa
que pasaron esos casos sobre ese hash. BuildResponse incluye id, candidate_id,
artifact_hash, fechas UTC, status, report y `implementation_enabled=false`.
No se aceptan cambios de estado/reportes desde la API ni se expone la instantánea.

## Fallos, recuperación y verificaciones

El controlador siempre intenta eliminar y comprobar ausencia del contenedor
propio, incluso con timeout, OOM, salida excesiva o error. Antes de otra invocación,
bajo el lock global, limpia contenedores que quedaron con etiqueta
`capacita.laboratory=block2` y prefijo `capacita-lab-`. No toca otros contenedores.
El arranque del trabajador comprueba esta recuperación antes de marcar testing
como interrupted. Una caída de Windows puede retrasar la limpieza hasta el
siguiente arranque; no se presenta como recuperación de apagado abrupto probada.

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend/tests -t backend
.venv/Scripts/python.exe scripts/maintenance/verify_laboratory.py
```

La segunda orden accede a WSL/Docker y ejecuta únicamente candidatos de fixture
públicos en gVisor; no usa IA, cuenta Supabase ni candidato ajeno. Debe terminar
con todos PASS y código 0. Reporte local ignorado:
`output/laboratory/block2-latest.json`. Los estados `failed` de fixtures de timeout,
OOM o salida incorrecta son el resultado esperado, no un error de la batería.

El recorrido con candidato remoto propio, sesiones reales y navegador es una
verificación distinta; no se acredita con fixtures ni con lint/build.

## Integración y propiedad

B mantiene modelos `schemas/builds.py`, repositorio local, rutas, trabajador,
controlador, panel y pruebas. La instrucción vigente de implementar bloque 2
autoriza los enlaces mínimos de integración en archivos de A: registrar router,
enviar Idempotency-Key desde `src/api.js` e insertar el panel de B en el detalle
del candidato. No cambia contratos previos de candidatos/definiciones. Se dejan
para revisión A; no se atribuye una revisión conjunta ya realizada.

Pendientes: aceptación autenticada, revisión A del almacenamiento/evidencia,
recuperación tras apagado abrupto y retención. Bloque 3: versiones habilitadas y
ejecución persistente; no conectar este laboratorio al motor heredado como atajo.
