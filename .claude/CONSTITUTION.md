# Constitución del Proyecto — Gio Barber Shop

> **Este documento es la fuente de verdad inmutable.** Ningún agente debe modificarlo sin permiso explícito del usuario. Si detecta que algo ha cambiado en la realidad del código y el Constitution debería actualizarse, **avisa primero**, explica QUÉ cambia, QUÉ quedará y POR QUÉ, y espera confirmación.

Versión: 1.1.0 · Última revisión: 2026-04-17

---

## Art. 1 — Identidad del proyecto

Aplicación web de **gestión de citas para Gio Barber Shop** (peluquería masculina). Dos roles: `client` (reserva citas, acumula puntos, canjea premios) y `admin` (gestiona servicios, horarios, bloqueos, ve métricas).

- Repo: `barber-dates-web/`
- Plan maestro (fuera del repo): `../PLAN_GIO_BARBER_SHOP.md`

---

## Art. 2 — Stack tecnológico (no alterar sin discusión)

| Capa             | Tecnología                | Restricción                                                                     |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------- |
| Framework        | **React 19 + Vite**       | No Next.js (el 95% del contenido está detrás de auth)                           |
| Lenguaje         | **TypeScript strict**     | Sin `any`. Interfaces para objetos, types para uniones                          |
| Estilos          | **TailwindCSS v4**        | Sin CSS custom. Sin `style={{}}` salvo valores dinámicos imposibles en Tailwind |
| Componentes base | **shadcn/ui (Radix UI)**  | Copiados a `src/components/ui/`                                                 |
| Routing          | **React Router v7**       | Layouts anidados, protección por rol                                            |
| Estado servidor  | **TanStack Query v5**     | Para TODO dato del servidor                                                     |
| Virtualización   | **TanStack Virtual**      | Listas > ~30 elementos                                                          |
| Fechas           | **date-fns**              | Nunca moment.js                                                                 |
| Estado global UI | **Zustand**               | SOLO UI (tema, sidebar). Nunca datos del servidor                               |
| Formularios      | **React Hook Form + Zod** | Siempre juntos                                                                  |
| SEO              | **react-helmet-async**    | Meta tags dinámicos                                                             |
| Testing          | **Vitest + RTL**          |                                                                                 |
| Backend          | **InsForge**              | Como Supabase: PostgreSQL + Auth + Storage + Edge Functions                     |
| Despliegue       | **Vercel dual**           | PRO desde `main` · PRE desde cualquier rama                                     |
| CI/CD            | **GitHub Actions**        | Quality gates antes de cada deploy                                              |

---

## Art. 3 — Arquitectura (Clean Architecture adaptada)

### Regla de dependencias — LEY

```
pages/ → components/ → hooks/ → infrastructure/
                              ↘ domain/
domain/ no importa NADA externo
```

| Capa                  | Qué contiene                                       | Puede importar de                  | NUNCA importa de                        |
| --------------------- | -------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| `src/domain/`         | Tipos TS + funciones puras + reglas de negocio     | Otros archivos de `domain/`        | React, InsForge, date-fns, nada externo |
| `src/infrastructure/` | Adaptadores a servicios externos (InsForge)        | `domain/` (solo types)             | React, hooks, components                |
| `src/hooks/`          | Capa aplicación: TanStack Query + lógica orquestal | `domain/`, `infrastructure/`       | `components/`, `pages/`                 |
| `src/components/`     | UI reutilizable                                    | `hooks/`, `domain/`                | `infrastructure/` directamente          |
| `src/pages/`          | Pantallas                                          | `hooks/`, `components/`, `domain/` | `infrastructure/` directamente          |

**Si rompes esta regla, la rompes por escrito y con permiso. No hay excepciones tácitas.**

---

## Art. 4 — Reglas de negocio (viven en `src/domain/`, NUNCA en componentes)

