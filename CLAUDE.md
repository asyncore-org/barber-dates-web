# Gio Barber Shop — barber-dates-web

> **CLAUDE.md es un orquestador.** Lee esto primero, luego salta a lo que necesites con los scripts de contexto parcial.

---

## Antes de cualquier acción

1. **Índice del Constitution** (15 líneas, siempre barato):
   ```bash
   bash .claude/scripts/constitution-index.sh
   ```
   Luego carga SOLO los artículos que apliquen con `bash .claude/scripts/art.sh <N>`.
   **Nunca leas CONSTITUTION.md completo** si puedes evitarlo.
2. **Revisa** `.claude/KNOWLEDGE.md` — gotchas y workarounds descubiertos.
3. **Ejecuta `/status`** si hay tareas activas que retomar.

---

## Regla de documentación: actualizar el contexto en el mismo commit

> **Todo cambio relevante debe reflejarse en el contexto de Claude en el mismo paso en que ocurre.**

Esto incluye:

- **Nueva regla de negocio o cambio en una existente** → actualizar Art. 4 del Constitution.
- **Nueva tabla, campo o relación** → actualizar Art. 5.
- **Nueva ruta o cambio en auth** → actualizar Art. 6.
- **Nueva variable de entorno** → actualizar Art. 13.
- **Cambio en la estrategia de ramas o despliegue** → actualizar Art. 9.
- **Gotcha, workaround o comportamiento sorprendente** → añadir entrada a `KNOWLEDGE.md`.
- **Decisión arquitectónica** → añadir ADR a `DECISIONS.md`.

**El objetivo**: que cualquier sesión futura de Claude pueda retomar el trabajo sin que el humano tenga que re-explicar decisiones ya tomadas. Si algo se implementó pero no se documentó, el conocimiento se pierde en el próximo `/compact`.

---

## Regla fundamental: no hay código sin `/implement`

> **Claude no modifica archivos de `src/` fuera del comando `/implement`.**

Durante `/feature`, `/fix`, `/analyze`, `/plan`, `/revise`, `/change`:
solo se escriben archivos dentro de `.claude/tasks/<TASK-ID>/`.

La única excepción son los comandos de scaffolding invocados **desde dentro** de `/implement`.

Esta regla garantiza que nunca se implementa "a lo loco" sin un plan aprobado.

---

## Regla de contexto: cargar solo lo necesario

> **Nunca leer un archivo completo si puedes traer solo la parte que necesitas.**

```bash
bash .claude/scripts/art.sh 3               # solo Art. 3 del Constitution
bash .claude/scripts/section.sh <file> <heading>  # sección específica de cualquier MD
bash .claude/scripts/fetch.sh PLAN.md       # archivo de la tarea activa
bash .claude/scripts/plan-step.sh 2         # solo el paso 2 del plan
bash .claude/scripts/diff-task.sh --stat    # resumen del diff (no el diff completo)
bash .claude/scripts/files-touched.sh       # archivos tocados en la tarea
```

---

## Mapa del sistema agéntico

