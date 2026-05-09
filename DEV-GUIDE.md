# Guía del Desarrollador — Gio Barber Shop

> **Este archivo es solo para el desarrollador humano. Claude no lo carga automáticamente.**
> Última actualización: 2026-04-17

---

## Índice

1. [Qué es este sistema y por qué existe](#1-qué-es-este-sistema-y-por-qué-existe)
2. [Estructura completa de archivos](#2-estructura-completa-de-archivos)
3. [Los archivos de contexto](#3-los-archivos-de-contexto)
4. [El flujo de desarrollo paso a paso](#4-el-flujo-de-desarrollo-paso-a-paso)
5. [Referencia completa de comandos](#5-referencia-completa-de-comandos)
6. [El sistema de tareas (carpetas TASK-)](#6-el-sistema-de-tareas-carpetas-task-)
7. [Los scripts de fetch parcial](#7-los-scripts-de-fetch-parcial)
8. [Los hooks automáticos](#8-los-hooks-automáticos)
9. [Estrategia de ramas Git](#9-estrategia-de-ramas-git)
10. [Cómo ahorrar tokens](#10-cómo-ahorrar-tokens)
11. [Flujo de correcciones (/change)](#11-flujo-de-correcciones-change)
12. [Continuidad entre sesiones](#12-continuidad-entre-sesiones)
13. [Ejemplos completos de flujos reales](#13-ejemplos-completos-de-flujos-reales)
14. [Errores comunes y cómo evitarlos](#14-errores-comunes-y-cómo-evitarlos)
15. [FAQ](#15-faq)
16. [Browser automation — el skill /web](#16-browser-automation--el-skill-web)

---

## 1. Qué es este sistema y por qué existe

### El problema que resuelve

Claude Code es un agente muy capaz pero tiene limitaciones importantes cuando se usa sin estructura:

- **Sin memoria entre sesiones**: cada nueva conversación empieza de cero. Sin contexto del proyecto, Claude toma decisiones genéricas que pueden violar las convenciones específicas del proyecto.
- **Contexto caro**: cargar todo el código del proyecto en cada sesión consume muchos tokens y ralentiza el trabajo.
- **Implementación impulsiva**: sin un plan previo, Claude tiende a lanzarse a implementar directamente, lo que genera código que hay que corregir varias veces.
- **Sin trazabilidad**: es difícil saber en qué punto quedó una tarea si se interrumpe la sesión.
- **Contexto desactualizado**: si el proyecto evoluciona pero los archivos de referencia no se actualizan, Claude trabaja con información obsoleta.

### La solución

Este sistema es una capa de orquestación que convierte a Claude en un agente disciplinado y predecible:

1. **Un contrato inmutable** (Constitution) que define las reglas del proyecto. Claude lo conoce y no las rompe.
2. **Flujo por fases** (analyze → plan → implement → review → done) que impide que Claude codee sin pensar.
3. **Carpetas de tarea** que documentan el progreso en tiempo real, permitiendo retomar cualquier tarea en cualquier sesión sin perder contexto.
4. **Scripts de fetch parcial** que permiten a Claude cargar solo la parte del contexto que necesita, en lugar de archivos completos.
5. **Hooks automáticos** que vigilan que el contexto no quede desactualizado cuando el código cambia.

### Principio fundamental

> **Claude no toca código de producción (`src/`) fuera del comando `/implement`.**

Todo lo que ocurre antes de `/implement` (análisis, preguntas, plan) produce solo documentos dentro de la carpeta de la tarea. Esto garantiza que nunca se implementa nada sin un plan aprobado.

---

## 2. Estructura completa de archivos

```
barber-dates-web/
├── CLAUDE.md                    ← Orquestador: Claude lo lee al iniciar
├── DEV-GUIDE.md                 ← Este archivo (solo para el dev humano)
├── README.md                    ← README estándar del repo
├── .gitignore                   ← Incluye reglas para .claude/tasks/*
│
└── .claude/
    ├── CONSTITUTION.md          ← Reglas inmutables del proyecto (v1.0.0)
    ├── CONSTITUTION-INDEX.md    ← Índice de 15 líneas para navegar la Constitution
    ├── KNOWLEDGE.md             ← Aprendizajes vivos: gotchas, workarounds
    ├── DECISIONS.md             ← ADRs globales del proyecto
    │
    ├── settings.json            ← Permisos y hooks de Claude Code
    │
    ├── workflows/               ← Guías internas por fase (7 archivos)
    │   ├── feature.md           ← Fases: ANÁLISIS · PLAN · IMPLEMENTACIÓN · REVIEW · CIERRE
    │   ├── fix.md
    │   ├── refactor.md
    │   ├── chore.md
    │   ├── hotfix.md
    │   ├── spike.md
    │   └── review.md
    │
    ├── commands/                ← Comandos slash (32 archivos)
    │   │
    │   │  ─── Arranque de tareas ───
    │   ├── feature.md           ← /feature
    │   ├── fix.md               ← /fix
    │   ├── refactor.md          ← /refactor
    │   ├── chore.md             ← /chore
    │   ├── hotfix.md            ← /hotfix
    │   ├── spike.md             ← /spike
    │   │
    │   │  ─── Ciclo de vida ───
    │   ├── analyze.md           ← /analyze
    │   ├── plan.md              ← /plan
    │   ├── revise.md            ← /revise
    │   ├── implement.md         ← /implement
    │   ├── next.md              ← /next
    │   ├── change.md            ← /change
    │   ├── review.md            ← /review
    │   ├── done.md              ← /done
    │   │
    │   │  ─── Sesión y tarea ───
    │   ├── status.md            ← /status
    │   ├── resume.md            ← /resume
    │   ├── pause.md             ← /pause
    │   ├── block.md             ← /block
    │   ├── handoff.md           ← /handoff
    │   ├── compact-task.md      ← /compact-task
    │   │
    │   │  ─── Contexto y aprendizaje ───
    │   ├── bootstrap.md         ← /bootstrap
    │   ├── sync-context.md      ← /sync-context
    │   ├── learn.md             ← /learn
    │   ├── ask.md               ← /ask
    │   ├── worktree.md          ← /worktree
    │   │
    │   │  ─── Scaffolding ───
    │   ├── new-component.md     ← /new-component
    │   ├── new-page.md          ← /new-page
    │   ├── new-hook.md          ← /new-hook
    │   ├── new-domain.md        ← /new-domain
    │   ├── new-infra.md         ← /new-infra
    │   │
    │   │  ─── Diagnóstico ───
    │   ├── check.md             ← /check
    │   └── phase.md             ← /phase
    │
    ├── tasks/                   ← Trabajo en progreso (NO commiteado)
    │   ├── .gitkeep
    │   ├── _TEMPLATE/           ← Plantilla base para nuevas tareas
    │   │   ├── README.md
    │   │   ├── ANALYSIS.md
    │   │   ├── QUESTIONS.md
    │   │   ├── PLAN.md
    │   │   ├── PROGRESS.md
    │   │   ├── STATE.md
    │   │   ├── LOG.md
    │   │   ├── DECISIONS.md
    │   │   ├── files.md
    │   │   ├── REVIEW.md
    │   │   ├── handoff.md
    │   │   └── CHANGES/
    │   │
    │   └── TASK-YYYYMMDD-HHmm-<tipo>-<slug>/   ← generado por new-task.sh
    │
    └── scripts/                 ← Utilidades shell (16 archivos)
        ├── new-task.sh          ← Crea carpeta de tarea desde template
        ├── active-task.sh       ← Detecta tarea activa por rama git
        ├── constitution-index.sh← Muestra índice ligero de artículos
        ├── art.sh               ← Extrae artículo N del Constitution
        ├── section.sh           ← Extrae sección de cualquier MD
        ├── fetch.sh             ← Trae archivo de tarea activa
        ├── plan-step.sh         ← Extrae paso N del PLAN.md
        ├── grep-task.sh         ← Grep en archivos de la tarea
        ├── diff-task.sh         ← Diff de la rama vs base
        ├── files-touched.sh     ← Lista archivos tocados (deduplicado)
        ├── bootstrap-scan.sh    ← Snapshot rapido del repo para /bootstrap
        ├── sync-context.sh      ← Detecta artículos desactualizados
        ├── log-file-change.sh   ← Hook: loguea edits en files.md
        ├── context-watch.sh     ← Hook: avisa sobre archivos sensibles
        ├── session-start.sh     ← Hook: avisa de tareas activas al iniciar
        └── pre-commit-check.sh  ← Hook: sugiere TASK-id en commits
```

---

## 3. Los archivos de contexto

Estos son los archivos que Claude lee para entender el proyecto. Mantenerlos actualizados es crítico.

### `CLAUDE.md` — El orquestador

**Qué es**: el primer archivo que Claude lee. Es una guía ligera que le dice dónde encontrar cada cosa.

**Qué contiene**: mapa del sistema agéntico, la regla de "no código sin /implement", instrucciones de uso de scripts, tabla de comandos, fase actual del proyecto.

**Cuándo actualizarlo**: cuando cambia la fase actual del proyecto (de Fase 0 a Fase 1, etc.) o cuando se añade algo nuevo al sistema agéntico.

**Quién lo actualiza**: el desarrollador o Claude (proponiéndolo primero).

---

### `.claude/CONSTITUTION.md` — Las reglas inmutables

**Qué es**: el documento más importante del proyecto. Contiene todas las reglas que nunca deben romperse: arquitectura, stack, reglas de negocio, modelo de datos, rutas, convenciones, commits, ramas, colores, rendimiento, SEO, variables de entorno, quality gates.

**Versión actual**: v1.0.0

**Cuándo actualizarlo**: cuando algo del proyecto cambia de forma permanente. Por ejemplo:

- Se añade una nueva tabla a la DB → actualizar Art. 5
- Se añade una nueva regla de negocio → actualizar Art. 4
- Se añade una nueva ruta → actualizar Art. 6
- Se añade una nueva variable de entorno → actualizar Art. 13

**Cómo actualizarlo con Claude**: Claude NUNCA modifica el Constitution sin decirte primero exactamente qué va a cambiar y por qué. Tú confirmas. Claude aplica. Se hace bump de versión.

**Cómo actualizarlo tú directamente**: edita el archivo y haz bump de versión en la cabecera. Añade una entrada en `DECISIONS.md` explicando el cambio.

---

### `.claude/CONSTITUTION-INDEX.md` — Mapa de artículos

**Qué es**: una tabla de 15 líneas que dice qué cubre cada artículo del Constitution y cuándo cargarlo.

**Por qué existe**: Claude puede necesitar solo el Art. 4 (reglas de negocio), no los 14 artículos. El índice le permite decidir qué cargar sin leer el Constitution completo — ahorrando tokens.

**Cuándo actualizarlo**: cada vez que el Constitution cambie (nuevo artículo, artículo renombrado).

---

### `.claude/KNOWLEDGE.md` — Aprendizajes del desarrollo

**Qué es**: un registro de descubrimientos prácticos que no son reglas fijas pero que ahorran tiempo: comandos útiles, errores conocidos no resueltos, workarounds, gotchas del stack.

**Cuándo actualizarlo**: usa `/learn <insight>` en cualquier momento del desarrollo. El comando añade la entrada con formato correcto.

**Formato de cada entrada**:

```markdown
### YYYY-MM-DD — Título corto

**Contexto**: cuándo/dónde aparece esto
**Qué**: descripción clara del problema o aprendizaje
**Por qué importa**: consecuencia práctica
**Workaround/solución**: (si aplica)
```

---

### `.claude/DECISIONS.md` — Decisiones arquitectónicas (ADRs)

**Qué es**: un registro de decisiones técnicas con impacto duradero sobre el proyecto: por qué se eligió Vite en lugar de Next.js, por qué se usa InsForge, por qué la arquitectura Clean, etc.

**Cuándo actualizarlo**: cuando se toma una decisión de arquitectura que no es obvia y que puede afectar el futuro del proyecto.

**Formato**:

```markdown
## ADR-NNN — Título · YYYY-MM-DD

- Estado: accepted
- Contexto: por qué surgió la decisión
- Decisión: qué se eligió
- Alternativas consideradas: qué más se evaluó
- Consecuencias: qué implica a futuro
```

---

## 4. El flujo de desarrollo paso a paso

### El ciclo completo

Todo desarrollo en este proyecto sigue este ciclo sin excepción:

```
                    ┌─────────────────────────────┐
                    │  /feature (o /fix, /refactor │
                    │  /chore, /hotfix, /spike)    │
                    │                              │
                    │  Claude:                     │
                    │  • Crea rama git             │
                    │  • Crea carpeta de tarea     │
                    │  • Analiza el código         │
                    │  • Escribe ANALYSIS.md       │
                    │  • Genera QUESTIONS.md       │
                    │  • PARA                      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  TÚ respondes las preguntas  │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  /plan                       │
                    │                              │
                    │  Claude:                     │
                    │  • Lee ANALYSIS + respuestas │
                    │  • Genera PLAN.md            │
                    │  • Inicializa PROGRESS.md    │
                    │  • PARA                      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  TÚ: "ok" o /revise <qué>   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  /implement (o /next)        │
                    │                              │
                    │  Claude:                     │
                    │  • Ejecuta pasos del plan    │
                    │  • Un commit por paso        │
                    │  • Actualiza PROGRESS.md     │
                    │  • PARA entre pasos          │
                    └──────────────┬──────────────┘
                                   │
                         ┌─────────┴──────────┐
                         │                    │
              ┌──────────▼──────┐    ┌────────▼────────┐
              │ Algo no quedó   │    │  Todo bien      │
              │ como querías    │    └────────┬────────┘
              │                 │             │
              │  /change <qué>  │    ┌────────▼────────┐
              │                 │    │  /review        │
              │  Claude analiza │    │                 │
              │  propone plan   │    │  Subagente      │
              │  espera tu ok   │    │  audita diff    │
              └────────┬────────┘    │  + quality gates│
                       │             └────────┬────────┘
                       └─────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  /done                       │
                    │                              │
                    │  Claude:                     │
                    │  • Sync context (obligatorio)│
                    │  • Propone cambios a files   │
                    │    de contexto si los hay    │
                    │  • Propone PR                │
                    │  • PARA — espera tu ok       │
                    │  • Push + gh pr create       │
                    └─────────────────────────────┘
```

### Por qué cada fase es obligatoria

| Fase                    | Si la saltas...                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `/analyze`              | Claude no sabe qué archivos existen, toma decisiones arquitectónicas a ciegas           |
| `/plan`                 | Claude implementa por intuición, no por contrato. Difícil saber qué viene luego         |
| `/implement`            | No debería existir código sin pasar por esta puerta — es la regla fundamental           |
| `/review`               | Los errores de capas (components importando de infrastructure) son silenciosos          |
| Context sync en `/done` | El Constitution queda desactualizado, la siguiente sesión trabaja con información falsa |

---

## 5. Referencia completa de comandos

### Cómo invocar un comando

En Claude Code, los comandos slash se invocan escribiéndolos en el chat:

```
/feature calendar-virtualization
/plan
/implement next
/change el campo notes no se está guardando
```

---

### Comandos de arranque de tareas

#### `/feature <slug> [descripción]`

Arranca una feature nueva.

- Crea rama `feature/<slug>` desde `develop` (o rama actual si es sub-tarea).
- Crea carpeta `.claude/tasks/TASK-YYYYMMDD-HHmm-feature-<slug>/`.
- Ejecuta análisis y genera preguntas.
- **Para aquí. No implementa nada.**

Ejemplo:

```
/feature loyalty-redeem-flow el cliente debe poder canjear puntos por premios
```

#### `/fix <slug> [síntoma]`

Arranca un bugfix.

- Rama `fix/<slug>` desde `develop`.
- Analiza el bug, intenta identificar causa raíz.
- **Para con el diagnóstico. Espera confirmación antes de planificar.**

Ejemplo:

```
/fix appointment-overlap el sistema permite reservar dos citas a la misma hora
```

#### `/refactor <slug> [descripción]`

Refactor sin cambio funcional.

- Rama `refactor/<slug>`.
- Analiza cobertura de tests antes de tocar nada.
- Si los tests son escasos, el primer paso del plan será añadirlos.

#### `/chore <slug> [descripción]`

Mantenimiento: deps, config, scripts.

- Rama `chore/<slug>`.
- Para deps major, lee breaking changes y genera preguntas.

#### `/hotfix <slug> [síntoma]`

Arreglo urgente a producción. **Base: `main`**, no `develop`.

- Al cerrar, Claude recordará hacer el doble merge (main + develop).

#### `/spike <slug> [pregunta]`

Exploración time-boxed. La rama no se mergea — solo documenta la respuesta.

---

### Comandos del ciclo de vida

#### `/analyze`

Re-ejecuta el análisis de la tarea activa. Útil cuando aportas nueva información que cambia el contexto.

#### `/plan`

Genera `PLAN.md` con pasos numerados. Requiere que `ANALYSIS.md` esté completo y `QUESTIONS.md` respondido.

- Muestra el plan completo y para.
- Responde "ok" para aprobarlo, o usa `/revise` para ajustarlo.

#### `/revise <qué cambiar>`

Ajusta el plan antes de implementar.

```
/revise el paso 2 y 3 júntalos en uno
/revise descarta el paso de loyalty, lo hacemos en otra tarea
/revise antes del paso 1 añade un paso 0 que cree los tipos Zod
```

#### `/implement [opción]`

**La única puerta de entrada al código de producción.**

| Uso               | Qué hace                                            |
| ----------------- | --------------------------------------------------- |
| `/implement`      | Siguiente paso pendiente                            |
| `/implement next` | Igual                                               |
| `/implement 3`    | Solo el paso 3                                      |
| `/implement 2..4` | Pasos 2, 3 y 4                                      |
| `/implement all`  | Todos los pendientes (pide confirmación si son > 3) |

Tras cada paso: commit + actualización de `PROGRESS.md` + pausa para que puedas revisar.

#### `/next`

Atajo para `/implement next`. Para flujo rápido cuando ya tienes el plan aprobado.

#### `/change <descripción del ajuste>`

Flujo de corrección controlada. Úsalo cuando algo no quedó como querías.

**Lo que NO hace**: tocar código directamente.

**Lo que SÍ hace**:

1. Analiza qué implica el cambio.
2. Crea un documento `CHANGES/CHANGE-N.md` con diagnóstico y plan de cambio.
3. Te lo muestra y para.
4. Espera a que tú ejecutes `/implement` para que se aplique.

Ejemplo:

```
/change el hook useAppointments debería recibir userId como parámetro, no leerlo del store
```

#### `/review`

Audita el resultado antes de cerrar:

1. Lanza un subagente independiente que revisa el diff contra las reglas del Constitution.
2. Ejecuta los quality gates (type-check + lint + tests).
3. Verifica los criterios de aceptación del README.md de la tarea.
4. Escribe `REVIEW.md` con el veredicto.

#### `/done`

Cierra la tarea:

1. Review completo (si no se ha hecho).
2. **Context sync obligatorio** — detecta si algún artículo del Constitution ha quedado desactualizado y propone actualizaciones.
3. Propone el PR con título y body. **Para antes de hacer push.**
4. Con tu confirmación: `git push` + `gh pr create`.

---

### Comandos de gestión de sesión

#### `/status`

Foto del estado actual: rama, tarea activa, commits recientes, próximo paso.
Úsalo siempre al iniciar una sesión de trabajo.

#### `/resume [TASK-ID]`

Retoma una tarea en una sesión nueva.

- Sin argumento: detecta la tarea asociada a la rama actual.
- Con argumento: busca la tarea específica y hace checkout de su rama.
- Lee README + STATE + LOG + DECISIONS y te da un resumen.
- **Para antes de ejecutar el próximo paso. Espera tu confirmación.**

#### `/pause`

Persiste el estado actual y marca la tarea como `paused`. Úsalo antes de cerrar si no has terminado.

#### `/block <motivo>`

Marca la tarea como `blocked`. Úsalo cuando hay algo externo que te impide avanzar (una decisión pendiente, una dependencia no resuelta, etc.).

#### `/handoff`

Genera `handoff.md` con toda la información necesaria para retomar en otra máquina o compartir con alguien. Incluye: estado git, próximo paso, archivos clave, comandos para arrancar.

#### `/compact-task`

Resume `LOG.md` cuando ha crecido mucho (>50 entradas). Genera un resumen de 30 líneas al principio del log. Reduce el contexto necesario para retomar.

---

### Comandos de contexto y aprendizaje

#### `/bootstrap [nombre-proyecto]`

Prepara el contexto inicial del proyecto despues de `carlex init`.
Analiza el repo + instrucciones del usuario y propone cambios en CLAUDE.md y los archivos de `.claude/`.
No crea tarea ni toca `src/`.

#### `/sync-context`

Revisa si algún archivo de contexto ha quedado desactualizado. Cruza los archivos tocados en la tarea contra el Constitution y propone actualizaciones. Se ejecuta automáticamente en `/done`, pero puedes invocarlo en cualquier momento.

#### `/learn <insight>`

Añade un aprendizaje a `KNOWLEDGE.md`.

```
/learn InsForge no soporta .rpc() con array args — hay que usar .sql() directo
/learn npm run dev no hot-reloada en iCloud — reiniciar Vite
```

#### `/ask <pregunta>`

Responde una pregunta sobre el proyecto sin crear tarea. Usa scripts de fetch parcial para no inflar el contexto.

```
/ask ¿cuál es la regla exacta de cancelación de citas?
/ask ¿cómo se estructura un hook con TanStack Query?
```

#### `/worktree <slug>`

Crea un worktree git aislado para trabajar en paralelo en otra tarea sin afectar la rama actual. Solo cuando lo pides explícitamente.

---

### Comandos de scaffolding

Estos generan código siguiendo exactamente las convenciones del proyecto.

#### `/new-domain <entidad>`

Genera:

- `src/domain/<entidad>/<entidad>.types.ts` — tipos puros
- `src/domain/<entidad>/<entidad>.rules.ts` — funciones puras de negocio
- `src/domain/<entidad>/<entidad>.rules.test.ts` — tests unitarios

#### `/new-infra <entidad>`

Genera `src/infrastructure/insforge/<entidad>.ts` con:

- Mapper snake_case (DB) ↔ camelCase (dominio)
- CRUD básico: fetch, fetchById, create, update, delete

#### `/new-hook <nombre>`

Genera `src/hooks/use<Nombre>.ts` con TanStack Query y queryKeys correctas.

#### `/new-component <nombre>`

Genera `src/components/<nombre>/<nombre>.tsx` con named export.

#### `/new-page <nombre>`

Genera `src/pages/<nombre>/<nombre>.tsx` con `export default`, `lazy()`, `AuthGuard`, `SeoHead`.

---

### Comandos de diagnóstico

#### `/check`

Ejecuta los tres quality gates:

```bash
npm run type-check
npm run lint
npm run test -- --run
```

Reporta el resultado y ofrece arreglar errores si los hay.

#### `/phase`

Compara el estado actual del código con el plan de fases (`../PLAN_GIO_BARBER_SHOP.md`) y reporta qué está hecho, en progreso y pendiente.

---

## 6. El sistema de tareas (carpetas TASK-)

### Por qué existen

Cuando Claude trabaja en una tarea larga o que se interrumpe, necesita saber:

- Qué tenía que hacer exactamente.
- Dónde se quedó.
- Qué decisiones tomó y por qué.
- Qué archivos tocó.

Sin esto, cada sesión nueva empieza de cero — Claude hace preguntas que ya habías respondido, toma decisiones que ya habías discutido, etc.

### Dónde se guardan

`.claude/tasks/TASK-YYYYMMDD-HHmm-<tipo>-<slug>/`

Ejemplo: `.claude/tasks/TASK-20260501-1430-feature-loyalty-redeem/`

### Se guardan en git — NO

Las carpetas de tareas están en `.gitignore`. Son trabajo en progreso, no son parte del producto. El historial de git queda limpio.

Lo que SÍ se commitea: el código producido, y los aprendizajes promovidos a `KNOWLEDGE.md` o `DECISIONS.md`.

### Archivos dentro de una carpeta de tarea

| Archivo               | Propósito                                       | Cuándo se escribe                 |
| --------------------- | ----------------------------------------------- | --------------------------------- |
| `README.md`           | Contrato: qué, por qué, criterios de aceptación | Al arrancar con `/feature` etc.   |
| `ANALYSIS.md`         | Diagnóstico del código y alcance real           | Durante `/analyze`                |
| `QUESTIONS.md`        | Preguntas abiertas + respuestas del usuario     | Durante `/analyze` y `/plan`      |
| `PLAN.md`             | Pasos numerados con criterios por paso          | Durante `/plan`                   |
| `PROGRESS.md`         | Seguimiento de pasos (pending/in-progress/done) | Actualizado con cada `/implement` |
| `STATE.md`            | Estado vivo: checkpoint + próximo paso          | Actualizado continuamente         |
| `LOG.md`              | Historial append-only de eventos                | Actualizado en cada paso          |
| `DECISIONS.md`        | Decisiones locales de esta tarea                | Cuando hay una decisión de diseño |
| `files.md`            | Archivos tocados (rellena el hook automático)   | Automático con cada Edit/Write    |
| `REVIEW.md`           | Resultado del `/review`                         | Al ejecutar `/review`             |
| `handoff.md`          | Contexto para otra sesión                       | Al ejecutar `/handoff`            |
| `CHANGES/CHANGE-N.md` | Cada corrección solicitada con `/change`        | Al ejecutar `/change`             |

### Cómo retomar una tarea

Si interrumpes el trabajo y vuelves mañana (o en una semana):

```
/resume
```

Claude:

1. Detecta la rama actual y busca la tarea asociada.
2. Lee `README.md` (el contrato), `STATE.md` (dónde estaba), las últimas entradas de `LOG.md`.
3. Te da un resumen y te pregunta si continúa.

Si cambias de máquina: usa `/handoff` antes de irte (genera `handoff.md` con todo el contexto), clona/pullea en la otra máquina, abre Claude Code y ejecuta `/resume`.

---

## 7. Los scripts de fetch parcial

### Por qué existen

El Constitution tiene 14 artículos y ~250 líneas. `PLAN.md` puede tener 100 líneas. El diff de una tarea puede tener miles de líneas. Si Claude cargara todo cada vez, consumiría muchos tokens innecesariamente.

Los scripts permiten cargar **solo el fragmento relevante** en cada momento.

### Lista de scripts

| Script                        | Uso                                                             | Cuándo usarlo                                            |
| ----------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| `constitution-index.sh`       | Muestra el índice de 15 líneas                                  | Al inicio de cualquier análisis                          |
| `art.sh <N>`                  | Extrae el artículo N del Constitution                           | Tras leer el índice, para cargar el art. relevante       |
| `section.sh <file> <heading>` | Extrae una sección de cualquier MD                              | Para leer solo parte de CLAUDE.md, workflows, etc.       |
| `fetch.sh <file>`             | Trae un archivo de la tarea activa                              | Para leer PLAN.md, STATE.md, etc. sin leer toda la tarea |
| `plan-step.sh <N>`            | Extrae el paso N del plan                                       | Al ejecutar `/implement 3` — solo lee ese paso           |
| `grep-task.sh <pattern>`      | Grep en archivos de la tarea                                    | Para buscar algo específico sin leer todo                |
| `diff-task.sh [--stat]`       | Diff de la rama vs base                                         | Con --stat: solo estadísticas. Sin: diff completo        |
| `files-touched.sh`            | Lista de archivos tocados (deduplicado)                         | Para saber qué hay que revisar en el context sync        |
| `bootstrap-scan.sh`           | Snapshot rapido del repo para /bootstrap                         | Solo al preparar el contexto inicial                     |
| `sync-context.sh`             | Detecta artículos del Constitution posiblemente desactualizados | En `/done` (automático) o cuando lo pides                |

### Cómo los usa Claude

Claude los invoca a través de llamadas Bash dentro del chat. Tú normalmente no necesitas ejecutarlos directamente, aunque puedes hacerlo en tu terminal para inspeccionar el estado.

Ejemplo de lo que Claude hace internamente durante `/analyze`:

```bash
bash .claude/scripts/constitution-index.sh     # lee el índice (15 líneas)
bash .claude/scripts/art.sh 3                  # solo Art. 3 — Arquitectura (~25 líneas)
bash .claude/scripts/art.sh 4                  # solo Art. 4 — Reglas de negocio (~15 líneas)
# Total: ~55 líneas vs 250+ del Constitution completo
```

---

## 8. Los hooks automáticos

Los hooks son scripts que se ejecutan automáticamente en respuesta a eventos de Claude Code. Están configurados en `.claude/settings.json`.

### Hook: SessionStart — `session-start.sh`

**Cuándo se ejecuta**: al iniciar una sesión de Claude Code.

**Qué hace**: detecta si hay una tarea activa asociada a la rama git actual y emite un mensaje:

```
[agentic-system] Rama actual: feature/loyalty-redeem-flow
[agentic-system] Tarea activa detectada: TASK-20260501-1430-feature-loyalty-redeem
[agentic-system] Para retomarla ejecuta: /resume TASK-20260501-1430-feature-loyalty-redeem
[agentic-system] Estado: active
```

Así no tienes que recordar en qué tarea estabas.

---

### Hook: PostToolUse — `log-file-change.sh`

**Cuándo se ejecuta**: tras cada `Edit` o `Write` de Claude.

**Qué hace**: añade una entrada a `files.md` de la tarea activa:

```
- 2026-05-01 14:35  M  src/domain/loyalty/loyalty.rules.ts
- 2026-05-01 14:36  C  src/domain/loyalty/loyalty.rules.test.ts
```

`C` = created, `M` = modified. Esto alimenta `sync-context.sh` y `files-touched.sh`.

---

### Hook: PostToolUse — `context-watch.sh`

**Cuándo se ejecuta**: tras cada `Edit` o `Write` de Claude, en paralelo con el anterior.

**Qué hace**: si el archivo editado es "sensible" (reglas de dominio, infrastructure, rutas, env vars, estilos), emite un aviso:

```
[context-watch] Editaste reglas de dominio → ¿cambió alguna regla de negocio? (Art. 4)
[context-watch] Si hay cambio → anota [context-flag] en LOG.md. Se revisará en /done.
```

No bloquea el trabajo. Es un recordatorio para que Claude no olvide actualizar el Constitution cuando hace falta.

---

### Hook: PostToolUse — type-check automático

**Cuándo se ejecuta**: tras cada `Edit` o `Write` de un archivo `.ts` o `.tsx`.

**Qué hace**: ejecuta `npm run type-check` y muestra las últimas 20 líneas. Si hay errores de TypeScript, Claude los ve inmediatamente y puede corregirlos antes de continuar.

---

### Hook: PreToolUse — `pre-commit-check.sh`

**Cuándo se ejecuta**: antes de cada llamada a `Bash` que contenga `git commit`.

**Qué hace**: si hay una tarea activa, emite una sugerencia:

```
[agentic-system] Commit en rama con tarea activa TASK-...
[agentic-system] Considera mencionar TASK-... en el cuerpo del commit.
```

No bloquea. Solo es una sugerencia de trazabilidad.

---

## 9. Estrategia de ramas Git

### Ramas principales

| Rama      | Propósito                   | Base de merges              |
| --------- | --------------------------- | --------------------------- |
| `main`    | Producción (Vercel PRO)     | Solo desde `develop` vía PR |
| `develop` | Pre-producción (Vercel PRE) | Base de todo lo nuevo       |

### Ramas de trabajo

| Tipo           | Nombre                 | Base          | Destino final                   |
| -------------- | ---------------------- | ------------- | ------------------------------- |
| Feature nueva  | `feature/<slug>`       | `develop`     | PR a `develop`                  |
| Bugfix         | `fix/<slug>`           | `develop`     | PR a `develop`                  |
| Refactor       | `refactor/<slug>`      | `develop`     | PR a `develop`                  |
| Mantenimiento  | `chore/<slug>`         | `develop`     | PR a `develop`                  |
| Hotfix urgente | `hotfix/<slug>`        | `main`        | PR a `main` + merge a `develop` |
| Exploración    | `spike/<slug>`         | `develop`     | No se mergea                    |
| Sub-tarea      | `feature/<slug>-<sub>` | La rama padre | PR a la rama padre              |

### Reglas críticas de git

- **Nunca** `git push --force` (está bloqueado en `settings.json`).
- **Nunca** `git reset --hard` (bloqueado).
- **Nunca** `--no-verify` en commits (bloqueado) — commitlint valida el formato.
- **Nunca** merge directo a `main` sin PR.
- **Siempre** doble merge en hotfix: primero a `main`, luego cherry-pick a `develop`.

### Formato de commits (obligatorio)

```
<tipo>(<scope>): <descripción en inglés, tiempo presente imperativo>
```

**Tipos**: `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci` `style`

**Scopes**: `auth` `calendar` `appointments` `loyalty` `admin` `layout` `domain` `infrastructure` `hooks` `deps` `ci` `seo`

```bash
# Correcto
feat(auth): add Google OAuth login
fix(calendar): correct slot overlap calculation
chore(deps): update TanStack Query to v5.1

# Incorrecto (commitlint lo rechaza)
"arregle el bug del calendario"
"WIP"
"cambios"
```

### Tamaño de los commits

Un commit por cambio lógico coherente. El árbol debe compilar y los tests deben pasar tras cada commit. Ni commits de una línea trivial, ni commits de toda la feature de golpe.

---

## 10. Cómo ahorrar tokens

El coste de trabajar con Claude es proporcional a los tokens que entran en su contexto. Estos son los hábitos que más ayudan:

### Usar scripts de fetch parcial siempre

En lugar de pedir "lee el Constitution", pedir "lee el Art. 4". En lugar de "lee el plan", pedir "lee el paso 3". Los scripts están diseñados exactamente para esto.

### Usar `/ask` para preguntas rápidas

Si quieres saber algo puntual (una regla de negocio, cómo funciona un hook), usa `/ask` en lugar de lanzar una tarea completa. `/ask` usa scripts de contexto parcial y no crea carpeta de tarea.

### Usar subagentes para investigación

Cuando hay que explorar mucho código (buscar todos los archivos relacionados con appointments, auditar el diff), Claude lanza un subagente `Explore` que hace la búsqueda en su propio contexto — sin contaminar el contexto principal de la conversación.

### Usar `/compact-task` cuando el log crece

Si una tarea lleva muchos pasos y el `LOG.md` supera ~50 entradas, ejecuta `/compact-task`. Claude genera un resumen ejecutivo de 30 líneas que capta lo esencial, reduciendo el contexto necesario para retomar.

### Empezar cada sesión con `/status`

En lugar de explicar el contexto desde cero, `/status` carga lo mínimo necesario (rama, tarea activa, estado) en pocas líneas.

### No reabrir el tema si Claude ya lo sabe

Si en la misma sesión Claude ya cargó el Constitution, no hace falta pedirle que lo cargue de nuevo. El contexto de la sesión persiste mientras la conversación esté abierta.

---

## 11. Flujo de correcciones (/change)

Este es el flujo cuando algo no quedó como querías. El principio es el mismo que para cualquier tarea: **primero analiza, luego planifica, después implementa**.

### Cuándo usar /change vs otras opciones

| Situación                                    | Qué usar                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Un paso del plan no quedó bien               | `/change <descripción>` dentro de la misma tarea                 |
| El plan entero está mal orientado            | `/revise <qué cambiar>` para regenerar el plan                   |
| Es un bug independiente de la feature actual | `/fix <slug>` en nueva rama                                      |
| Es solo un detalle de estilo (<5 líneas)     | Puedes decírselo directamente, aunque /change sigue siendo mejor |

### El flujo de /change paso a paso

1. Tú: `/change el hook useAppointments debería recibir userId como param, no del store`
2. Claude analiza: lee los archivos afectados, entiende el impacto.
3. Claude crea `CHANGES/CHANGE-001.md` con diagnóstico y plan de corrección.
4. Claude te muestra el plan y para.
5. Tú: "ok" o "cambia el paso 1..."
6. Tú: `/implement` — Claude ejecuta los pasos del CHANGE.
7. Claude añade el CHANGE como `done` en el LOG y actualiza PROGRESS si hace falta.

### Lo que /change garantiza

- Nunca modifica código "a lo loco" sin que tú hayas visto el plan.
- Documenta exactamente qué cambió y por qué en `CHANGES/CHANGE-N.md`.
- Si el cambio afecta al plan original, propone regenerarlo con `/revise`.

---

## 12. Continuidad entre sesiones

### Escenario 1: Pausa voluntaria

Terminas la sesión pero la tarea no está completa.

```
/pause
```

Claude actualiza `STATE.md` con el checkpoint actual y marca la tarea como `paused`. La próxima sesión:

```
/resume
```

Claude lee `README.md` (contrato) + `STATE.md` (dónde estaba) + últimas entradas de `LOG.md` y te da un resumen. Te pregunta si continúa.

### Escenario 2: La sesión se cierra inesperadamente

Igual que la pausa voluntaria, pero el hook `Stop` persiste el estado automáticamente al cerrar.

Próxima sesión: el hook `SessionStart` detecta la tarea activa y te avisa. Ejecutas `/resume`.

### Escenario 3: Cambio de máquina

Antes de irte:

```
/handoff
```

Esto genera `handoff.md` con: estado git, commits hechos, diff vs base, próximo paso exacto, contexto imprescindible y comandos para arrancar.

En la otra máquina:

```bash
git clone / git pull
git checkout feature/<slug>
# Abrir Claude Code y ejecutar:
/resume TASK-YYYYMMDD-HHmm-feature-<slug>
```

### Escenario 4: Log muy largo (semanas de trabajo)

```
/compact-task
```

Genera un resumen ejecutivo al principio de `LOG.md`. Las próximas sesiones cargan el resumen (30 líneas) en lugar del log completo.

---

## 13. Ejemplos completos de flujos reales

### Ejemplo A: Añadir sistema de fidelización

```
# Sesión 1
/feature loyalty-system sistema completo de puntos: ganar al completar citas, canjear por premios

# Claude analiza (~5 min) y genera preguntas:
# Q-1: ¿Los puntos se otorgan instantáneamente o al final del día?
# Q-2: ¿Puede haber varios premios activos a la vez?
# Q-3: ¿Caducan los puntos?

# Tú respondes:
# Q-1: Instantáneamente al marcar la cita como 'completed'
# Q-2: Sí, múltiples premios activos
# Q-3: No, no caducan

/plan
# Claude propone:
# Paso 1 — Domain: tipos + reglas loyalty (calcular puntos, validar canje)
# Paso 2 — Infrastructure: adaptadores loyalty_cards + loyalty_transactions + rewards
# Paso 3 — Hooks: useLoyaltyCard, useRewards, useRedeemReward
# Paso 4 — Componentes: LoyaltyCard, RewardsList, RedeemModal
# Paso 5 — Página: integrar en AppointmentsPage (badge de puntos)
# Tú: "ok"

/implement
# Claude implementa Paso 1, hace commit, para y pregunta si continúa
# Tú: "sí"
/next
# Paso 2... commit... pausa
/next
# Paso 3... etc.

# Sesión 2 (al día siguiente)
/resume
# Claude: "Tarea loyalty-system. Pasos 1-3 done. Próximo: Paso 4 — componentes. ¿Continúo?"
# Tú: "sí"
/next
/next

/review
# Agente verifica: sin violaciones de arquitectura, todos los tests pasan

/done
# Context sync: "Art. 4 posiblemente desactualizado — añadida regla 8 sobre puntos de fidelización. ¿Apruebas?"
# Tú: "sí"
# Claude actualiza el Constitution + propone PR
# Tú: "sí al PR"
```

### Ejemplo B: Corrección durante implementación

```
/feature admin-settings panel de configuración de la barbería

# (análisis + plan aprobado)
/implement all

# Ves el resultado y algo no está bien:
/change el formulario de horario laboral debería usar un campo de hora por slot, no un input de texto libre

# Claude analiza el impacto
# Crea CHANGES/CHANGE-001.md con plan de corrección
# Te lo muestra y para

# Tú: "ok"
/implement
# Aplica solo el CHANGE, hace commit con mensaje claro
```

### Ejemplo C: Hotfix urgente en producción

```
# El cliente llama: "la app no deja reservar citas desde esta mañana"
/hotfix booking-broken nadie puede crear citas desde las 9am

# Claude: rama hotfix/booking-broken desde main
# Análisis rápido: identifica que un cambio de ayer rompió la validación de slots

/plan
# Plan quirúrgico: 1 test que reproduce + 1 fix de 3 líneas

/implement

/review
# Todo pasa

/done
# Claude: "¿Procedo con PR a main? Recuerda hacer también cherry-pick a develop"
# Tú: "sí"
# PR a main → deploy a prod
# Cherry-pick a develop → sin regresión en el siguiente deploy
```

---

## 14. Errores comunes y cómo evitarlos

### ❌ Pedir implementación directamente sin flujo

**Incorrecto**:

```
implementa el sistema de citas completo
```

**Correcto**:

```
/feature appointment-system
# (esperar análisis y preguntas)
/plan
# (aprobar plan)
/implement
```

**Por qué**: sin análisis, Claude toma decisiones arbitrarias de arquitectura. Sin plan, es imposible retomar si se interrumpe.

---

### ❌ Pedir correcciones sin /change

**Incorrecto**:

```
no, ese hook no está bien, hazlo de otra manera
```

**Correcto**:

```
/change el hook useAppointments debería recibir userId como parámetro en lugar de leerlo del store
```

**Por qué**: la corrección directa es ambigua, no queda documentada y Claude puede malinterpretar el alcance del cambio.

---

### ❌ Ignorar las preguntas de /analyze

Si Claude genera preguntas en `QUESTIONS.md` y tú simplemente dices "sigue", Claude asumirá defaults que pueden no ser lo que quieres.

**Regla**: responde siempre las preguntas antes de `/plan`. Si una pregunta te da igual, díselo explícitamente ("Q-2: me da igual, elige tú").

---

### ❌ Saltarse /review antes de /done

`/done` incluye review, pero si hay muchos cambios, hacer `/review` por separado antes te da más visibilidad sobre lo que el agente encuentra.

---

### ❌ No hacer /pause antes de cerrar

Si cierras Claude Code sin ejecutar `/pause`, el estado se pierde y la próxima sesión tiene menos contexto. El hook `Stop` intenta persistir el estado, pero es mejor hacerlo explícitamente.

---

### ❌ Modificar el Constitution directamente sin bumping de versión

Si editas `CONSTITUTION.md` a mano, acuerda hacer:

1. Bump de versión en la cabecera.
2. Entrada en `DECISIONS.md` con el motivo.
3. Actualizar `CONSTITUTION-INDEX.md` si cambió algún artículo.

---

### ❌ Asumir que Claude sabe lo que hiciste antes

Si hiciste algo fuera de Claude (editar un archivo directamente, ejecutar comandos en tu terminal, crear una rama a mano), díselo explícitamente. Claude solo sabe lo que ha visto en la sesión actual o lo que está en los archivos de la tarea.

---

## 15. FAQ

**¿Puedo usar Claude sin estos comandos para tareas simples?**

Sí. Para preguntas rápidas usa `/ask`. Para cambios de 1-2 líneas obvios, puedes decírselos directamente. El sistema está diseñado para tareas no triviales; no hay que burocratizar lo simple.

---

**¿Qué pasa si abro Claude Code sin estar en la rama correcta?**

El hook `SessionStart` detecta la rama actual y busca si hay una tarea asociada. Si no encuentra nada, no dice nada. Siempre puedes hacer `git checkout feature/<slug>` tú mismo y luego `/resume`.

---

**¿Las carpetas de tarea ocupan mucho espacio?**

Son solo archivos markdown. Una tarea compleja puede tener ~10 archivos de unos pocos KB cada uno. No es un problema.

---

**¿Puedo tener varias tareas abiertas al mismo tiempo?**

Sí. Cada una está en su propia rama y carpeta. `/status` las lista todas. Para cambiar de tarea: `git checkout <otra-rama>` y luego `/resume`. Si quieres trabajarlas verdaderamente en paralelo, usa `/worktree <slug>`.

---

**¿Qué pasa si el Constitution se queda desactualizado sin que nadie lo note?**

Es el riesgo principal del sistema. Los mecanismos de protección son:

1. Hook `context-watch.sh` — avisa cuando se editan archivos sensibles.
2. `/sync-context` en `/done` — obligatorio antes de cada PR.
3. El propio flujo de `/analyze` — Claude lee el Constitution al inicio de cada tarea.

Si aun así quedó desactualizado, puedes detectarlo con `/sync-context` en cualquier momento.

---

**¿Puedo añadir nuevos comandos al sistema?**

Sí. Crea un archivo en `.claude/commands/<nombre>.md` siguiendo el formato de los existentes. Claude lo reconocerá automáticamente como `/nombre`.

---

**¿Qué hace Claude si no entiende un comando?**

Si escribes `/algo` que no existe, Claude simplemente no lo reconoce y te pide clarificación. No hay efectos secundarios.

---

**¿Puedo modificar la Constitution yo directamente?**

Sí, eres el dueño del proyecto. Solo recuerda: bump de versión, entrada en `DECISIONS.md`, actualizar el `CONSTITUTION-INDEX.md` si añades o renombras artículos.

---

**¿Qué pasa si Claude propone un cambio al Constitution que no quiero?**

Simplemente dices "no". Claude anota en el `LOG.md` de la tarea que el cambio fue considerado y rechazado, para tener trazabilidad.

---

---

## 16. Browser automation — el skill `/web`

### Qué es

El skill `/web` permite a Claude navegar la web con Playwright cuando los MCPs disponibles no pueden resolver una tarea (login requerido, SPAs, contenido dinámico). Siempre opera headless. Aprende de cada visita y reutiliza ese conocimiento en visitas futuras.

### Cómo activarlo

```
/web <descripción de lo que necesitas>
```

Ejemplos:
- `/web dame el precio del vuelo Madrid-Barcelona para el 15 de junio en Iberia`
- `/web entra en mi Gmail y dime cuántos correos no leídos tengo de Amazon`
- `/web lee los últimos 5 mensajes del chat con "Meryxtu" en WhatsApp Web`

Claude decide internamente si necesita el browser o si puede resolverlo con MCPs. Si usas "usa el browser" o "entra en", activa el skill directamente.

### Flujo interno (lo que Claude hace sin que tengas que gestionarlo)

1. **Consulta KB** — ¿ya tiene scripts para este sitio? Los reutiliza. Si no, los crea.
2. **Clasifica la acción** — ¿es sensible? (enviar mensajes, eliminar, pagar, publicar) → pide confirmación explícita antes de ejecutar.
3. **Lanza headless** — con stealth mode, bloqueando trackers y recursos innecesarios.
4. **Auth automática** — si hay sesión guardada, la restaura. Si la sesión expiró o no existe, abre una ventana visible y te avisa:
   ```
   [AUTH REQUIRED] Por favor inicia sesión en <dominio> en la ventana del navegador.
   Cuando estés dentro, escribe ENTER para continuar.
   ```
5. **Documenta** — crea/actualiza `~/.claude/browser-kb/<dominio>/` con constitution, selectores, scripts y DOM de referencia.
6. **Cierra todo** — tabs, browser, log de sesión.

### Acciones SIEMPRE bloqueadas sin confirmación explícita tuya

- Enviar mensajes / correos
- Eliminar recursos o cuentas
- Hacer pagos o confirmar compras
- Cambiar configuración de cuenta o contraseña
- Publicar contenido (posts, tweets, comentarios)
- Descargar datos masivos de terceros
- Aceptar términos legales

### Comandos de diagnóstico

```bash
# Ver qué sitios tiene documentados
bash .claude/scripts/kb-query.sh --list

# Ver herramientas disponibles para un sitio/apartado
bash .claude/scripts/kb-query.sh web.whatsapp.com chats

# Ver el índice de un sitio
bash .claude/scripts/kb-query.sh gmail.com --index

# Ver un script guardado
bash .claude/scripts/kb-query.sh gmail.com inbox --script read-emails.js

# Ver sesiones recientes
node browser/scripts/session-log.js list
```

### Instalación y setup

`carlex init` copia automáticamente `browser/` e instala las dependencias (`npm install`). Si lo instalaste antes de esta versión, actualiza con:

```bash
carlex upgrade --dest /ruta/a/tu-proyecto
```

Verifica que funciona:

```bash
node browser/browse.js --url https://example.com --output /tmp/test.json
cat /tmp/test.json
```

Deberías ver un JSON con `title: "Example Domain"`.

### Autenticar un sitio por primera vez

Para sitios con login (WhatsApp, Gmail, etc.), usa el script de auth interactivo:

```bash
# WhatsApp Web (hay uno pre-construido)
node browser/scripts/whatsapp-auth.js

# Para cualquier otro sitio: adapta el script plantilla
# o simplemente ejecuta /web y Claude abrirá la ventana cuando la necesite
```

### Estructura de la Knowledge Base

```
~/.claude/browser-kb/              ← global, no en el repo
├── _index.yml                     ← todos los sitios conocidos
├── _sessions/                     ← últimas 50 sesiones (logs de auditoría)
├── _processes/                    ← flujos multi-sitio (ej: "buscar-precio-vuelo")
└── web.whatsapp.com/
    ├── constitution.md            ← qué es el sitio, cómo funciona
    ├── _index.yml                 ← secciones + scripts registrados
    ├── _sessions/cookies.json     ← sesión guardada
    └── chats/
        ├── tools.md               ← selectores documentados
        ├── dom-snap.html          ← DOM de referencia
        └── scripts/read-chats.js  ← script que funciona
```

La KB se genera automáticamente durante el uso normal. Si un selector deja de funcionar (el sitio cambió), Claude detecta el error, captura un nuevo DOM snapshot, actualiza los selectores y continúa.

---

_Fin de la guía. Para cualquier duda sobre el sistema, usa `/ask` o consulta directamente los archivos de `.claude/`._
