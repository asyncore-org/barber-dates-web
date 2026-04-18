# 01 — El Sistema Agéntico

---

## Qué es y por qué existe

Claude Code es un agente muy capaz, pero sin estructura tiene problemas serios en proyectos reales:

- **Sin memoria entre sesiones.** Cada conversación nueva empieza de cero. Sin contexto del proyecto, Claude toma decisiones genéricas que violan las convenciones específicas.
- **Contexto caro.** Cargar todo el código en cada sesión consume muchos tokens y ralentiza el trabajo.
- **Implementación impulsiva.** Sin un plan previo, Claude tiende a lanzarse a escribir código de inmediato, generando algo que hay que corregir varias veces.
- **Sin trazabilidad.** Es difícil saber en qué punto quedó una tarea si se interrumpe la sesión.
- **Contexto desactualizado.** Si el código evoluciona pero los archivos de referencia no se actualizan, Claude trabaja con información obsoleta.

Este sistema resuelve todos esos problemas con cuatro piezas:

| Pieza                                                            | Qué aporta                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Archivos de contexto** (Constitution, KNOWLEDGE, DECISIONS)    | Claude conoce el proyecto desde el primer mensaje, sin explorar el código desde cero |
| **Flujo por fases** (analyze → plan → implement → review → done) | Nada se implementa sin un plan aprobado. Cada fase produce artefactos persistentes   |
| **Carpetas de tarea** (TASK-\*)                                  | El progreso queda documentado en tiempo real — retomar en otra sesión es trivial     |
| **Scripts de fetch parcial**                                     | Claude carga solo el fragmento que necesita, no archivos completos — ahorra tokens   |

---

## Principio fundamental

> **Claude no modifica archivos de `src/` fuera del comando `/implement`.**

Durante análisis, planificación y correcciones, Claude solo escribe en la carpeta de la tarea (`.claude/tasks/TASK-.../`). Esto garantiza que nunca se implementa "a lo loco".

---

## Estructura completa de archivos

```
barber-dates-web/
├── CLAUDE.md                    ← Claude lo lee al iniciar (orquestador ligero)
├── DEV-GUIDE.md                 ← Apunta a esta carpeta docs/
├── docs/                        ← Documentación del desarrollador (tú, no Claude)
│
└── .claude/
    │
    │  ─── Archivos de contexto ───────────────────────────────────
    ├── CONSTITUTION.md          ← Reglas inmutables (v1.0.0): stack, arquitectura,
    │                               reglas de negocio, modelo de datos, rutas,
    │                               convenciones, commits, ramas, colores, rendimiento,
    │                               SEO, env vars, quality gates
    ├── CONSTITUTION-INDEX.md    ← Índice de 15 líneas: qué cubre cada artículo
    ├── KNOWLEDGE.md             ← Aprendizajes vivos: gotchas, workarounds, tips
    ├── DECISIONS.md             ← ADRs: decisiones arquitectónicas globales
    │
    │  ─── Configuración ──────────────────────────────────────────
    ├── settings.json            ← Permisos de Claude Code y 4 hooks automáticos
    │
    │  ─── Workflows (guías por fase) ────────────────────────────
    ├── workflows/
    │   ├── feature.md           ← Guía de fases para features
    │   ├── fix.md               ← Guía para bugfixes
    │   ├── refactor.md          ← Guía para refactors
    │   ├── chore.md             ← Guía para mantenimiento
    │   ├── hotfix.md            ← Guía para hotfixes urgentes
    │   ├── spike.md             ← Guía para exploraciones
    │   └── review.md            ← Guía de auditoría
    │
    │  ─── Comandos slash (31 archivos) ──────────────────────────
    ├── commands/
    │   ├── [arranque]   feature.md  fix.md  refactor.md  chore.md  hotfix.md  spike.md
    │   ├── [ciclo]      analyze.md  plan.md  revise.md  implement.md  next.md
    │   │                change.md  review.md  done.md
    │   ├── [sesión]     status.md  resume.md  pause.md  block.md
    │   │                handoff.md  compact-task.md
    │   ├── [contexto]   sync-context.md  learn.md  ask.md  worktree.md
    │   ├── [scaffold]   new-component.md  new-page.md  new-hook.md
    │   │                new-domain.md  new-infra.md
    │   └── [diagnóst.]  check.md  phase.md
    │
    │  ─── Tareas en progreso (NO commiteado) ────────────────────
    ├── tasks/
    │   ├── .gitkeep
    │   ├── _TEMPLATE/           ← Plantilla base con todos los archivos vacíos
    │   └── TASK-YYYYMMDD-HHmm-<tipo>-<slug>/
    │       ├── README.md        ← Contrato: qué, por qué, criterios
    │       ├── ANALYSIS.md      ← Diagnóstico del código
    │       ├── QUESTIONS.md     ← Preguntas al usuario + respuestas
    │       ├── PLAN.md          ← Pasos numerados con criterios
    │       ├── PROGRESS.md      ← Estado de cada paso (pending/done/blocked)
    │       ├── STATE.md         ← Checkpoint actual + próximo paso
    │       ├── LOG.md           ← Historial append-only
    │       ├── DECISIONS.md     ← Decisiones locales de esta tarea
    │       ├── files.md         ← Archivos tocados (rellena el hook)
    │       ├── REVIEW.md        ← Resultado de /review
    │       ├── handoff.md       ← Doc para retomar en otra sesión
    │       └── CHANGES/
    │           └── CHANGE-N.md  ← Una por cada /change ejecutado
    │
    │  ─── Scripts (16 archivos) ─────────────────────────────────
    └── scripts/
        ├── [tareas]     new-task.sh  active-task.sh
        ├── [fetch]      constitution-index.sh  art.sh  section.sh
        │                fetch.sh  plan-step.sh  grep-task.sh
        │                diff-task.sh  files-touched.sh
      ├── [contexto]   sync-context.sh  validate-consistency.sh
        └── [hooks]      log-file-change.sh  context-watch.sh
                         session-start.sh  pre-commit-check.sh
```

---

## Cómo interactúan las piezas

```
TÚ escribes: /feature appointment-system

              ┌─────────────────────────────────────────┐
              │ Claude lee CLAUDE.md                    │
              │  → sabe que hay un sistema agéntico     │
              │  → lee commands/feature.md              │
              └──────────────┬──────────────────────────┘
                             │
              ┌──────────────▼──────────────────────────┐
              │ Crea rama + carpeta de tarea             │
              │  → bash scripts/new-task.sh feature ... │
              └──────────────┬──────────────────────────┘
                             │
              ┌──────────────▼──────────────────────────┐
              │ Lee el contexto (mínimo necesario)       │
              │  → bash scripts/constitution-index.sh   │
              │  → bash scripts/art.sh 3  (Arquitectura)│
              │  → bash scripts/art.sh 4  (Negocio)     │
              │  → Subagente Explore investiga el código │
              └──────────────┬──────────────────────────┘
                             │
              ┌──────────────▼──────────────────────────┐
              │ Escribe ANALYSIS.md y QUESTIONS.md       │
              │ PARA — espera tus respuestas             │
              └─────────────────────────────────────────┘

Hooks que actúan en paralelo:
  - Cada Edit/Write → log-file-change.sh  → actualiza files.md
  - Cada Edit/Write → context-watch.sh    → avisa si toca archivo sensible
  - Cada Edit *.ts  → pnpm run type-check  → TypeScript en tiempo real
  - git commit      → pre-commit-check.sh → sugiere TASK-id en el mensaje
  - Inicio sesión   → session-start.sh    → avisa si hay tarea activa
```