1. Un cliente solo puede tener **1 cita futura activa** (`status='confirmed'`) a la vez.
2. Las citas se cancelan hasta **2 horas antes** (`CANCELLATION_LIMIT_HOURS = 2`).
3. Los puntos de fidelización se otorgan al **COMPLETAR** la cita (no al reservar ni confirmar).
4. El admin puede bloquear días/horas específicos (`schedule_blocks`).
5. Los servicios tienen duración fija que determina los slots disponibles.
6. Sesión **cliente**: persistente indefinida.
7. Sesión **admin**: máximo **15 días** desde el login (`ADMIN_SESSION_MAX_DAYS = 15`). Forzar logout si supera. Timestamp en localStorage (`admin_login_time`).

---

## Art. 5 — Modelo de datos (PostgreSQL/InsForge)

```
barbers           id, full_name, role, bio, avatar_url, phone, email, specialty_ids(JSONB), is_active
profiles          id→auth.users, full_name, phone, avatar_url, role('client'|'admin')
services          id, name, description, duration_minutes, price, loyalty_points, is_active, sort_order
appointments      id, client_id→profiles, barber_id→barbers, service_id→services, start_time, end_time, status, notes
                  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
schedule_blocks   id, barber_id→barbers (NULL=todos), block_date, start_time, end_time, day_of_week, reason, is_recurring
shop_config       id, key (unique), value(JSONB)
                  keys: shop_info, schedule, booking, loyalty
loyalty_cards     id, client_id→profiles (unique), total_points, total_visits
loyalty_transactions  id, card_id→loyalty_cards, appointment_id→appointments, points, type, description
                  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment'
rewards           id, label, cost, is_active, sort_order
redeemed_rewards  id, card_id→loyalty_cards, reward_id→rewards, redeemed_at
```

### RLS (Row Level Security) — obligatorio en todas las tablas

- `profiles`: cada usuario ve el suyo; admin ve todos.
- `barbers`: lectura pública; escritura solo admin.
- `appointments`: clientes ven las suyas; admin gestiona todas.
- `services`: lectura pública; escritura solo admin.
- `rewards`: lectura pública; escritura solo admin.
- `loyalty_cards`, `loyalty_transactions`: cada cliente ve los suyos; admin ve todos.
- `schedule_blocks`, `shop_config`: lectura pública; escritura solo admin.

**Convención de mapeo**: snake_case en DB ↔ camelCase en dominio. El mapper vive en `infrastructure/`, nunca filtra snake_case a capas superiores.

---

## Art. 6 — Rutas

| Ruta               | Acceso                     | Componente         |
| ------------------ | -------------------------- | ------------------ |
| `/`                | Público                    | `LandingPage`      |
| `/auth`            | Público                    | `AuthPage`         |
| `/calendar`        | `AuthGuard(role='client')` | `CalendarPage`     |
| `/appointments`    | `AuthGuard(role='client')` | `AppointmentsPage` |
| `/admin/dashboard` | `AuthGuard(role='admin')`  | `DashboardPage`    |
| `/admin/settings`  | `AuthGuard(role='admin')`  | `SettingsPage`     |

### Flujo de arranque

```
App carga
  └─ ¿Sesión activa?
       ├─ SÍ → admin? → < 15 días? → /admin/dashboard  (else signOut → /)
       │     → client? → ¿tiene cita upcoming? → /appointments
       │                                       → (sin cita) /calendar
       └─ NO → /
```

---

## Art. 7 — Convenciones de código

- **Idioma del código**: inglés (variables, funciones, tipos, componentes, comentarios).
- **Idioma de UI**: español (textos en JSX visibles al usuario).
- **Componentes**: functional + hooks, nunca clases.
- **Exports**: named para todo, salvo páginas (`export default`).
- **Imports**: siempre alias `@/` (ej. `@/components/ui/button`).
- **Sin `any`**. Sin unused vars.
- **Comentarios**: solo cuando el WHY no es obvio. Sin JSDoc en componentes simples.
- **queryKeys**: arrays descriptivos de mayor a menor especificidad.
  ```ts
  ;['appointments'][('appointments', userId)][('appointments', userId, date)]
  ```
