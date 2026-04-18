# 05 — El Sistema de Tareas, Scripts y Hooks

---

## Carpetas de tarea (TASK-)

### Por qué existen

Cuando Claude trabaja en una tarea larga o que se interrumpe, sin un sistema de persistencia empezaría de cero cada sesión: haría preguntas que ya habías respondido, tomaría decisiones que ya habías discutido, y no sabría en qué punto se quedó.

Las carpetas de tarea son la memoria persistente de cada tarea individual. Documentan el progreso en tiempo real para que cualquier sesión futura (o cualquier máquina) pueda retomar exactamente donde se dejó.

### Localización y naming

```
.claude/tasks/TASK-YYYYMMDD-HHmm-<tipo>-<slug>/
```

Ejemplo: `.claude/tasks/TASK-20260501-1430-feature-loyalty-system/`

### ¿Se commitean?

**No.** `.claude/tasks/*` está en `.gitignore`. Son trabajo en progreso, no parte del producto. El historial de git queda limpio.

Lo que SÍ se commitea: el código producido, y los aprendizajes promovidos a `KNOWLEDGE.md` o `DECISIONS.md` vía `/learn` o `/sync-context`.

### Archivos de cada tarea

| Archivo               | Qué es                                                            | Cuándo se escribe            | Inmutable                      |
| --------------------- | ----------------------------------------------------------------- | ---------------------------- | ------------------------------ |
| `README.md`           | Contrato: qué, por qué, criterios de aceptación, fuera de alcance | Al arrancar                  | Sí (salvo marcar criterios ✅) |
| `ANALYSIS.md`         | Diagnóstico del código existente, capas afectadas, riesgos        | Durante `/analyze`           | No                             |
| `QUESTIONS.md`        | Preguntas abiertas + respuestas del usuario                       | Durante `/analyze` y `/plan` | No                             |
| `PLAN.md`             | Pasos numerados con criterios por paso                            | Durante `/plan`              | Versionado (v1, v2...)         |
| `PROGRESS.md`         | Tabla de pasos: pending / in-progress / done                      | Con cada `/implement`        | No                             |
| `STATE.md`            | Checkpoint actual + próximo paso (reescrito)                      | Continuamente                | No                             |
| `LOG.md`              | Historial append-only (nunca se borra)                            | Con cada evento              | Append-only                    |
| `DECISIONS.md`        | Decisiones de diseño locales a esta tarea                         | Cuando surge una decisión    | Append-only                    |
| `files.md`            | Archivos tocados (rellena el hook automático)                     | Automático                   | Append-only                    |
| `REVIEW.md`           | Resultado de `/review`: veredicto + hallazgos                     | Con `/review`                | No                             |
| `handoff.md`          | Contexto completo para retomar en otra sesión                     | Con `/handoff`               | No                             |
| `CHANGES/CHANGE-N.md` | Una por cada `/change` ejecutado                                  | Con `/change`                | No                             |

### Cómo retomar una tarea en cualquier sesión

```bash
# Opción A: Estás en la rama correcta
/resume
# Claude detecta la tarea y te da un resumen

# Opción B: No sabes en qué tarea estabas
/status
# Lista todas las tareas activas

# Opción C: Sabes el ID exacto
/resume TASK-20260501-1430-feature-loyalty-system
```

Claude al retomar:

1. Lee `README.md` — el contrato (qué tenía que hacer).
2. Lee `STATE.md` — dónde se quedó.
3. Lee las últimas ~10 entradas de `LOG.md` — qué pasó.
4. Te da un resumen y pregunta si continúa.

---

## Scripts de fetch parcial

### Por qué existen

Los archivos de contexto (Constitution, PLAN.md, etc.) pueden ser largos. Si Claude los leyera completos cada vez, consumiría muchos tokens innecesariamente.

Los scripts permiten extraer **solo el fragmento relevante** en cada momento:

- `art.sh 4` → ~15 líneas del Art. 4 en lugar de 250+ líneas del Constitution completo.
- `plan-step.sh 3` → ~20 líneas del paso 3 en lugar de 100+ líneas del PLAN.md.
- `diff-task.sh --stat` → 10 líneas de estadísticas en lugar de miles de líneas de diff.

### Referencia completa

#### `constitution-index.sh`

```bash
bash .claude/scripts/constitution-index.sh
```

Muestra el índice de 15 líneas del Constitution. Claude lo usa primero para saber qué artículo cargar.

#### `art.sh <N>`

```bash
bash .claude/scripts/art.sh 3    # Art. 3 — Arquitectura
bash .claude/scripts/art.sh 4    # Art. 4 — Reglas de negocio
bash .claude/scripts/art.sh 14   # Art. 14 — Quality gates
```

Extrae un artículo completo del Constitution.

#### `section.sh <archivo> <heading>`

```bash
bash .claude/scripts/section.sh .claude/CONSTITUTION.md "Art. 8"
bash .claude/scripts/section.sh CLAUDE.md "Comandos disponibles"
bash .claude/scripts/section.sh .claude/workflows/feature.md "Fase PLAN"
```

Extrae una sección por su heading de cualquier archivo markdown. Útil para leer solo la fase PLAN del workflow feature, por ejemplo.

#### `fetch.sh <archivo> [TASK-ID]`

```bash
bash .claude/scripts/fetch.sh PLAN.md              # tarea activa
bash .claude/scripts/fetch.sh STATE.md             # tarea activa
bash .claude/scripts/fetch.sh ANALYSIS.md TASK-20260501-1430-feature-auth  # tarea específica
```

Trae un archivo concreto de la carpeta de la tarea activa (o de una tarea específica).