```
.claude/
├── CONSTITUTION.md       # Reglas inmutables — leer con art.sh / section.sh
├── KNOWLEDGE.md          # Aprendizajes vivos: gotchas, workarounds
├── DECISIONS.md          # ADRs del proyecto
├── settings.json         # Permisos + hooks (SessionStart, PostToolUse, PreToolUse)
├── workflows/            # Guías por fase (una sección por fase, cargable con section.sh)
│   ├── feature.md  fix.md  refactor.md  chore.md  hotfix.md  spike.md  review.md
├── commands/             # 33 comandos slash (incluye web.md)
├── tasks/                # Trabajo en progreso (NO commiteado)
│   └── TASK-<fecha>-<tipo>-<slug>/
│       ├── README.md      # contrato inicial
│       ├── ANALYSIS.md    # diagnóstico (fase análisis)
│       ├── QUESTIONS.md   # preguntas al usuario
│       ├── PLAN.md        # pasos numerados (fase plan)
│       ├── PROGRESS.md    # seguimiento de pasos
│       ├── STATE.md       # estado vivo + próximo paso
│       ├── LOG.md         # histórico append-only
│       ├── DECISIONS.md   # decisiones locales
│       ├── files.md       # archivos tocados (hook auto-rellena)
│       ├── REVIEW.md      # resultado del /review
│       ├── handoff.md     # doc para retomar en otra sesión
│       └── CHANGES/       # CHANGE-001.md, CHANGE-002.md...
├── scripts/              # Utilidades shell
│   ├── new-task.sh        # crea carpeta de tarea
│   ├── active-task.sh     # detecta tarea por rama git
│   ├── art.sh             # extrae artículo del Constitution
│   ├── section.sh         # extrae sección de cualquier MD
│   ├── fetch.sh           # trae archivo de tarea activa
│   ├── plan-step.sh       # extrae paso N del PLAN.md
│   ├── grep-task.sh       # grep en archivos de la tarea
│   ├── diff-task.sh       # diff de la rama vs base
│   ├── files-touched.sh   # archivos tocados (deduplicado)
│   ├── bootstrap-scan.sh  # snapshot del repo para /bootstrap
│   ├── validate-consistency.sh # chequeo anti-drift
│   ├── kb-query.sh        # consulta la browser-KB por sitio/apartado
│   ├── log-file-change.sh # hook PostToolUse
│   ├── session-start.sh   # hook SessionStart
│   └── pre-commit-check.sh # hook PreToolUse

browser/                  # Runtime de automatización web (copiado por carlex)
├── browse.js             # CLI principal: --url, --script, --mode parallel...
├── package.json          # playwright-extra, playwright-core, stealth, js-yaml
├── lib/
│   ├── anti-bot.js       # Stealth launch + webdriver patch
│   ├── resource-blocker.js # Abort trackers/imágenes innecesarias
│   ├── wait-strategy.js  # waitForSelector/NetworkIdle/Text con retry
│   ├── session-manager.js # Cookies + localStorage por dominio
│   ├── auth-flow.js      # Detecta login → abre visible → continua headless
│   ├── security-guard.js # Clasifica acciones, bloquea sensibles
│   ├── parallel-runner.js # Múltiples tabs simultáneas
│   ├── dom-snapshot.js   # Captura DOM limpio para KB
│   └── kb-writer.js      # Escribe KB: initSite/addTool/saveScript/markStale
└── scripts/
    ├── kb-init.js         # Inicializa ~/.claude/browser-kb/
    ├── session-log.js     # CRUD de logs de sesión
    └── whatsapp-auth.js   # Plantilla de auth interactiva (copiar/adaptar por sitio)

~/.claude/browser-kb/     # Knowledge base global (generada en runtime, NO en repo)
├── _index.yml            # Índice maestro de sitios conocidos
├── _sessions/            # Logs de las últimas 50 sesiones
├── _processes/           # Flujos multi-sitio documentados
└── <dominio>/            # Ej: web.whatsapp.com/
    ├── constitution.md   # Descripción + auth + navegación del sitio
    ├── _index.yml        # Secciones + scripts registrados
    ├── _sessions/        # cookies.json de la sesión persistente
    └── <apartado>/       # Ej: chats/, inbox/, search/
        ├── tools.md      # Selectores + herramientas documentadas
        ├── dom-snap.html # DOM de referencia capturado
        └── scripts/      # Scripts JS que funcionaron
```

---

## Ciclo de vida de cualquier tarea

```
/<tipo> <slug>   → ANÁLISIS + QUESTIONS (para)
[usuario responde preguntas]
/plan            → PLAN.md (para, espera aprobación)
[usuario: "ok" o /revise]
/implement       → código paso a paso (un commit por paso)
/change <qué>    → análisis + CHANGE-N.md (para)
                   [si complejo: /plan actualiza PLAN.md antes de /implement]
                   /implement → /review → /test
/review          → subagente audita + quality gates
/test            → subagente abre browser y testea flujos de la app (E2E visual)
/done            → propone PR (confirmación antes de push)
[Copilot revisa + CI corre]
/revise-pr       → triage de comentarios Copilot + fallos CI (para)
[usuario aprueba items → /change por cada uno]
```

> **`/optimize`** sigue este mismo ciclo pero arranca con análisis especializado de rendimiento/calidad.
> Ver sección de comandos y `.claude/commands/optimize.md`.

---

## Comandos disponibles

### Ciclo de vida principal

| Comando                           | Fase           | Descripción                                          |
| --------------------------------- | -------------- | ---------------------------------------------------- |
| `/feature <slug>`                 | Arranque       | Feature desde `develop` (o rama actual si sub-tarea) |
| `/fix <slug>`                     | Arranque       | Bugfix                                               |
| `/refactor <slug>`                | Arranque       | Refactor sin cambio funcional                        |
| `/chore <slug>`                   | Arranque       | Mantenimiento (deps, config, scripts)                |
| `/hotfix <slug>`                  | Arranque       | Urgente a prod (base: `main`)                        |
| `/spike <slug>`                   | Arranque       | Exploración time-boxed                               |
| `/optimize [scope]`               | Arranque       | Flujo completo de optimización (análisis → plan → implement → review → test). Sin scope = todo; scopes: `bundle`, `queries`, `accessibility`, `seo`, `renders` |
| `/analyze`                        | Análisis       | Re-ejecuta análisis con nueva info                   |
| `/plan`                           | Plan           | Genera PLAN.md con pasos                             |
| `/revise <qué>`                   | Plan           | Ajusta el plan antes de implementar                  |
| `/implement [N\|next\|all\|N..M]` | Implementación | **Única puerta al código de producción**             |
| `/next`                           | Implementación | Atajo para `/implement next`                         |
| `/change <qué>`                   | Corrección     | Analiza → CHANGE-N.md → [/plan si complejo] → `/implement` → `/review` → `/test` |
| `/review`                         | Review         | Subagente + quality gates + criterios                |
| `/test [--pre]`                   | Test visual    | Subagente abre Chromium y recorre flujos de la app   |
| `/done`                           | Cierre         | Propone PR (confirmación antes de push)              |
| `/revise-pr`                      | Post-PR        | Triage de comentarios Copilot + fallos CI tras abrir PR |

