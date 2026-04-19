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

- **Estado**: superseded-by ADR-007
- **Contexto**: necesidad de PostgreSQL + Auth + Storage + Edge Functions con una sola integración.
- **Decisión**: InsForge como BaaS principal.
- **Error documentado (2026-04-19)**: la decisión original asumía que InsForge era "API compatible tipo Supabase" y usaba `@supabase/supabase-js`. Esto es incorrecto — InsForge tiene su propio SDK (`@insforge/sdk`) con rutas de API completamente distintas. Ver ADR-007.
- **Consecuencias**: el cliente se aísla en `src/infrastructure/insforge/client.ts`. Si hubiera que migrar a Supabase real, se cambia solo el cliente y los adaptadores.

## ADR-004 — Sistema de tareas con carpetas no commiteadas · 2026-04-17

- **Estado**: accepted
- **Contexto**: necesidad de retomar sesiones de Claude Code sin perder contexto, sin contaminar el historial de git con archivos de trabajo vivo.
- **Decisión**: cada tarea genera `.claude/tasks/TASK-<fecha>-<slug>/` con README/STATE/LOG/DECISIONS/files. Carpeta ignorada en git. Los descubrimientos reutilizables se promueven a `KNOWLEDGE.md` o a nuevos ADRs.
- **Alternativas consideradas**: commitear las tareas como parte del historial (descartado: ruido en git log, no aporta al producto).
- **Consecuencias**: las tareas son efímeras pero recuperables dentro de la misma máquina; la promoción a knowledge es explícita vía `/learn`.

---

## ADR-005 — CI/CD con Vercel CLI (no GitHub Action) y deploy manual a PRO · 2026-04-18

- **Estado**: accepted
- **Contexto**: necesidad de controlar exactamente cuándo y qué se despliega en PRO, sin que Vercel auto-despliegue en cada push.
- **Decisión**: usar Vercel CLI en GitHub Actions en lugar de la GitHub Action oficial de Vercel. Los despliegues a PRO production son siempre manuales vía `workflow_dispatch` con un tag específico.
- **Alternativas consideradas**: Vercel auto-deploy desde GitHub (descartado: no permite controlar qué va a PRO ni cuándo). GitHub Action de Vercel (descartado: menos control sobre el environment y las variables).
- **Consecuencias**: hay que deshabilitar los auto-deploys de Vercel en el dashboard (Settings → Git → "Ignored Build Step" = `exit 1`) en ambos proyectos. Sin eso, Vercel sigue desplegando en paralelo con su propia integración GitHub.

## ADR-006 — `IS_PROD_DEPLOY` como env a nivel de job · 2026-04-18

- **Estado**: accepted
- **Contexto**: en `deploy-pre.yml`, la expresión `github.ref == 'refs/heads/develop'` se usaba 3 veces (pull, build, deploy).
- **Decisión**: definir `IS_PROD_DEPLOY: ${{ github.ref == 'refs/heads/develop' }}` como `env` a nivel de job. Usarlo en steps como `${{ env.IS_PROD_DEPLOY == 'true' && '--prod' || '' }}`.
- **Consecuencias**: el patrón `env.VAR == 'true' && 'X' || 'Y'` es el ternario idiomático de GitHub Actions cuando el valor proviene de un env de job (siempre string, no boolean).

---

## ADR-007 — Migrar de @supabase/supabase-js a @insforge/sdk · 2026-04-19

- **Estado**: accepted
- **Contexto**: el proyecto arrancó usando `@supabase/supabase-js` asumiendo que InsForge era API-compatible con Supabase. Al intentar conectar con InsForge PRE en las primeras pruebas reales, todos los endpoints de auth devolvían 404. La causa: InsForge usa `/api/auth/sessions` para login, no `/auth/v1/token` (Supabase). InsForge tiene su propio SDK con métodos y retornos distintos.
- **Decisión**: reemplazar `@supabase/supabase-js` por `@insforge/sdk` en toda la capa de infraestructura. El cliente se inicializa con `createClient({ baseUrl, anonKey })`. Los métodos de auth cambian (ver KNOWLEDGE.md sección InsForge para la tabla completa).
- **Alternativas consideradas**: configurar `auth.url` en el cliente de Supabase para apuntar a las rutas de InsForge (descartado: frágil, hackish, no mantenible a medida que se usen más features del SDK).
- **Consecuencias**:
  - Única capa afectada: `src/infrastructure/` (`client.ts` + `authRepository.ts`)
  - El mapper de usuario cambia: `user.metadata.role` en lugar de `user.app_metadata.role`
  - El flujo de reset de contraseña es distinto (token en query param, no hash fragment)
  - La detección de email confirmation: `data.requireEmailVerification === true` en lugar de `data.session === null`
  - Tests: el mock de `@insforge/sdk` reemplaza al de `@supabase/supabase-js`

## ADR-003 — Constitution v1.1.0: quality gates migrados a pnpm

- **Fecha**: 2026-04-17
- **Estado**: accepted
- **Contexto**: Art. 14 tenía los comandos de quality gates con `npm run`. El proyecto usa pnpm como package manager y el script de test se llama `test:run` (no `test -- --run`).
- **Decisión**: actualizar Art. 14 a `pnpm run type-check / pnpm run lint / pnpm run test:run`. Bump menor 1.0.0 → 1.1.0.
- **Consecuencias**: los quality gates del Constitution ahora coinciden con los scripts reales de `package.json`.