- **Zod**: schema en el mismo archivo que el form o en `domain/`.

---

## Art. 8 — Convención de commits (Husky + Commitlint obligatorio)

Formato: `type(scope): descripción en inglés, presente imperativo`.

- **Types permitidos**: `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci` `style`
- **Scopes permitidos**: `auth` `calendar` `appointments` `loyalty` `admin` `layout` `domain` `infrastructure` `hooks` `deps` `ci` `seo`

```
✅ feat(auth): add Google OAuth login
✅ fix(calendar): correct slot overlap calculation
❌ "arregle el bug"   ← commitlint lo rechaza
❌ "WIP"              ← commitlint lo rechaza
```

**Tamaño de commits**: pequeños pero con significado. Un commit por cambio lógico — ni commits enanos, ni commits gigantes por feature entera. Cada commit debe dejar el árbol en estado coherente (compila, tests no rotos).

---

## Art. 9 — Estrategia de ramas y flujo de despliegue

### Ramas

- `main` → producción (Vercel PRO). Solo merges desde `develop` vía PR.
- `develop` → pre-producción (Vercel PRE). Base de todo lo nuevo.
- `feature/<slug>` → desarrollo nuevo. **Base: `develop`**.
- `fix/<slug>` → bugfix. **Base: `develop`**.
- `hotfix/<slug>` → urgente en prod. **Base: `main`**.
- `refactor/<slug>` · `chore/<slug>` · `spike/<slug>` → mismas reglas de base que feature.

**Sub-tareas**: si una tarea sale de otra en curso, la rama hija se crea desde la rama actual (no desde `develop`). Se mergea de vuelta a la rama padre, no a `develop`.

**Prohibido sin permiso**: `push --force`, `reset --hard`, `--no-verify`, merge sobre `main` directo.

### Flujo de despliegue CI/CD

| Evento | Workflow | Qué ocurre |
|---|---|---|
| Push a cualquier rama ≠ `main` y ≠ `develop` | `deploy-pre.yml` | Preview en Vercel PRE (URL temporal única) |
| Push a `develop` | `deploy-pre.yml` | **Production en Vercel PRE** (actualiza URL principal de PRE) |
| Push a `main` | `deploy-production.yml` | Preview en Vercel PRO + tag automático `v{fecha}-{hash}` |
| `workflow_dispatch` manual con tag | `deploy-production-manual.yml` | **Production en Vercel PRO** (actualiza URL principal de PRO) |

### Cómo desplegar a PRO (paso a paso)

1. Mergea `develop → main` vía PR
2. El CI crea automáticamente el tag (ej. `v20260418-ab6eda5`) y despliega preview en PRO
3. Anota el tag: **GitHub → Actions → run del paso 2 → Job Summary**
4. Ve a **GitHub → Actions → "Deploy Production (manual)" → Run workflow**
5. Introduce el tag del paso 3 → confirma

### Variables de entorno por entorno

| Entorno | `VITE_APP_ENV` | Proyecto Vercel | Secrets usados |
|---|---|---|---|
| Feature branch | `preview` | `barber-dates-web-pre` | `INSFORGE_*_PRE` |
| Develop (PRE production) | `preview` | `barber-dates-web-pre` | `INSFORGE_*_PRE` |
| PRO preview | `preview` | `barber-dates-web-prod` | `INSFORGE_*_PROD` |
| PRO production | `production` | `barber-dates-web-prod` | `INSFORGE_*_PROD` |

---

## Art. 10 — Paleta de colores (no cambiar sin consenso)

