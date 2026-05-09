# Comando: /revise-pr

Analiza el feedback de una PR abierta: comentarios de Copilot y fallos de GitHub Actions.
Hace un **triage contextual** por item (¿tiene sentido en este proyecto y tarea?) y presenta al usuario qué merece acción y qué ignorar, con justificación explícita.
Se para al terminar el triage — **no implementa nada, no crea CHANGE-N.md**.

## Cuándo usarlo

- Tras ejecutar `/done` (la PR está abierta) y Copilot ha dejado reviews y/o el CI ha fallado.
- Cada vez que hay nueva ronda de feedback en la PR (puede ejecutarse varias veces; el documento se numera `PR-TRIAGE-N.md`).

## Flujo completo de referencia

```
/done           → abre PR
[Copilot revisa + CI corre]
/revise-pr      → triage de feedback (este comando)
[usuario aprueba items concretos]
/change <item>  → ciclo de corrección normal → /implement → /review → /test
```

## Precondiciones

- Existe una PR abierta para la rama actual (`gh pr list` devuelve resultados).
- `gh` CLI disponible y autenticado.
- Hay una tarea activa con carpeta en `.claude/tasks/`.
- Si no hay PR abierta → comunicarlo al usuario y PARAR.
- Si Copilot aún no ha revisado y el CI no ha fallado → comunicarlo y PARAR (nada que triagear).

## Lo que debes hacer

### 1. Detectar la PR de la rama actual

```bash
BRANCH=$(git branch --show-current)
gh pr list --head "$BRANCH" --state open --json number,title,url
```

Si no hay PR abierta → PARAR con mensaje claro.
Si hay PR → anotar el número (`<PR>`).

### 2. Recoger comentarios de Copilot

```bash
# Reviews generales (incluye el body de revisión de Copilot)
gh pr view <PR> --json reviews --jq '.reviews[] | {author: .author.login, state: .state, body: .body, submittedAt: .submittedAt}'

# Comentarios inline (hilo por hilo, con contexto de archivo y línea)
gh api repos/{owner}/{repo}/pulls/<PR>/comments --jq '.[] | {path: .path, line: .original_line, body: .body, user: .user.login}'
```

Filtrar solo los comentarios de usuario `copilot` (o `github-advanced-security`). Si no hay ninguno → anotar "Sin reviews de Copilot" en el triage y continuar con CI.

### 3. Recoger fallos de CI

```bash
# Estado de todos los checks de la PR
gh pr checks <PR> --json name,status,conclusion,detailsUrl

# IDs de runs fallidas en esta rama
gh run list --branch "$BRANCH" --json databaseId,name,conclusion,status --jq '.[] | select(.conclusion == "failure")'

# Log del fallo (por cada run fallida)
gh run view <run-id> --log-failed 2>&1 | head -100
```

Si no hay fallos → anotar "CI verde — sin fallos" en el triage y continuar con reviews.

### 4. Triage contextual por item

**Para cada comentario de Copilot y cada fallo de CI**, razona explícitamente:

#### 4a. Cargar contexto de la tarea activa

```bash
bash .claude/scripts/fetch.sh README.md    # objetivos y criterios de aceptación
bash .claude/scripts/fetch.sh PLAN.md      # pasos y alcance
```

Cargar solo los artículos del Constitution que sean relevantes al item concreto:
- Si el item toca arquitectura de capas → `bash .claude/scripts/art.sh 3`
- Si el item toca reglas de negocio → `bash .claude/scripts/art.sh 4`
- Si el item toca DB o infra → `bash .claude/scripts/art.sh 5`
- Si el item toca estilos → `bash .claude/scripts/art.sh 7`
- etc.

#### 4b. Criterio de clasificación (ACTUAR / IGNORAR)

Clasificar como **ACTUAR** si el item:
- Señala una violación real de las reglas del Constitution (capas, tipos, seguridad).
- Identifica un bug con impacto en el funcionamiento de la app.
- Apunta a un test faltante o incorrecto según las convenciones del proyecto.
- Es un fallo de CI que bloquea el merge y tiene causa identificable en el código.

Clasificar como **IGNORAR** si el item:
- Sugiere un patrón que contradice el stack o la arquitectura del proyecto (e.g., Copilot sugiere una abstracción que viola Art. 3).
- Es estilo puro que ESLint ya cubre (y los gates pasan).
- Es out-of-scope del objetivo de la tarea (README.md → Fuera de alcance).
- Es un fallo de CI por razón externa al código (flakyness, timeout de red, secreto no disponible en fork).
- Es genérico o aplica a cualquier proyecto React sin considerar las convenciones de este.

**La duda va a ACTUAR**, no a IGNORAR — mejor revisar algo innecesario que perder un bug real.

#### 4c. Verificación visual para ítems ACTUAR de CI (si aplica)

