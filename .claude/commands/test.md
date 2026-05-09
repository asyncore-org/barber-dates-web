# Comando: /test

Lanza el runner de Playwright (`browser/browse.js`) para navegar la app y verificar flujos principales visualmente.
Genera `TEST.md` con veredicto PASS/FAIL por flujo.
Guarda selectores y scripts en la KB de `localhost:5173` para acelerar ejecuciones futuras.

**Posición en el ciclo de vida**: después de `/review`, antes de `/done`.

```
/implement → /review → /test → /done
/change (ajustes) → [/plan si complejo] → /implement → /review → /test
```

## Uso

```
/test                              # flujos del README o por defecto (local/mock)
/test <descripción libre>          # testea exactamente lo que describes
/test --pre                        # flujos del README o por defecto (PRE real)
/test --pre <descripción libre>    # testea lo que describes contra PRE
```

Ejemplos:
```
/test login y registro
/test que se puede reservar una cita y cancelarla
/test --pre el flujo completo de puntos de fidelidad
```

## Precondiciones

- El plan está en estado `approved` o `done` (todos los pasos implementados).
- `/review` ya se ha ejecutado y no hay bloqueos abiertos.
- `browser/browse.js` existe en el proyecto (runtime primario).
  Si no existe → verificar si el MCP de Playwright está configurado en `~/.claude/settings.json`:
  ```json
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
  ```
  Si ninguno está disponible → reportar error y detener.

## Lo que debes hacer

### 1. Identificar tarea activa y modo

```bash
bash .claude/scripts/active-task.sh
```

Leer el argumento del comando:
- Sin `--pre` → **modo local** (servidor de desarrollo, todo mockeado).
- Con `--pre` → **modo PRE** (backend InsForge real, requiere credenciales).

### 2. Credenciales (solo modo PRE)

Si el modo es `--pre`, preguntar al usuario:
- Email de la cuenta de test en InsForge PRE
- Contraseña de esa cuenta

Guardar en variables temporales de sesión. **No escribir en ningún archivo.**

### 3. Detectar o levantar el servidor de desarrollo

```bash
curl -s --max-time 2 http://localhost:5173 -o /dev/null -w "%{http_code}"
```

- Si devuelve `200` (o cualquier código HTTP) → servidor ya corre, continuar.
- Si falla (exit code distinto de 0 o timeout) → levantar en background:

```bash
pnpm dev &
DEV_SERVER_PID=$!
```

Luego hacer polling hasta que responda (máx 30 intentos × 1 s = 30 s):

```bash
for i in $(seq 1 30); do
  curl -s --max-time 1 http://localhost:5173 -o /dev/null && break
  sleep 1
done
```

Si no responde tras 30 s → reportar error al usuario y terminar.

Anotar si el servidor fue levantado por nosotros (`DEV_SERVER_STARTED=true`) para apagarlo al final.

### 4. Determinar flujos a testear

Prioridad decreciente — usar el primer nivel que aplique:

**Nivel 0 — argumento del comando (mayor prioridad)**

Si el usuario pasó texto libre al invocar `/test` (ej. `/test login y reserva de cita`):
→ Usar ese texto directamente como definición de flujos.
→ Saltar los niveles 1 y 2.

**Nivel 1 — sección en el README de la tarea**

Si no hay argumento, buscar sección `## Flujos a testear` en el `README.md` de la tarea activa:

```bash
bash .claude/scripts/section.sh .claude/tasks/<TASK-ID>/README.md "Flujos a testear"
```

Si la sección existe → usar esos flujos.

**Nivel 2 — flujos por defecto (fallback)**

Si tampoco existe la sección → usar los **flujos por defecto** (ver más abajo).

### 5. Consultar KB antes de explorar

**Siempre antes de abrir el browser**, consultar si hay conocimiento previo de la app:

```bash
bash .claude/scripts/kb-query.sh localhost:5173 --index
```

Interpretar el resultado:

