# Workflow: Feature — guía por fase

> Este archivo es referencia interna. Cada comando lee solo la fase que le corresponde.
> Usar `bash .claude/scripts/section.sh .claude/workflows/feature.md "<Fase>"` para cargar solo lo necesario.

---

## Fase ANÁLISIS — invocada por `/feature` y `/analyze`

**Objetivo**: entender el alcance real antes de planificar. No escribir código de producción.

### Qué cargar (mínimo de contexto)

```bash
bash .claude/scripts/art.sh 3   # Arquitectura — siempre
bash .claude/scripts/art.sh 4   # Reglas de negocio — si la feature toca domain
bash .claude/scripts/art.sh 5   # Modelo de datos — si la feature toca DB
```

### Qué explorar en el código

Usar subagente `Explore` para investigar sin inflar el contexto principal:

```
Agent({
  subagent_type: "Explore",
  prompt: "En barber-dates-web/src/, ¿qué archivos existen relacionados con <tema>?
           Lista: path, qué exporta, qué importa. < 200 palabras."
})
```

### Preguntas que el análisis debe responder

1. ¿Qué capas toca? (domain / infra / hooks / components / pages)
2. ¿Hay entidades de dominio nuevas o se modifican existentes?
3. ¿Hay nuevas rutas o pantallas?
4. ¿Hay implicaciones de RLS en InsForge?
5. ¿Algún edge case de las reglas de negocio (Art. 4) que afecte el diseño?
6. ¿Hay dependencias con otras tareas o PRs?

### Artefactos que produce

- `ANALYSIS.md` — diagnóstico completo.
- `QUESTIONS.md` — preguntas al usuario (si hay ambigüedad).

### Cómo termina esta fase

Reportar al usuario y **PARAR**. No continuar hasta que el usuario responda las preguntas y ejecute `/plan`.

---

## Fase PLAN — invocada por `/plan`

**Objetivo**: generar `PLAN.md` con pasos numerados y criterios por paso. Esperar aprobación.

### Qué cargar

```bash
bash .claude/scripts/fetch.sh ANALYSIS.md
bash .claude/scripts/fetch.sh QUESTIONS.md   # para ver respuestas del usuario
bash .claude/scripts/fetch.sh README.md
```

### Orden canónico de pasos para una feature

1. Tipos + reglas de dominio (`/new-domain`) + tests unitarios.
2. Adaptador InsForge (`/new-infra`) con mapper snake_case ↔ camelCase.
3. Hook TanStack Query (`/new-hook`) con queryKeys.
4. Componentes y páginas (`/new-component`, `/new-page`).
5. Wiring: rutas, AuthGuard, lazy().
6. Tests de integración (si aplica).

> Cada paso = 1 commit coherente. Ajustar si la feature es pequeña (fusionar pasos) o grande (subdividir).

### Artefactos que produce

- `PLAN.md` — pasos + criterios.
- `PROGRESS.md` — tabla de seguimiento inicializada con todos los pasos en `pending`.

### Cómo termina esta fase

Mostrar el plan al usuario y **PARAR**. Esperar "ok" o `/revise`.

---

## Fase IMPLEMENTACIÓN — invocada por `/implement [N | next | all | rango]`

**Objetivo**: ejecutar exactamente los pasos del plan aprobado. Un commit por paso.

### Qué cargar por paso

```bash
bash .claude/scripts/plan-step.sh <N>         # solo el paso N
bash .claude/scripts/art.sh 3                 # arquitectura (siempre)
# + el Art. del Constitution que corresponda a la capa del paso
```

### Reglas de implementación

- **Orden de capas**: domain → infrastructure → hooks → components → pages.
- Usar scaffolding: `/new-domain`, `/new-infra`, `/new-hook`, `/new-component`, `/new-page`.
- Sin `any`. Sin saltarse capas. Sin lógica de negocio en componentes.
- Verificar criterio de completado del paso antes de hacer el commit.
- Commit: `git add <archivos del paso> && git commit -m "<type>(<scope>): <desc>"`.
- Actualizar `PROGRESS.md` tras cada paso (estado → `done`, hash del commit).
- Añadir entrada `checkpoint` en `LOG.md`.

### Pausa entre pasos

Tras cada paso completado, reportar brevemente y preguntar si continuar (salvo que el usuario haya dicho "all").

### Cómo termina esta fase

Cuando todos los pasos están `done`. Sugerir `/review`.

---

## Fase REVIEW — invocada por `/review`

Ver `.claude/commands/review.md` — el flujo es idéntico para todos los workflows.

---

## Fase CHANGE — invocada por `/change <qué>`

Ver `.claude/commands/change.md` — funciona igual en todos los workflows.

---

## Fase CIERRE — invocada por `/done`

Ver `.claude/commands/done.md`.

**Doble verificación específica de features**:

- Que las páginas nuevas usan `lazy()` + `Suspense`.
- Que hay `AuthGuard` en rutas privadas.
- Que el dominio tiene tests.
- Que los componentes no importan de `infrastructure/`.
