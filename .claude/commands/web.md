# Comando: /web

Automatiza navegación web con Playwright cuando los MCPs disponibles no resuelven la tarea.
Siempre headless. Con sesión persistente. Con guardrails de seguridad. Con KB por sitio.

---

## Cuándo activarse

1. El usuario pide información o acción en una web.
2. Los MCPs disponibles no pueden resolverlo (login requerido, SPA, contenido dinámico, interacción compleja).
3. Activación explícita: el usuario dice "usa el browser", "entra a X", "busca en Y".

**No reemplaza MCPs cuando estos pueden resolver la tarea.**

---

## Protocolo de ejecución — siempre en este orden

### 0. Entender el objetivo → buscar proceso existente (SIEMPRE PRIMERO)

Antes de cualquier otra cosa: identificar qué quiere hacer el usuario y si ya hay un proceso documentado.

```bash
bash .claude/scripts/kb-query.sh --list                           # sitios + procesos conocidos
bash .claude/scripts/kb-query.sh _processes                       # procesos con descripción completa
bash .claude/scripts/kb-query.sh _processes --search <keyword>    # buscar por keyword
```

**Regla de decisión:**
- Si hay un proceso que cubre el objetivo (total o parcialmente) → **seguir `steps.md` del proceso**.
  No re-explorar lo que ya está documentado.
- Si hay un proceso parcialmente válido (cubre algunos pasos) → usarlo para los pasos que apliquen, completar el resto consultando los sites KB del proceso.
- Si no hay proceso → continuar al Paso 1 y construirlo sobre la marcha.

Un proceso aplica si cubre: el mismo sitio + el mismo tipo de acción (leer, escribir, buscar, filtrar...).
Los keywords del `_index.yml` de procesos ayudan a hacer el match rápidamente.

### 1. Consultar KB del sitio (si no hay proceso completo)

```bash
bash .claude/scripts/kb-query.sh <dominio> --index
bash .claude/scripts/kb-query.sh <dominio> <apartado>
```

- Si hay scripts previos para el apartado → usarlos directamente (no re-explorar).
- Si hay `stale: true` en el apartado → re-explorar con `--snapshot` antes de ejecutar.
- Si el sitio no existe en KB → explorar y documentar durante la ejecución.

### 2. Clasificar la acción con security-guard

```bash
node browser/browse.js --url <url> --action "<descripción>" ...
```

`browse.js` clasifica automáticamente. Para acciones sensibles detectadas:
- Si el usuario YA confirmó explícitamente en la conversación → pasar `--confirmed`.
- Si no → `browse.js` mostrará el prompt de confirmación y esperará ENTER.

**Acciones SIEMPRE bloqueadas sin confirmación**:
- Enviar mensajes / correos
- Eliminar recursos
- Hacer pagos o confirmar compras
- Cambiar configuración de cuenta o contraseña
- Publicar contenido (posts, comentarios, tweets)
- Descarga masiva de datos de terceros
- Aceptar términos legales

### 3. Crear log de sesión

```bash
SESSION_ID=$(node browser/scripts/session-log.js create "<dominio>" "<acción>" "<url>")
```

### 4. Ejecutar con browse.js

**Lectura simple:**
```bash
node browser/browse.js \
  --url <url> \
  --action "<descripción>" \
  --session <dominio> \
  --output /tmp/result.json
```

**Con script conocido de KB:**
```bash
node browser/browse.js \
  --url <url> \
  --script ~/.claude/browser-kb/<dominio>/<apartado>/scripts/<nombre>.js \
  --session <dominio> \
  --output /tmp/result.json
```

**Con snapshot DOM (primera vez en un apartado):**
```bash
node browser/browse.js \
  --url <url> \
  --action "<descripción>" \
  --session <dominio> \
  --section <apartado> \
  --snapshot \
  --output /tmp/result.json
```

**Paralelo (cuando hay múltiples URLs a procesar):**
```bash
node browser/browse.js \
  --urls <url1>,<url2>,<url3> \
  --script ~/.claude/browser-kb/<dominio>/<apartado>/scripts/<nombre>.js \
  --mode parallel \
  --max-tabs 5 \
  --output /tmp/result.json
```

### 5. Autenticación — cuándo y cómo

**Regla fundamental: la autenticación se coordina por el chat, nunca por terminal.**
El usuario no ve la terminal de Claude — todo aviso debe ir como mensaje en la conversación.