| Token             | Valor     | Uso                                          |
| ----------------- | --------- | -------------------------------------------- |
| Primario (Dorado) | `#C8A44E` | Acentos, botones principales, iconos activos |
| Hover dorado      | `#b8943e` | Hover botones dorados                        |
| Fondo oscuro      | `#1A1A1A` | Tema oscuro                                  |
| Fondo claro       | `#FAFAFA` | Tema claro                                   |
| Texto primario    | `#111111` |                                              |
| Texto secundario  | `#6B7280` |                                              |
| Borde             | `#E5E7EB` |                                              |
| Éxito             | `#10B981` | Cita confirmada                              |
| Error             | `#EF4444` | Cancelación, errores                         |
| Warning           | `#F59E0B` | Avisos                                       |
| Superficie card   | `#FFFFFF` |                                              |

**Tipografía**: Inter (Google Fonts), `font-display: swap`, preconnect en `<head>`.

---

## Art. 11 — Rendimiento (objetivo Lighthouse 95+)

- Code splitting: todas las páginas con `lazy()` + `Suspense`.
- TanStack Virtual en listas > ~30 elementos.
- Prefetching en hover del calendario.
- Imágenes: `loading="lazy"` + `decoding="async"` + dimensiones explícitas.
- `React.memo`: solo dentro de listas largas.
- `useMemo`: solo para cálculos costosos.
- `useCallback`: solo para props de componentes memoizados.

---

## Art. 12 — SEO (solo `/`)

- `public/robots.txt` — permite GPTBot, ClaudeBot, anthropic-ai.
- `public/llms.txt` — markdown para agentes IA.
- `public/llms-full.txt` — versión extendida con FAQ.
- `public/sitemap.xml` — solo `/`.
- Prerenderizado de `/` con `vite-plugin-prerender`.

---

## Art. 13 — Variables de entorno y MCP servers

### Variables de entorno (frontend)

```bash
VITE_INSFORGE_URL=
VITE_INSFORGE_ANON_KEY=
VITE_APP_NAME="Gio Barber Shop"
VITE_APP_ENV=development   # development | preview | production
VITE_GOOGLE_CLIENT_ID=

# Mocks locales — solo en .env.local (gitignoreado), nunca en otros envs
VITE_USE_MOCKS=false          # activa MSW browser worker en dev
VITE_MOCK_ROLE=client         # rol del usuario fake al hacer login: "client" | "admin"
```

Nunca commitear `.env*` excepto `.env.example`.

### MCP servers de InsForge (Claude Code)

Configurados globalmente en `~/.claude/settings.json` (fuera del repo, nunca commiteado).  
Para añadir un nuevo proyecto InsForge, añadir una entrada bajo `mcpServers`:

```json
"insforge-<nombre>": {
  "command": "npx",
  "args": [
    "@insforge/mcp",
    "--api_key", "ik_TU_KEY",
    "--api_base_url", "https://TU_URL.eu-central.insforge.app"
  ]
}
```

| Nombre MCP | Entorno | URL |
|---|---|---|
| `insforge-pre` | PRE (desarrollo) | `https://99upfj9c.eu-central.insforge.app` |
| `insforge-prod` | PRO (producción) | `https://pfzm89u2.eu-central.insforge.app` |

Las API keys se obtienen desde InsForge Dashboard → Connect Project → API Keys.  
Los cambios en `~/.claude/settings.json` requieren reiniciar Claude Code para tomar efecto.

---

## Art. 14 — Quality gates (ejecutar antes de cualquier cierre)

```bash
pnpm run type-check
pnpm run lint
pnpm run test:run
```

Si alguno falla, la tarea no puede cerrarse (`/done`).

---

## Modificación de la Constitución

Cualquier cambio requiere:

1. Aviso explícito al usuario: **"Propongo cambiar X porque Y, quedará así Z"**.
2. Confirmación del usuario.
3. Bump de versión (`1.0.0` → `1.1.0` si amplía, `2.0.0` si rompe).
4. Entrada en `DECISIONS.md` con la fecha y el motivo.
