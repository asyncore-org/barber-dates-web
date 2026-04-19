# 04 — Referencia Completa de Comandos

> Los comandos se invocan escribiéndolos directamente en el chat de Claude Code.
> Todos están implementados en `.claude/commands/<nombre>.md`.

---

## Índice rápido

| Categoría       | Comandos                                                                      |
| --------------- | ----------------------------------------------------------------------------- |
| **Arranque**    | `/feature` `/fix` `/refactor` `/chore` `/hotfix` `/spike`                     |
| **Ciclo**       | `/analyze` `/plan` `/revise` `/implement` `/next` `/change` `/review` `/test` `/done` |
| **Sesión**      | `/status` `/resume` `/pause` `/block` `/handoff` `/compact-task`              |
| **Contexto**    | `/sync-context` `/learn` `/ask` `/worktree`                                   |
| **Scaffolding** | `/new-domain` `/new-infra` `/new-hook` `/new-component` `/new-page`           |
| **Diagnóstico** | `/check` `/phase`                                                             |

---

## Comandos de arranque

### `/feature <slug> [descripción]`

Arranca una feature nueva.

- Crea rama `feature/<slug>` (desde `develop` por defecto, o desde la rama actual si es sub-tarea).
- Crea `.claude/tasks/TASK-YYYYMMDD-HHmm-feature-<slug>/`.
- Ejecuta análisis completo y genera QUESTIONS.md.
- **Para con las preguntas. No implementa nada.**

```
/feature calendar-virtualization
/feature loyalty-redeem el cliente puede canjear puntos por premios
```

---

### `/fix <slug> [síntoma]`

Arranca un bugfix.

- Rama `fix/<slug>` desde `develop` (o rama actual si sub-tarea).
- Intenta reproducir el bug e identificar la causa raíz.
- **Para con el diagnóstico. Espera confirmación antes de planificar.**

```
/fix appointment-overlap el sistema permite reservar dos citas a la misma hora
```

---

### `/refactor <slug> [descripción]`

Refactor sin cambio funcional.

- Rama `refactor/<slug>`.
- Analiza cobertura de tests. Si es insuficiente, el primer paso del plan serán tests de caracterización.

```
/refactor domain-types unificar los tipos duplicados de appointments
```

---

### `/chore <slug> [descripción]`

Mantenimiento: deps, config, tooling.

- Para deps major: lee breaking changes y genera preguntas antes de planificar.

```
/chore tanstack-query-v5 actualizar de v4 a v5
```

---

### `/hotfix <slug> [síntoma]`

Arreglo urgente a producción. **Base: `main`, no `develop`.**

- Al cerrar, Claude recuerda siempre hacer doble merge (main + develop).

```
/hotfix booking-crash la app crashea al reservar cita en móvil
```

---

### `/spike <slug> [pregunta]`

Exploración time-boxed para responder una pregunta técnica.

- La rama no se mergea. Al terminar se documenta la respuesta.

```
/spike ssr-feasibility ¿merece la pena añadir SSR parcial para la landing?
```

---

## Comandos del ciclo de vida

### `/analyze`

Re-ejecuta la fase de análisis de la tarea activa. Úsalo cuando aportas nueva información.

```
/analyze
```

---

### `/plan`

Genera PLAN.md con pasos numerados. Requiere ANALYSIS.md completo y QUESTIONS.md respondido.

- Muestra el plan y **para**. Responde "ok" o usa `/revise`.

```
/plan
```

---

### `/revise <qué cambiar>`

Ajusta el plan antes de implementar. Genera una versión nueva (v1 → v2...).

```
/revise el paso 2 y 3 júntalos en uno solo
/revise descarta el paso de loyalty points, eso va en otra tarea
/revise el paso 1 debería crear los tipos Zod antes que los domain types
```

---

### `/implement [opción]`

**La única puerta al código de producción.** Ejecuta pasos del plan aprobado.

| Variante          | Qué hace                             |
| ----------------- | ------------------------------------ |
| `/implement`      | Siguiente paso pendiente             |
| `/implement next` | Igual                                |
| `/implement 3`    | Solo el paso 3                       |
| `/implement 2..4` | Pasos 2, 3 y 4 en secuencia          |
| `/implement all`  | Todos (pide confirmación si son > 3) |