#### Flujo estándar (perfil persistente — la mayoría de casos)

`browse.js --session <dominio>` lanza el navegador con el perfil de Chromium en
`~/.claude/browser-profiles/<dominio>/`. Si la sesión sigue activa, funciona headless sin intervención.

Verificar antes de lanzar:
```bash
ls ~/.claude/browser-profiles/<dominio>/Default/Cookies 2>/dev/null && echo "PROFILE_EXISTS"
```

#### Flujo cuando AUTH_REQUIRED (sesión caducada o primer uso)

El script devuelve `{ error: "AUTH_REQUIRED" }`. Entonces:

**Paso A** — Lanzar auth en background (no bloquea):
```bash
node browser/scripts/whatsapp-auth.js --domain <dominio> &
# Esperar a que aparezca el archivo de señal (2-3 segundos):
sleep 3 && ls /tmp/wa-auth-waiting-<dominio_guiones> 2>/dev/null
```

**Paso B** — Informar al usuario **en el chat** (no en terminal):
```
Abrí [dominio] en una ventana del navegador. Por favor:
1. Escanea el QR / inicia sesión normalmente.
2. Cuando veas tu contenido (chats, bandeja, etc.), escríbeme "listo" aquí.
```

**Paso C** — Cuando el usuario diga "listo" en el chat:
```bash
# Señalizar al script en background que puede continuar
touch /tmp/wa-auth-ready-<dominio_guiones>
# Esperar a que el script guarde la sesión y cierre el navegador
sleep 5
```

**Paso D** — Continuar con browse.js headless normalmente.

> El nombre del archivo de señal usa `_` en lugar de `.` en el dominio.
> Ejemplo para `web.whatsapp.com`: `/tmp/wa-auth-ready-web_whatsapp_com`

**No interrumpir al usuario por auth si ya hay perfil de sesión activo.**

### 6. Cerrar recursos y cerrar sesión

```bash
node browser/scripts/session-log.js close "$SESSION_ID" success
```

`browse.js` cierra el browser automáticamente al terminar. El session log queda registrado para auditoría.

---

## Post-ejecución — documentar la KB (OBLIGATORIO, no opcional)

Después de cada ejecución, **siempre** verificar qué se aprendió y actualizarlo.
Esta fase no es opcional: si no se documenta, el conocimiento se pierde.

### Qué verificar siempre

1. **¿Se ejecutó un script ya documentado sin cambios?** → No hacer nada.
2. **¿Se adaptó un script existente (ej: cambio de nombre de chat)?** → Actualizar el script en KB si el cambio es estructural; si es solo un parámetro, evaluar si conviene parametrizar el script.
3. **¿Se descubrió un nuevo selector o herramienta en un sitio ya conocido?**
   → Añadir a `tools.md` del apartado + registrar script + actualizar `_index.yml` del sitio.
4. **¿Se accedió a un sitio completamente nuevo?**
   → Crear `constitution.md` + `_index.yml` + sección con `tools.md` + `dom-snap.html`.
5. **¿Se completó un proceso de múltiples pasos o multi-sitio?**
   → Si no existía proceso documentado → crear `_processes/<nombre>/constitution.md` + `steps.md`.
   → Actualizar `_processes/_index.yml` con el nuevo proceso (incluyendo `keywords:`).
6. **¿El proceso existente tenía pasos incorrectos o desactualizados?**
   → Actualizar `steps.md` del proceso + marcar con `updatedAt`.

### Si el sitio o apartado es nuevo

```javascript
// En Node.js o via browse.js --script
const { initSite, addTool, saveScript } = require('./browser/lib/kb-writer');

initSite('<dominio>', '<descripción del sitio>');
addTool('<dominio>', '<apartado>', {
  name: '<nombre-herramienta>',
  description: '<qué hace>',
  selector: '<selector CSS usado>',
  script: '<nombre-script>.js',
});
saveScript('<dominio>', '<apartado>', '<nombre>', `<código JS exacto que funcionó>`);
```

### Si un selector falló

```javascript
const { markStale } = require('./browser/lib/kb-writer');
markStale('<dominio>', '<apartado>');
```

Luego re-explorar con `--snapshot` para obtener nuevo DOM de referencia y actualizar `tools.md`.

### Si es un proceso nuevo o actualizado

```javascript
const { addProcess } = require('./browser/lib/kb-writer');
addProcess('<nombre-proceso>', '<descripción>', [
  'Paso 1: ...',
  'Paso 2: ...',
]);
```