#### `plan-step.sh <N>`

```bash
bash .claude/scripts/plan-step.sh 1
bash .claude/scripts/plan-step.sh 3
```

Extrae solo el paso N del PLAN.md de la tarea activa. Claude lo usa en `/implement 3` para no cargar todo el plan.

#### `grep-task.sh <pattern>`

```bash
bash .claude/scripts/grep-task.sh "InsForge"
bash .claude/scripts/grep-task.sh "loyalty"
```

Grep en todos los archivos `.md` de la tarea activa. Útil para encontrar una decisión o nota específica sin leer todo.

#### `diff-task.sh [--stat]`

```bash
bash .claude/scripts/diff-task.sh --stat    # solo estadísticas: 5 archivos, +120/-30
bash .claude/scripts/diff-task.sh           # diff completo (excluye .claude/tasks/ y .md)
```

Muestra el diff de la rama actual contra su base (develop o main según la convención de naming).

#### `files-touched.sh`

```bash
bash .claude/scripts/files-touched.sh
```

Lista única y ordenada de todos los archivos tocados en la tarea activa (deduplicado de `files.md`). Claude lo usa en `/review` y `/sync-context`.

#### `sync-context.sh`

```bash
bash .claude/scripts/sync-context.sh
```

Cruza los archivos tocados contra un mapa de "qué archivos afectan a qué artículos". Devuelve una lista de artículos que podrían haber quedado desactualizados.

#### `validate-consistency.sh`

```bash
bash .claude/scripts/validate-consistency.sh
```

Valida que no haya drift operativo entre comandos/workflows/docs y los quality gates canónicos del Constitution.
Si detecta comandos legacy (`npm run ...`) o faltan comandos obligatorios en archivos clave, falla con exit code `1`.

---

## Hooks automáticos

Los hooks son scripts que se ejecutan automáticamente en respuesta a eventos de Claude Code. Están configurados en `.claude/settings.json` y no requieren ninguna acción por tu parte.

### SessionStart → `session-start.sh`

**Cuándo**: al abrir Claude Code.

**Qué hace**: detecta si hay una tarea activa asociada a la rama git actual.

**Qué ves**: si hay tarea activa, Claude recibe este mensaje antes de que empieces a hablar:

```
[agentic-system] Rama actual: feature/loyalty-system
[agentic-system] Tarea activa detectada: TASK-20260501-1430-feature-loyalty-system
[agentic-system] Para retomarla ejecuta: /resume TASK-20260501-1430-feature-loyalty-system
[agentic-system] Estado: active
```

**Por qué ayuda**: no tienes que recordar en qué tarea estabas ni buscar el ID.

---

### PostToolUse (Edit/Write) → `log-file-change.sh`

**Cuándo**: tras cada `Edit` o `Write` de Claude.

**Qué hace**: añade una entrada a `files.md` de la tarea activa.

```
- 2026-05-01 14:35  M  src/domain/loyalty/loyalty.rules.ts
- 2026-05-01 14:36  C  src/domain/loyalty/loyalty.rules.test.ts
```

`C` = created, `M` = modified.

**Para qué sirve**: alimenta `files-touched.sh` (para el review) y `sync-context.sh` (para saber qué artículos revisar al cerrar).

---

### PostToolUse (Edit/Write) → `context-watch.sh`

**Cuándo**: tras cada `Edit` o `Write` de Claude, en paralelo con el anterior.

**Qué hace**: si el archivo editado es "sensible" (reglas de dominio, infrastructure, routes, env vars, estilos), emite un aviso en stderr que Claude ve.

**Qué ve Claude**:

```
[context-watch] Editaste reglas de dominio → ¿cambió alguna regla de negocio? (Art. 4)
[context-watch] Si hay cambio → anota [context-flag] en LOG.md. Se revisará en /done.
```

**Por qué no bloquea**: no quieres que cada edit frene el trabajo. Es un recordatorio para que Claude tome nota sin interrumpir el flujo.

---

### PostToolUse (Edit/Write _.ts/_.tsx) → type-check automático

**Cuándo**: tras cada edición de un archivo TypeScript.

**Qué hace**: ejecuta `pnpm run type-check` y muestra las últimas 20 líneas.

**Por qué**: los errores de TypeScript se detectan inmediatamente, no al final de una sesión larga.

---

### PreToolUse (git commit) → `pre-commit-check.sh`

**Cuándo**: antes de cada `git commit`.

**Qué hace**: si hay tarea activa, sugiere incluir el TASK-ID en el cuerpo del commit.

```
[agentic-system] Commit en rama con tarea activa TASK-...
[agentic-system] Considera mencionar TASK-... en el cuerpo del commit.
```

**No bloquea**: es solo una sugerencia de trazabilidad.

---

## Continuidad entre sesiones

### Pausa voluntaria

```
/pause
```

Claude actualiza `STATE.md` con el checkpoint y marca `paused`. Próxima sesión: `/resume`.

### Cierre inesperado

El hook `Stop` persiste el estado automáticamente. La próxima sesión `SessionStart` detecta la tarea y avisa.

### Cambio de máquina

```
# Antes de irte:
/handoff
# Genera handoff.md con todo el contexto

# En la otra máquina:
git pull
git checkout feature/<slug>
# En Claude Code:
/resume TASK-YYYYMMDD-HHmm-feature-<slug>
```

### Log muy largo (semanas de trabajo)

```
/compact-task
```

Genera un resumen ejecutivo de 30 líneas al principio del `LOG.md`. Las siguientes sesiones cargan el resumen, no el log completo.