Tras cada paso: commit + actualización de PROGRESS.md + pausa para que puedas revisar.

```
/implement
/implement 3
/implement all
```

---

### `/next`

Atajo para `/implement next`. Para flujo rápido cuando ya tienes el plan aprobado y quieres ir paso a paso sin escribir el número.

```
/next
```

---

### `/change <descripción>`

Flujo de corrección controlada. Cuando algo no quedó como querías.

**Lo que NO hace**: tocar código directamente.

**Lo que SÍ hace**:

1. Analiza qué implica el cambio sin tocar nada.
2. Crea `CHANGES/CHANGE-N.md` con diagnóstico y plan propuesto.
3. Te lo muestra y **para**.
4. Espera a que tú ejecutes `/implement`.

**Ciclo completo**:

```
/change <qué>
  └─ si ≤ 1 paso y ≤ 2 archivos → /implement directamente
  └─ si > 1 paso o > 2 archivos → /plan (formaliza PLAN.md) → /implement
/implement → /review → /test → continuar o /done
```

```
/change el hook useAppointments debería recibir userId como parámetro, no leerlo del store
/change el campo notes no se está guardando en la DB — falta en el mapper
/change cambia el color del botón de cancelar a rojo error (#EF4444)
```

---

### `/review`

Audita el resultado implementado antes de cerrar:

1. Subagente independiente revisa el diff contra el Constitution.
2. Ejecuta type-check + lint + tests.
3. Verifica criterios de aceptación del README de la tarea.
4. Escribe REVIEW.md con el veredicto (APROBADO / BLOQUEADO).

```
/review
```

---

### `/test`

Lanza un subagente que abre Chromium, navega la app y verifica que los flujos principales funcionan visualmente. **Posición en el ciclo**: después de `/review`, antes de `/done`.

| Variante              | Qué hace                                           |
| --------------------- | -------------------------------------------------- |
| `/test`               | Flujos por defecto contra servidor local (mocks)   |
| `/test <descripción>` | Testea exactamente lo que describes (local)        |
| `/test --pre`         | Flujos por defecto contra InsForge PRE (real)      |
| `/test --pre <desc>`  | Lo que describes contra InsForge PRE               |

**Precondiciones**:
- `/review` ejecutado sin bloqueos abiertos.
- MCP de Playwright configurado en `~/.claude/settings.json` (ver [05-sistema-de-tareas.md](05-sistema-de-tareas.md)).

**Genera**: `TEST.md` con veredicto PASS / FAIL por flujo.

```
/test
/test login y registro
/test que se puede reservar una cita y cancelarla
/test --pre el flujo completo de puntos de fidelidad
```

---

### `/done`

Cierra la tarea. Secuencia:

1. Review completo (si no se ha hecho).
2. Context sync (obligatorio — detecta Constitution desactualizado).
3. Te propone actualizaciones a archivos de contexto si las hay.
4. Con tu OK: actualiza los archivos de contexto.
5. Propone PR con título y body estructurado.
6. **Para antes de hacer push.** Con tu confirmación: `git push` + `gh pr create`.

```
/done
```

---

## Comandos de gestión de sesión

### `/status`

Foto del estado actual: rama, tarea activa, checkpoint, próximo paso, commits recientes.

Úsalo siempre al iniciar una sesión de trabajo para orientarte sin leer nada manualmente.

```
/status
```

---

### `/resume [TASK-ID]`

Retoma una tarea en una sesión nueva.

- Sin argumento: detecta la tarea de la rama actual.
- Con argumento: busca esa tarea específica y hace checkout de su rama.

Lee README + STATE + LOG y te da un resumen. **Para antes de ejecutar el próximo paso.**

```
/resume
/resume TASK-20260501-1430-feature-loyalty-system
```

---

### `/pause`

Persiste el estado y marca la tarea como `paused`. Úsalo antes de cerrar si no has terminado.

```
/pause
```

---

### `/block <motivo>`

Marca la tarea como `blocked`. Para cuando hay algo externo que te impide avanzar.

```
/block esperando decisión del cliente sobre cuántos puntos dan los servicios premium
/block necesito acceso a la DB de producción para verificar el schema real
```

---

