# Gio Barber Shop — barber-dates-web

Aplicación web de gestión de citas para una peluquería masculina. Dos roles: **cliente** (reserva citas, acumula puntos, canjea premios) y **admin** (gestiona servicios, horarios, bloqueos y métricas).

---

## Descripción del producto

### Vista cliente

- Login / Registro con email o Google OAuth
- Calendario mensual para reservar citas
- Sistema de tarjeta de fidelización (puntos + premios)
- Pestaña "Mis citas": próxima cita, historial, premios obtenidos
- Perfil de usuario con ajustes y cierre de sesión

### Vista admin

- Calendario semanal estilo Microsoft Teams con detalle de citas
- Panel lateral con próximas citas del día
- Configuración: servicios, horarios, días bloqueados, ajustes generales

---

## Stack tecnológico

| Capa             | Tecnología                | Restricción clave                                              |
| ---------------- | ------------------------- | -------------------------------------------------------------- |
| Framework        | React 19 + Vite           | No Next.js — el 95% del contenido está detrás de auth         |
| Lenguaje         | TypeScript strict          | Sin `any`. Interfaces para objetos, types para uniones         |
| Estilos          | TailwindCSS v4            | Sin CSS custom. Sin `style={{}}` salvo valores dinámicos       |
| Componentes base | shadcn/ui (Radix UI)      | Copiados a `src/components/ui/`, no se instalan como librería  |
| Routing          | React Router v7           | Layouts anidados, protección por rol con AuthGuard             |
| Estado servidor  | TanStack Query v5         | Para todo dato del servidor; nunca Zustand para datos remotos  |
| Virtualización   | TanStack Virtual          | Listas con más de ~30 elementos                                |
| Fechas           | date-fns                  | Nunca moment.js                                                |
| Estado global UI | Zustand                   | Solo estado UI (tema, sidebar)                                 |
| Formularios      | React Hook Form + Zod     | Siempre juntos; Zod como fuente de tipos y validación          |
| SEO              | react-helmet-async        | Meta tags dinámicos por página                                 |
| Testing          | Vitest + RTL              | MSW v2 para mocks de red en tests e2e                          |
| Backend          | InsForge                  | PostgreSQL + Auth + Storage + Edge Functions (como Supabase)   |
| Despliegue       | Vercel dual               | PRO desde `main` · PRE desde cualquier otra rama               |
| CI/CD            | GitHub Actions            | Quality gates automáticos antes de cada deploy                 |

---

## Arquitectura

El proyecto sigue **Clean Architecture** adaptada a React. Cada capa solo puede importar hacia adentro — nunca al revés.

```
src/
├── domain/           # Tipos y reglas puras — cero dependencias externas
├── infrastructure/   # Adaptadores InsForge — solo importa de domain/
├── hooks/            # TanStack Query — importa de domain/ e infrastructure/
├── components/       # UI reutilizable — sin lógica de negocio
│   └── ui/           # Componentes shadcn/ui copiados
├── pages/            # Pantallas con lazy() + AuthGuard + SeoHead
├── stores/           # Zustand — solo estado de UI
├── lib/              # Utilidades compartidas (cn, formatters)
├── mocks/            # MSW handlers + fixtures (solo entorno de desarrollo)
│   ├── handlers/     # Un fichero por dominio: auth, appointments, services...
│   └── data/         # Fixtures commiteados y compartidos por todo el equipo
└── test/             # Setup global de Vitest
```

**Regla de imports**: `pages → components → hooks → infrastructure → domain`. Nunca al revés.

---

## Setup local

### Requisitos

- Node.js 20+
- pnpm 10+ — `npm install -g pnpm`

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/asyncore-org/barber-dates-web.git
cd barber-dates-web

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno locales
cp .env.example .env.local
# Editar .env.local con los valores reales (ver sección Variables de entorno)

# 4. Arrancar el servidor de desarrollo
pnpm dev
```

La app queda disponible en `http://localhost:5173`.

---

## Mocks locales (MSW)

Durante el desarrollo puedes trabajar sin conexión a InsForge activando los mocks de red con MSW v2. Basta con añadir estas dos líneas a `.env.local`:

```bash
VITE_USE_MOCKS=true
VITE_MOCK_ROLE=client   # "client" | "admin"
```

Con `VITE_USE_MOCKS=true`, el service worker intercepta todas las peticiones al backend y las resuelve con los handlers de `src/mocks/handlers/` y los fixtures de `src/mocks/data/`.

> Los fixtures en `src/mocks/data/` están commiteados y son compartidos por todo el equipo. Si durante pruebas locales añades datos útiles, edítalos y haz commit para que el resto los tenga.

Los handlers MSW también se usan en los tests de Vitest a través del servidor de nodo configurado en `src/test/setup.ts`.

---

## Variables de entorno