Y actualizar `_processes/_index.yml` a mano añadiendo `keywords:` relevantes:
```yaml
  <nombre-proceso>:
    description: <descripción corta>
    constitution: <nombre-proceso>/constitution.md
    steps: <nombre-proceso>/steps.md
    sites:
      - <dominio>
    keywords:
      - <keyword1>
      - <keyword2>
    updatedAt: 'YYYY-MM-DD'
```

---

## Paralelismo — cuándo activarlo

Usar `--mode parallel` cuando:
- Hay 3+ URLs del mismo tipo a procesar (ej: leer N correos, N productos, N resultados).
- La extracción de cada URL es independiente.
- Ya se tiene un script validado para el apartado.

Flujo recomendado:
1. Filtrar/listar URLs primero (single headless).
2. Lanzar extracción paralela con el script validado.
3. Leer resultados de `browser/tmp/<session-id>/` cuando aparezca `DONE`.

```bash
node browser/scripts/session-log.js list  # ver sesiones paralelas en curso
```

---

## KB stale — protocolo

Si al ejecutar un script de KB aparece error de selector:
1. Ejecutar con `--snapshot` para capturar DOM actualizado.
2. Leer el nuevo `dom-snap.html` para identificar selectores vigentes.
3. Actualizar `tools.md` y el script.
4. Limpiar `stale: true` del `_index.yml` via `initSite` o edición directa.

---

## CDP — arrancar Brave con debug port

Para que Claude use tu Brave ya autenticado (modo recomendado):

```bash
# Cerrar Brave primero, luego relanzar con debug port:
open -a "Brave Browser" --args --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1

# Verificar que está activo:
curl -s http://localhost:9222/json/version | head -2
```

### Modos CDP (de menor a mayor intrusión)

| Flag | Modo | Comportamiento |
|------|------|----------------|
| *(ninguno)* | **cookie-bridge** ✅ | Extrae cookies → browser headless separado. **Tu Brave no se toca.** |
| `--cdp-tab` | direct-tab | Abre pestaña nueva dentro de tu Brave (visible brevemente) |
| `--no-cdp` | sin CDP | Lanza Chromium con perfil persistente o pide auth si no hay sesión |

**Por defecto siempre usa cookie-bridge**: cero pestañas visibles, proceso headless completamente aislado, con tu sesión autenticada.

---

## Referencia rápida de comandos

```bash
# Consulta KB — búsqueda de proceso (SIEMPRE PRIMERO)
bash .claude/scripts/kb-query.sh --list
bash .claude/scripts/kb-query.sh _processes
bash .claude/scripts/kb-query.sh _processes --search <keyword>
bash .claude/scripts/kb-query.sh _processes <proceso>

# Consulta KB — sitio específico
bash .claude/scripts/kb-query.sh <dominio> --index
bash .claude/scripts/kb-query.sh <dominio> <apartado>
bash .claude/scripts/kb-query.sh <dominio> <apartado> --script <nombre.js>

# Ejecución
node browser/browse.js --url <url> --action "<desc>" --session <dominio> --output /tmp/r.json
node browser/browse.js --url <url> --script <path.js> --session <dominio> --output /tmp/r.json
node browser/browse.js --urls <u1,u2,u3> --script <path.js> --mode parallel --output /tmp/r.json

# Session logs
node browser/scripts/session-log.js create <dominio> "<acción>" <url>
node browser/scripts/session-log.js close <session-id> success
node browser/scripts/session-log.js list

# KB management
node -e "require('./browser/lib/kb-writer').markStale('<dominio>', '<apartado>')"
node browser/scripts/kb-init.js
```

---

## Estructura de la KB

```
~/.claude/browser-kb/
├── _index.yml                       ← índice maestro de sitios
├── _sessions/                       ← logs de sesión (últimas 50)
│   └── <session-id>.json
├── _processes/
│   ├── _index.yml                   ← índice de procesos con keywords
│   └── <proceso>/
│       ├── constitution.md
│       └── steps.md
└── <dominio>/                       ← e.g. web.whatsapp.com
    ├── constitution.md
    ├── _index.yml
    ├── _sessions/
    │   └── cookies.json
    └── <apartado>/                  ← e.g. chats/, auth/, inbox/
        ├── tools.md
        ├── dom-snap.html
        └── scripts/
            └── <accion>.js
```