### `/handoff`

Genera `handoff.md` completo para retomar en otra máquina. Incluye estado git, commits, próximo paso exacto y comandos para arrancar.

```
/handoff
```

---

### `/compact-task`

Resume `LOG.md` cuando supera ~50 entradas. Genera un resumen ejecutivo de 30 líneas que captura lo esencial.

```
/compact-task
```

---

## Comandos de contexto y aprendizaje

### `/sync-context`

Revisa si algún archivo de contexto ha quedado desactualizado. Detecta artículos del Constitution que podrían haberse quedado obsoletos según los archivos tocados en la tarea.

Se ejecuta automáticamente en `/done`. Puedes invocarlo en cualquier momento.

```
/sync-context
```

---

### `/learn <insight>`

Añade un aprendizaje a `KNOWLEDGE.md` con formato correcto.

```
/learn InsForge devuelve error 406 si la tabla no tiene RLS habilitado — habilitar siempre
/learn TailwindCSS v4 no soporta el prefijo dark: con la sintaxis de v3 — revisar docs de migración
```

---

### `/ask <pregunta>`

Responde una pregunta sobre el proyecto sin crear tarea. Usa scripts de fetch parcial — no carga todo el contexto.

```
/ask ¿cuál es la regla exacta de cancelación de citas?
/ask ¿cómo se estructura un nuevo hook con TanStack Query?
/ask ¿qué RLS aplica a la tabla loyalty_cards?
```

---

### `/worktree <slug>`

Crea un worktree git aislado para trabajar en paralelo en otra tarea. Solo cuando lo pides explícitamente.

```
/worktree admin-settings
```

Genera: `../barber-dates-web--admin-settings` con la rama `feature/admin-settings`.

Para limpiar cuando termines:

```bash
git worktree remove ../barber-dates-web--admin-settings
```

---

## Comandos de scaffolding

Generan código siguiendo exactamente las convenciones del proyecto (capas, naming, exports).

### `/new-domain <entidad>`

Genera en `src/domain/<entidad>/`:

- `<entidad>.types.ts` — tipos puros (cero dependencias externas)
- `<entidad>.rules.ts` — funciones puras de negocio
- `<entidad>.rules.test.ts` — tests unitarios (sin mocks)

```
/new-domain appointment
/new-domain loyalty
```

---

### `/new-infra <entidad>`

Genera `src/infrastructure/insforge/<entidad>.ts` con:

- Mapper snake_case (DB) ↔ camelCase (dominio)
- CRUD completo: fetch, fetchById, create, update, delete

```
/new-infra appointments
/new-infra loyalty-cards
```

---

### `/new-hook <nombre>`

Genera `src/hooks/use<Nombre>.ts` con TanStack Query, queryKeys correctas y manejo de loading/error.

```
/new-hook Appointments
/new-hook LoyaltyCard
```

---

### `/new-component <nombre>`

Genera `src/components/<nombre>/<nombre>.tsx` con named export y props tipadas.

```
/new-component AppointmentCard
/new-component LoyaltyBadge
```

---

### `/new-page <nombre>`

Genera `src/pages/<nombre>/<nombre>.tsx` con:

- `export default`
- Registro en router con `lazy()`
- `AuthGuard` con el rol correcto
- `SeoHead` para meta tags

```
/new-page AppointmentsPage
/new-page AdminDashboard
```

---

## Comandos de diagnóstico

### `/check`

Ejecuta los tres quality gates y reporta el resultado:

```
✅ TypeScript — sin errores
✅ ESLint — sin errores
✅ Tests — 24 passed, 0 failed
```

Si hay errores, los muestra y ofrece arreglarlos.

```
/check
```

---

### `/phase`

Compara el estado actual del código con el plan de fases (`../PLAN_GIO_BARBER_SHOP.md`) y reporta:

```
## Fase actual: Fase 1 — Scaffold

✅ Completado
  - Vite + React + TypeScript configurado
  - TailwindCSS v4 + shadcn/ui instalado

🔄 En progreso
  - Configuración de InsForge client

❌ Pendiente
  - Husky + Commitlint
  - GitHub Actions CI

Siguiente acción recomendada: configurar el cliente InsForge en src/infrastructure/
```

```
/phase
```