### Gestión de sesión y tarea

| Comando             | Descripción                                |
| ------------------- | ------------------------------------------ |
| `/status`           | Estado actual: rama, tarea activa, commits |
| `/resume [TASK-ID]` | Retoma tarea (lee README+STATE+LOG)        |
| `/pause`            | Pausa voluntaria, persiste estado          |
| `/block <motivo>`   | Marca como bloqueada                       |
| `/handoff`          | Genera doc para retomar en otra máquina    |
| `/compact-task`     | Resume LOG.md cuando crece mucho           |

### Aprendizaje y contexto

| Comando            | Descripción                                                 |
| ------------------ | ----------------------------------------------------------- |
| `/bootstrap [nombre]` | Prepara el contexto inicial del proyecto tras `carlex init` |
| `/learn <insight>` | Añade a KNOWLEDGE.md                                        |
| `/ask <pregunta>`  | Responde sin crear tarea (usa scripts de contexto parcial)  |
| `/worktree <slug>` | Crea worktree paralelo aislado (solo si el usuario lo pide) |

### Scaffolding de código

| Comando                   | Descripción                               |
| ------------------------- | ----------------------------------------- |
| `/new-component <nombre>` | Componente React + named export           |
| `/new-page <nombre>`      | Página con `lazy()` + AuthGuard + SeoHead |
| `/new-hook <nombre>`      | Hook TanStack Query con queryKeys         |
| `/new-domain <entidad>`   | Tipos + reglas puras + test               |
| `/new-infra <entidad>`    | Adaptador InsForge con mapper             |

### Diagnóstico

| Comando  | Descripción                              |
| -------- | ---------------------------------------- |
| `/check` | type-check + lint + tests                |
| `/phase` | Estado de la fase actual vs plan maestro |

### Automatización web

| Comando          | Descripción                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `/web <petición>` | Navega la web con Playwright cuando los MCPs no pueden. Headless, con KB por sitio, guardrails de seguridad, paralelismo y auth interactiva si se requiere. |

---

## Scripts de contexto parcial (ahorro de tokens)

```bash
bash .claude/scripts/art.sh 3                        # Art. 3 del Constitution
bash .claude/scripts/section.sh <file> <heading>     # cualquier sección de MD
bash .claude/scripts/fetch.sh PLAN.md                # archivo de tarea activa
bash .claude/scripts/fetch.sh STATE.md TASK-20260417-feature-auth  # de tarea específica
bash .claude/scripts/plan-step.sh 2                  # paso 2 del plan activo
bash .claude/scripts/grep-task.sh "domain"           # grep en archivos de la tarea
bash .claude/scripts/diff-task.sh --stat             # resumen del diff vs base
bash .claude/scripts/files-touched.sh                # archivos tocados (deduplicado)
```

---

## Reglas del sistema agéntico

1. **No hay código sin `/implement`** (regla fundamental — ver arriba).
2. **Cargar contexto mínimo** — usar scripts de fetch parcial, no leer archivos completos.
3. **Carpetas de tareas no commiteadas** (`.gitignore`). Descubrimientos reutilizables → `/learn`.
4. **Commits pequeños** — un commit por paso del plan (Art. 8 del Constitution). Los cambios al sistema agéntico (`.claude/`, `docs/`, `CLAUDE.md`) se commitean en el mismo paso en que se modifican — nunca se dejan sin commitear.
5. **Ramas según Art. 9**: `develop` como base por defecto, rama actual si sub-tarea.
6. **Quality gates antes de `/done`**: type-check + lint + tests verdes.
7. **Paralelización solo cuando se pide**: worktrees o subagentes `Explore` para investigación.
8. **Correcciones con `/change`**: nunca ajustar código directamente sin pasar por análisis → plan → `/implement`.

---

## Fase actual

**Fase 0: Setup inicial** — Scaffold del proyecto con todas las herramientas configuradas.

Ver todas las fases en `../PLAN_GIO_BARBER_SHOP.md`.

---

## Quick reference — dónde está qué

| Qué busco              | Dónde                                              |
| ---------------------- | -------------------------------------------------- |
| Reglas del proyecto    | `.claude/CONSTITUTION.md` (usar `art.sh`)          |
| Aprendizajes           | `.claude/KNOWLEDGE.md`                             |
| Decisiones globales    | `.claude/DECISIONS.md`                             |
| Cómo hacer una feature | `.claude/workflows/feature.md` (usar `section.sh`) |
| Tarea activa           | `.claude/tasks/TASK-<fecha>-<slug>/`               |
| Plan del producto      | `../PLAN_GIO_BARBER_SHOP.md`                       |