| Situación | Acción |
|-----------|--------|
| Apartado con scripts y sin `stale: true` | Usar script existente directamente (paso 6 vía ruta rápida) |
| Apartado con `stale: true` | Lanzar con `--snapshot` primero para actualizar DOM |
| KB vacía o sección no existe | Lanzar en modo exploración y documentar al terminar |

Si hay scripts conocidos para los flujos a testear → anotarlos, serán pasados a `browse.js` con `--script`.

### 6. Ejecutar flujos con browse.js

Crear carpeta de capturas:

```bash
mkdir -p .claude/tasks/<TASK-ID>/screenshots
```

#### 6a. Determinar si usar modo paralelo

El modo paralelo de `browse.js` aplica el **mismo** `--script` o `--action` a todas las URLs simultáneamente.
Úsalo cuando:
- Hay **≥ 3 rutas** a verificar con la **misma comprobación** (ej. "la ruta carga sin error").
- Los flujos **no tienen dependencias** entre sí (ninguno requiere sesión autenticada).
- **No usar en modo PRE**: el parallel runner no restaura sesión de usuario.

Usa modo **secuencial** cuando:
- Los flujos tienen scripts distintos.
- Algún flujo depende del resultado o sesión de otro (ej. F-4 tras F-3 login).
- Estás en modo PRE.

#### 6b. Ejecutar (secuencial — un flujo por llamada)

Para cada flujo, elegir la variante según KB:

**Con script conocido de KB (ruta rápida):**
```bash
node browser/browse.js \
  --url http://localhost:5173<ruta-del-flujo> \
  --script ~/.claude/browser-kb/localhost:5173/<apartado>/scripts/<nombre>.js \
  --session localhost:5173 \
  --output /tmp/test-flow-<N>.json
```

**Sin script previo (exploración + snapshot):**
```bash
node browser/browse.js \
  --url http://localhost:5173<ruta-del-flujo> \
  --action "<descripción del flujo con pasos concretos>" \
  --session localhost:5173 \
  --section <apartado> \
  --snapshot \
  --output /tmp/test-flow-<N>.json
```

Tras cada ejecución, leer `/tmp/test-flow-<N>.json` para obtener resultado (PASS/FAIL) y ruta al screenshot.

#### 6c. Ejecutar (paralelo — ≥ 3 rutas con la misma verificación)

Solo cuando todas las URLs comparten el mismo script de comprobación (ej. script de health-check que verifica que `#root` tiene contenido):

```bash
node browser/browse.js \
  --urls http://localhost:5173<ruta1>,http://localhost:5173<ruta2>,http://localhost:5173<ruta3> \
  --script ~/.claude/browser-kb/localhost:5173/<apartado>/scripts/health-check.js \
  --mode parallel \
  --max-tabs 4 \
  --output /tmp/test-parallel.json
```

El resultado tendrá forma `{ mode: "parallel", results: [...] }` — un elemento por URL.

Si los flujos necesitan scripts distintos → hacer llamadas secuenciales (paso 6b).

#### 6d. Fallback a MCP Playwright (si browse.js no disponible)

Si `browser/browse.js` no existe, usar el subagente con MCP:

```
Agent({
  prompt: "Eres un tester QA. Usa el MCP de Playwright para navegar la app en http://localhost:5173 y verificar los siguientes flujos.

  Modo: <local | PRE>
  <Si PRE>: Las credenciales de login son: email=<email>, password=<password></Si PRE>

  Para cada flujo:
  1. Navega a la URL indicada.
  2. Realiza las acciones descritas.
  3. Toma un screenshot con browser_screenshot.
  4. Indica si el flujo pasó ✅ o falló ❌ y por qué.

  Flujos: <lista>

  Devuelve JSON: { flows: [{ id, name, result: 'PASS|FAIL', notes, screenshot }], verdict: 'PASS|FAIL', summary }"
})
```

### 7. Documentar en KB (obligatorio, no opcional)

Después de ejecutar todos los flujos, actualizar la KB para acelerar ejecuciones futuras:

