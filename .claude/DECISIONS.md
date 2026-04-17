# Decisiones Arquitectónicas (ADR) — Gio Barber Shop

> Decisiones globales con impacto durable sobre la arquitectura del proyecto. Cada entrada es inmutable una vez aprobada. Si se revierte una decisión, se añade una nueva entrada que lo explica.

**Formato de cada ADR:**
```
## ADR-NNN — Título · YYYY-MM-DD

- **Estado**: proposed | accepted | deprecated | superseded-by ADR-XXX
- **Contexto**: por qué surgió la pregunta
- **Decisión**: qué se eligió
- **Alternativas consideradas**: qué más se evaluó y por qué no
- **Consecuencias**: qué implica esto para el futuro
```

---

## ADR-001 — Vite + React en lugar de Next.js · 2026-04-17

- **Estado**: accepted
- **Contexto**: el 95% del contenido de la app requiere autenticación. Solo la landing es pública.
- **Decisión**: Vite + React Router v7. Prerenderizado estático de `/` con `vite-plugin-prerender` para SEO.
- **Alternativas consideradas**: Next.js App Router (descartado porque el SSR aporta poco cuando casi todo está auth-gated y encarece build/deploy).
- **Consecuencias**: deploy más simple (Vercel estático + edge functions en InsForge); el SEO solo se aplica a `/`.

## ADR-002 — Clean Architecture estricta con `domain/` puro · 2026-04-17

- **Estado**: accepted
- **Contexto**: evitar que la lógica de negocio acabe dispersa en componentes y acoplada a InsForge.
- **Decisión**: 4 capas (`domain`, `infrastructure`, `hooks`, `components+pages`) con la regla de que `domain/` no importa nada externo (ni React, ni InsForge, ni date-fns).
- **Alternativas consideradas**: arquitectura feature-first sin separación dura (descartada por riesgo de acoplamiento a InsForge).
- **Consecuencias**: si cambia el backend, solo toca `infrastructure/`. Las reglas de negocio son 100% testeables sin mocks.

## ADR-003 — InsForge como BaaS en lugar de Supabase directo · 2026-04-17

- **Estado**: accepted
- **Contexto**: necesidad de PostgreSQL + Auth + Storage + Edge Functions con una sola integración.
- **Decisión**: InsForge (API compatible tipo Supabase).
- **Consecuencias**: el cliente se aísla en `src/infrastructure/insforge/client.ts`. Si hubiera que migrar a Supabase real, se cambia solo el cliente y los adaptadores.

## ADR-004 — Sistema de tareas con carpetas no commiteadas · 2026-04-17

- **Estado**: accepted
- **Contexto**: necesidad de retomar sesiones de Claude Code sin perder contexto, sin contaminar el historial de git con archivos de trabajo vivo.
- **Decisión**: cada tarea genera `.claude/tasks/TASK-<fecha>-<slug>/` con README/STATE/LOG/DECISIONS/files. Carpeta ignorada en git. Los descubrimientos reutilizables se promueven a `KNOWLEDGE.md` o a nuevos ADRs.
- **Alternativas consideradas**: commitear las tareas como parte del historial (descartado: ruido en git log, no aporta al producto).
- **Consecuencias**: las tareas son efímeras pero recuperables dentro de la misma máquina; la promoción a knowledge es explícita vía `/learn`.