| Variable               | Descripción                                      | Ejemplo                            |
| ---------------------- | ------------------------------------------------ | ---------------------------------- |
| `VITE_INSFORGE_URL`    | URL del proyecto InsForge                        | `https://xxx.supabase.co`          |
| `VITE_INSFORGE_ANON_KEY` | Clave anónima pública de InsForge              | `eyJ...`                           |
| `VITE_APP_NAME`        | Nombre de la aplicación                          | `Gio Barber Shop`                  |
| `VITE_APP_ENV`         | Entorno actual                                   | `development` / `preview` / `production` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth                       | `xxx.apps.googleusercontent.com`   |
| `VITE_USE_MOCKS`       | Activa MSW (solo en `.env.local`)                | `false`                            |
| `VITE_MOCK_ROLE`       | Rol del usuario fake al hacer login con el mock  | `client` / `admin`                 |

> **Nunca commitear `.env*`** excepto `.env.example`. Los valores reales solo van en `.env.local`, que está en `.gitignore`.

---

## Scripts

| Comando             | Descripción                                       |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo con HMR                    |
| `pnpm build`        | Build de producción (type-check + Vite)           |
| `pnpm preview`      | Previsualizar el build de producción localmente   |
| `pnpm lint`         | ESLint sobre `src/`                               |
| `pnpm lint:fix`     | ESLint con corrección automática                  |
| `pnpm format`       | Prettier sobre todo el proyecto                   |
| `pnpm format:check` | Verifica formato sin escribir                     |
| `pnpm type-check`   | TypeScript sin emitir archivos                    |
| `pnpm test`         | Vitest en modo watch                              |
| `pnpm test:run`     | Vitest una sola vez (modo CI)                     |

---

## CI/CD

Cada push a cualquier rama ejecuta un pipeline de GitHub Actions con dos fases:

### Quality gates

```
pnpm lint  →  pnpm type-check  →  pnpm test:run  →  pnpm build
```

El pipeline se cancela si cualquier gate falla. Ningún deploy ocurre sin pasar todos.

### Despliegue dual en Vercel

| Proyecto Vercel | Rama de origen         | Cuándo se despliega          |
| --------------- | ---------------------- | ---------------------------- |
| **PRE**         | Cualquier rama (≠ `main`) | En cada push                |
| **PRO**         | `main`                 | Al mergear un PR aprobado    |

Cada PR genera automáticamente una URL de preview en el proyecto PRE. El proyecto PRO solo recibe código que ha pasado por `develop` y todos los quality gates.

---

## Convención de commits

Formato: `<tipo>(<scope>): <descripción en presente e imperativo>`

| Tipo       | Cuándo usarlo                              |
| ---------- | ------------------------------------------ |
| `feat`     | Nueva funcionalidad                        |
| `fix`      | Corrección de bug                          |
| `refactor` | Refactoring sin cambio funcional           |
| `test`     | Tests nuevos o modificados                 |
| `chore`    | Dependencias, configuración, scripts       |
| `docs`     | Documentación                              |
| `ci`       | Cambios en GitHub Actions o CI             |
| `perf`     | Mejoras de rendimiento                     |

**Ejemplos válidos:**

```
feat(auth): add Google OAuth login
fix(calendar): correct slot overlap calculation
refactor(domain): extract appointment cancellation rule
chore(deps): update TanStack Query to v5.1
docs(readme): update setup instructions
test(hooks): add useAppointments unit tests
```

Los commits inválidos son rechazados automáticamente por Husky + Commitlint antes de poder hacer push.

---

## Roadmap de fases

| Fase | Descripción                                                     | Estado          |
| ---- | --------------------------------------------------------------- | --------------- |
| 0    | Setup inicial: scaffold, herramientas, CI/CD, sistema agéntico  | ✅ Completada   |
| 1    | Autenticación + sesiones (login, registro, AuthGuard, roles)    | 🔜 En curso     |
| 2    | Landing page, SEO completo y llms.txt                           | ⬜ Pendiente    |
| 3    | Layout y navegación (AppShell, TabNav, responsive)              | ⬜ Pendiente    |
| 4    | Vista cliente — Calendario de citas                             | ⬜ Pendiente    |
| 5    | Vista cliente — Mis citas + tarjeta de fidelización             | ⬜ Pendiente    |
| 6    | Vista admin — Dashboard + calendario semanal                    | ⬜ Pendiente    |
| 7    | Vista admin — Configuración (servicios, horarios, bloqueos)     | ⬜ Pendiente    |
| 8    | Backend logic: Edge Functions (puntos, canje de premios)        | ⬜ Pendiente    |
| 9    | Pulido, testing completo y auditoría de rendimiento (Lighthouse) | ⬜ Pendiente   |

> Plan maestro completo en `PLAN_GIO_BARBER_SHOP.md`.