Para fallos de CI clasificados como **ACTUAR** donde el síntoma es visual (componente roto, ruta que no renderiza, error en UI), intentar confirmar el fallo visualmente antes de proponer el `/change`:

```bash
# Solo si hay servidor corriendo (local o staging):
curl -s --max-time 2 http://localhost:5173 -o /dev/null -w "%{http_code}"
```

Si el servidor responde → tomar snapshot de la ruta afectada:

```bash
node browser/browse.js \
  --url http://localhost:5173<ruta-afectada> \
  --action "captura el estado de la página, documenta errores visibles o de consola" \
  --session localhost:5173 \
  --section ci-verify \
  --snapshot \
  --output /tmp/ci-verify-<item>.json
```

Tras la ejecución, leer el snapshot para extraer el hallazgo:

```bash
bash .claude/scripts/kb-query.sh localhost:5173 ci-verify --dom | head -60
```

Incluir hallazgo visual en el TRIAGE como `**Evidencia visual**: <descripción de lo observado>`.
Si el servidor no está disponible → omitir y anotarlo en el triage (`no disponible — servidor offline`).

#### 4d. Si el item es ambiguo

Clasificar como **REVISAR** con la pregunta concreta que el usuario debe resolver antes de decidir si implementar o no.

### 5. Determinar el número del triage

```bash
ls .claude/tasks/<TASK-ID>/PR-TRIAGE-*.md 2>/dev/null | wc -l
# N = resultado + 1
```

### 6. Escribir PR-TRIAGE-N.md

Guardar en `.claude/tasks/<TASK-ID>/PR-TRIAGE-<N>.md`:

```markdown
# PR-TRIAGE-<N> — PR #<número> · YYYY-MM-DD HH:mm

## Contexto

- PR: #<número> — <título>
- URL: <url>
- Rama: <rama>
- Ejecutado: YYYY-MM-DD HH:mm

---

## Comentarios de Copilot

### [ACTUAR] <archivo>:<línea> — <título breve del comentario>

**Comentario original**: <texto del comentario>
**Por qué actuar**: <justificación concreta en términos del proyecto>
**Acción sugerida**: `/change <descripción concisa>`

---

### [IGNORAR] <archivo>:<línea> — <título breve>

**Comentario original**: <texto>
**Por qué ignorar**: <justificación — qué regla del proyecto hace que no aplique>

---

### [REVISAR] <archivo>:<línea> — <título breve>

**Comentario original**: <texto>
**Duda**: <pregunta concreta al usuario antes de decidir>

---

## Fallos de CI

### [ACTUAR] <nombre del job> — <workflow>

**Error** (líneas relevantes del log):
```
<fragmento de log — máximo 20 líneas>
```
**Causa probable**: <diagnóstico>
**Evidencia visual**: <descripción de lo observado en browser | no disponible — servidor offline>
**Acción sugerida**: `/change <descripción concisa>`

---

### [IGNORAR] <nombre del job>

**Error**: <descripción breve>
**Por qué ignorar**: <razón — flakyness, externo al código, etc.>

---

## Resumen

| Categoría | ACTUAR | IGNORAR | REVISAR |
|-----------|--------|---------|---------|
| Copilot comments | N | M | K |
| CI failures | P | Q | — |
| **Total** | **N+P** | **M+Q** | **K** |
```

Si no hay reviews de Copilot → incluir sección con "Sin reviews de Copilot disponibles."
Si no hay fallos de CI → incluir sección con "CI verde — sin fallos."

### 7. Presentar al usuario y PARAR

Mostrar un resumen compacto del triage:

```
/revise-pr — PR #<N> · <título>

Copilot reviews: <total comentarios analizados>
CI failures: <total jobs fallidos analizados>

ACTUAR (<N> items):
  · [Copilot] <archivo>:<línea> — <título> → /change <descripción>
  · [CI] <job> — <título> → /change <descripción>

IGNORAR (<M> items):
  · [Copilot] <archivo>:<línea> — <motivo resumido>
  · [CI] <job> — <motivo resumido>

REVISAR (<K> items):
  · [Copilot] <archivo>:<línea> — <pregunta al usuario>

Triage guardado en: PR-TRIAGE-<N>.md

Para cada item que quieras implementar:
  /change <descripción del item>
```

**PARAR aquí.** No crear CHANGE-N.md automáticamente. No modificar ningún archivo de `src/`.

## Si algo falla

| Situación | Acción |
|-----------|--------|
| Sin PR abierta en la rama actual | Comunicar y PARAR — el usuario debe abrir la PR primero |
| Copilot aún no ha revisado | Anotar en triage; continuar con CI si hay fallos |
| CI verde y sin reviews | Comunicar "Nada que triagear por ahora" y PARAR |
| Log de CI demasiado largo | Truncar a las primeras 100 líneas del bloque de error relevante |
| PR de rama `hotfix/*` | Funciona igual — la PR va contra `main` pero el flujo es idéntico |