```javascript
// Para cada script que funcionó y no existía previamente en KB:
const { initSite, addTool, saveScript } = require('./browser/lib/kb-writer');

// Si el sitio no existe todavía:
initSite('localhost:5173', 'Barber Dates Web — app de reservas de barbería (local dev)');

// Registrar cada script utilizado o descubierto:
addTool('localhost:5173', '<apartado>', {
  name: '<nombre-flujo>',
  description: '<qué verifica este flujo>',
  selector: '<selector CSS principal usado>',
  script: '<nombre>.js',
});
saveScript('localhost:5173', '<apartado>', '<nombre>', `<código JS exacto que funcionó>`);
```

Si un selector falló (resultado FAIL por selector no encontrado):
```javascript
const { markStale } = require('./browser/lib/kb-writer');
markStale('localhost:5173', '<apartado>');
```

### 8. Escribir TEST.md

Con todos los resultados, generar `.claude/tasks/<TASK-ID>/TEST.md`:

```markdown
# TEST — TASK-<ID> · YYYY-MM-DD HH:mm

## Entorno

- **URL**: http://localhost:5173
- **Modo**: local (mock) | PRE (InsForge real)
- **Motor**: browse.js (paralelo N flujos) | browse.js (secuencial) | MCP Playwright (fallback)
- **Servidor**: levantado por /test | ya estaba corriendo
- **KB**: scripts reutilizados de KB | exploración nueva → KB actualizada

## Flujos

### F-1 — <nombre> ✅/❌

<descripción del resultado>
Screenshot: `screenshots/01-<slug>.png`

### F-2 — <nombre> ✅/❌

<descripción del resultado>
Screenshot: `screenshots/02-<slug>.png`

...

## Veredicto: PASS | FAIL

- Flujos pasados: X/Y
- Flujos fallidos: [F-2 — nombre, ...]
```

### 9. Limpiar servidor (si aplica)

Si `DEV_SERVER_STARTED=true`:

```bash
kill $DEV_SERVER_PID 2>/dev/null || true
```

### 10. Reportar al usuario

**Si veredicto = PASS**:
```
✅ /test PASS — X/X flujos superados
   Motor: browse.js (paralelo | secuencial) | MCP Playwright
   KB: actualizada con N scripts | sin cambios
   TEST.md escrito en .claude/tasks/<TASK-ID>/TEST.md

Siguiente: /done para proponer el PR.
```

**Si veredicto = FAIL**:
```
❌ /test FAIL — X/Y flujos superados
   Fallaron: F-N (nombre), ...
   Ver TEST.md para capturas y detalles.

Usa /change <descripción> para corregir antes de /done.
```

---

## Flujos por defecto

Se usan cuando el README de la tarea no define `## Flujos a testear`.

| ID | Nombre | Pasos | Paralelo |
|---|---|---|---|
| F-0 | KB pre-check | Consultar KB de localhost:5173 — siempre primero | No |
| F-1 | App carga | Navegar a `/` → sin error de pantalla blanca ni consola roja | Sí |
| F-2 | Ruta principal accesible | Navegar a la ruta principal de la feature → componente visible | Sí |
| F-3 | Login (solo PRE) | Ir a `/login` → rellenar email/password → submit → redirige al dashboard | No (requiere auth) |
| F-4 | Ver citas (solo PRE, tras F-3) | Navegar a `/appointments` → lista visible, sin error | No (depende de F-3) |
| F-5 | Logout (solo PRE, tras F-3) | Click en logout → redirige a `/login` | No (depende de F-3) |

F-1 y F-2 son candidatos a modo paralelo. F-3, F-4 y F-5 son secuenciales por dependencia de sesión.

Para features sin flujos de usuario obvios (chores, infra, ci), ejecutar solo F-0 + F-1.

---

## Nota sobre el modo headed vs headless

Por defecto `browse.js` corre en modo headless.
Si necesitas ver el browser durante el test (debugging):

```bash
# Lanzar con Brave en modo debug (CDP):
open -a "Brave Browser" --args --remote-debugging-port=9222
node browser/browse.js --url http://localhost:5173 --cdp-tab ...
```

Para el MCP Playwright (fallback) en modo sin ventana:
```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless"]
}
```
