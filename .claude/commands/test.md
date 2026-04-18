# Comando: /test

Lanza un subagente que abre Chromium, navega la app y verifica que los flujos principales funcionan visualmente.
Genera `TEST.md` con veredicto PASS/FAIL por flujo.

**Posición en el ciclo de vida**: después de `/review`, antes de `/done`.

```
/implement → /change (ajustes) → /review → /test → /done
```

## Uso

```
/test           # testea en local (mock), flujos por defecto o los del README
/test --pre     # testea contra el entorno PRE (InsForge real, pide credenciales)
```

## Precondiciones

- El plan está en estado `approved` o `done` (todos los pasos implementados).
- `/review` ya se ha ejecutado y no hay bloqueos abiertos.
- El MCP de Playwright está configurado en `~/.claude/settings.json`:
  ```json
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  }
  ```
  Si no está → reportar error y detener. Indicar al usuario que debe añadirlo.

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

Buscar sección `## Flujos a testear` en el `README.md` de la tarea activa:

```bash
bash .claude/scripts/section.sh .claude/tasks/<TASK-ID>/README.md "Flujos a testear"
```

Si la sección existe → usar esos flujos.
Si no existe → usar los **flujos por defecto** (ver más abajo).

### 5. Lanzar subagente con Playwright

Crear carpeta de capturas:

```bash
mkdir -p .claude/tasks/<TASK-ID>/screenshots
```

Lanzar subagente con el siguiente prompt, adaptado al modo (local/PRE) y a los flujos determinados:

```
Agent({
  prompt: "Eres un tester QA. Usa el MCP de Playwright para navegar la app en http://localhost:5173 y verificar los siguientes flujos.

  Modo: <local | PRE>
  <Si PRE>: Las credenciales de login son: email=<email>, password=<password></Si PRE>
  <Si local>: La app usa mocks — no hay login real. Navega directamente a las rutas.

  Para cada flujo:
  1. Navega a la URL indicada.
  2. Realiza las acciones descritas.
  3. Toma un screenshot con browser_screenshot y guárdalo en .claude/tasks/<TASK-ID>/screenshots/<N>-<slug>.png
  4. Indica si el flujo pasó ✅ o falló ❌ y por qué.

  Flujos a testear:
  <lista de flujos con pasos concretos>

  Al terminar, devuelve un JSON con este formato:
  {
    'environment': 'local | PRE',
    'url': 'http://localhost:5173',
    'flows': [
      { 'id': 'F-1', 'name': '...', 'result': 'PASS | FAIL', 'notes': '...', 'screenshot': 'screenshots/...' },
      ...
    ],
    'verdict': 'PASS | FAIL',
    'summary': '...'
  }"
})
```

### 6. Escribir TEST.md

Con el resultado del subagente, generar `.claude/tasks/<TASK-ID>/TEST.md`:

```markdown
# TEST — TASK-<ID> · YYYY-MM-DD HH:mm

## Entorno

- **URL**: http://localhost:5173
- **Modo**: local (mock) | PRE (InsForge real)
- **Browser**: Chromium (headed)
- **Servidor**: levantado por /test | ya estaba corriendo

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

### 7. Limpiar servidor (si aplica)

Si `DEV_SERVER_STARTED=true`:

```bash
kill $DEV_SERVER_PID 2>/dev/null || true
```

### 8. Reportar al usuario

**Si veredicto = PASS**:
```
✅ /test PASS — X/X flujos superados
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

| ID | Nombre | Pasos |
|---|---|---|
| F-1 | App carga | Navegar a `/` → sin error de pantalla blanca ni consola roja |
| F-2 | Ruta principal accesible | Navegar a la ruta principal de la feature → componente visible |
| F-3 | Login (solo PRE) | Ir a `/login` → rellenar email/password → submit → redirige al dashboard |
| F-4 | Ver citas (solo PRE, tras F-3) | Navegar a `/appointments` → lista visible, sin error |
| F-5 | Logout (solo PRE, tras F-3) | Click en logout → redirige a `/login` |

Para features que no tienen flujos de usuario obvios (chores, infra, ci), el subagente solo ejecuta F-1.

---

## Nota sobre el modo headed vs headless

Por defecto el MCP de Playwright abre una ventana de Chromium visible.
Si necesitas ejecutarlo sin ventana (ej. en un servidor sin display), edita `~/.claude/settings.json`:

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest", "--headless"]
}
```
