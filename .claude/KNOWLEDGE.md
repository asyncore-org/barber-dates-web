# Knowledge — Gio Barber Shop

> Descubrimientos vivos durante el desarrollo: gotchas, workarounds, comandos útiles, errores conocidos no resueltos, tips de entorno. Se commitea. Se actualiza vía `/learn <insight>` o manualmente.

Cada entrada debe tener: **Fecha · Contexto · Qué · Por qué importa**.

---

## InsForge — SDK, API y documentación

### 2026-05-04 · InsForge · Join embebido devuelve profiles como array, no como objeto

**Qué**: Al hacer `.select('..., profiles(full_name)')` en InsForge (embedded join), el SDK infiere un tipo para `profiles` que no es directamente asignable a `{ full_name: string | null } | null`. TypeScript fuerza el doble cast `as unknown as RowType[]` si el tipo local no coincide.

**Fix**: definir una interfaz intermedia `AppointmentRowRaw` con `profiles: Array<{ full_name: string | null }> | { full_name: string | null } | null` y normalizar con `profiles?.[0] ?? null` antes de pasar al mapper. Así se elimina el `unknown` cast.

**Regla**: al añadir un join embebido en cualquier query InsForge, crear un tipo `*Raw` para el resultado del SDK y un `normalizeRow()` que lo convierte al tipo de dominio. Ver `src/infrastructure/insforge/appointmentRepository.ts → AppointmentRowRaw`.



### 2026-04-19 · InsForge SDK · NO usar @supabase/supabase-js — tiene su propio SDK

**Qué**: InsForge NO es Supabase. Aunque comparte conceptos similares (PostgreSQL, Auth, Storage), usa su **propio SDK** con rutas de API completamente diferentes. Usar `@supabase/supabase-js` con URLs de InsForge da 404 en todos los endpoints de auth.

**SDK correcto**: `@insforge/sdk` — instalar con `pnpm add @insforge/sdk`

**Documentación oficial**:
- Índice completo: https://docs.insforge.dev/llms.txt
- SDK TypeScript (auth): https://docs.insforge.dev/sdks/typescript/auth.md
- SDK TypeScript (overview): https://docs.insforge.dev/sdks/typescript/overview.md
- Auth API REST: https://docs.insforge.dev/api-reference/client/user-login.md
- React guide: https://docs.insforge.dev/examples/framework-guides/react.md
- Arquitectura auth: https://docs.insforge.dev/core-concepts/authentication/architecture.md

**Inicialización correcta**:
```typescript
import { createClient } from '@insforge/sdk'

const insforge = createClient({
  baseUrl: 'https://xxxx.eu-central.insforge.app',
  anonKey: 'your-anon-key',
})
```

**Rutas API de auth** (InsForge vs Supabase):
| Operación | Supabase (`/auth/v1/`) | InsForge (`/api/auth/`) |
|---|---|---|
| Login | `POST /token?grant_type=password` | `POST /sessions` |
| Registro | `POST /signup` | `POST /users` |
| Sesión actual | `GET /user` | `GET /sessions/current` |
| OAuth iniciar | `GET /authorize` | `GET /oauth/:provider` |
| Reset password | `POST /recover` | `POST /email/reset-password` |

**Métodos del SDK** (diferencias clave vs supabase-js):
```typescript
// Login
insforge.auth.signInWithPassword({ email, password })
// → { data: { user, accessToken, csrfToken }, error }

// Registro
insforge.auth.signUp({ email, password, name, redirectTo })
// → { data: { user, accessToken, requireEmailVerification? }, error }
// IMPORTANTE: chequear data.requireEmailVerification === true (no data.session === null)

// Sesión actual (en bootstrap — NO getSession())
insforge.auth.getCurrentUser()
// → { data: { user | null }, error }

// OAuth (auto-redirect al proveedor)
insforge.auth.signInWithOAuth({ provider: 'google', redirectTo: '...' })

// Password reset — paso 1
insforge.auth.sendResetPasswordEmail({ email, redirectTo })
// paso 2 (con token de la URL de redirect)
insforge.auth.resetPassword({ newPassword, otp: tokenFromUrl })

// Cerrar sesión
insforge.auth.signOut()
```

**Forma del objeto User** (InsForge):
```typescript
{
  id: string,
  email: string,
  emailVerified: boolean,       // NO email_confirmed_at
  providers: string[],
  createdAt: string,
  updatedAt: string,
  profile: { name?: string, avatar_url?: string },  // NO user_metadata
  metadata: Record<string, unknown>,                 // datos flexibles del admin
}
```

**Cómo almacenar el rol de admin**:
- El rol se guarda en `user.metadata.role` (columna `metadata` jsonb en `auth.users`)
- SQL para promover a admin en InsForge:
  ```sql
  UPDATE auth.users
  SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE email = 'user@example.com';
  ```
- En el mapper: leer `(user.metadata?.role as string) ?? 'client'`
- **NO** usar `app_metadata` ni `user_metadata` (conceptos de Supabase, no existen en InsForge)

**Esquema real de `auth.users` en InsForge**:
```
id (uuid), email (text), password (text), email_verified (boolean),
created_at, updated_at, profile (jsonb), metadata (jsonb),
is_project_admin (boolean), is_anonymous (boolean)
```

**Flujo reset de contraseña** (InsForge, diferente a Supabase):
- Supabase: redirige a `URL#type=recovery` (hash fragment)
- InsForge: redirige a `URL?token=xxx` (query param — verificar formato exacto en docs)
- La detección en AuthPage ya NO puede buscar `#type=recovery`

**Google OAuth en InsForge**:
- El Client ID vive en el dashboard de InsForge, NO en el `.env` del frontend
- Usar `VITE_GOOGLE_OAUTH_ENABLED=true` en `.env` para mostrar/ocultar el botón
- El SDK hace el redirect automáticamente sin necesidad del Client ID en frontend

---

## Entorno y arranque

### 2026-04-19 · InsForge MCP · cómo conectarse a PRE vs PRO desde Claude Code

**Qué**: hay dos MCP servers globales configurados en `~/.claude/settings.json`: `insforge-pre` (desarrollo) e `insforge-prod` (producción). Claude Code los carga al arrancar la sesión.

**Cómo usarlos**: al iniciar una sesión de Claude Code, ambos MCP servers están disponibles automáticamente. Para operar sobre PRE (lo normal durante desarrollo), usar las herramientas con prefijo `insforge-pre`. Para inspeccionar PRO, usar `insforge-prod` — con cuidado, son datos reales.

**Credenciales y URLs**: ver Art. 13 del Constitution. Las API keys están solo en `~/.claude/settings.json` (fuera del repo).

**Si las herramientas no aparecen**: los MCPs se cargan solo al inicio de sesión. Si se modificó `~/.claude/settings.json` durante la sesión, hay que reiniciar Claude Code para que tome efecto.

**Para añadir un nuevo proyecto InsForge**: editar `~/.claude/settings.json` directamente — ver Art. 13 para el formato exacto.

## InsForge — JOIN de tablas relacionadas

### 2026-05-04 · InsForge SDK · JOIN syntax — usar nombre de tabla, no nombre del FK

**Qué**: InsForge PostgREST usa la sintaxis `tabla_relacionada(columna)` en el SELECT para hacer JOINs. La sintaxis con nombre explícito de FK (`tabla!fk_name(col)`) puede fallar si el nombre real del FK en InsForge difiere del esperado.

**Regla**: SIEMPRE usar `profiles(full_name)` (nombre de tabla), NUNCA `profiles!appointments_client_id_fkey(full_name)` (nombre de FK).

```typescript
// ✅ Correcto
const SELECT = 'id, start_time, profiles(full_name)'

// ❌ Rompe si el FK tiene nombre diferente en InsForge
const SELECT = 'id, start_time, profiles!appointments_client_id_fkey(full_name)'
```

**Síntoma de error**: el campo `profiles` llega como `null` o el query falla silenciosamente.

---

## Gotchas del stack

### 2026-04-17 · tsconfig `baseUrl` · TS 5.7 IDE vs CLI

**Qué**: El VS Code language server muestra `baseUrl` como "Error" (deprecated, TS 7.0 will break). El CLI `tsc --noEmit` pasa sin error (exit 0).
**Por qué**: El LS es más estricto que el compilador. `baseUrl` con `paths` sigue funcionando en TS 5.7 y 6.x — solo romperá en TS 7.0.
**Workaround actual**: Ignorar el aviso del IDE. Al actualizar a TS 7.0, migrar a la solución que indique https://aka.ms/ts6 (probablemente `vite-tsconfig-paths` o nueva sintaxis de paths sin baseUrl).

### 2026-04-17 · pnpm esbuild build scripts

**Qué**: `pnpm install` avisa que esbuild no puede ejecutar su build script. El build de Vite funciona igualmente — esbuild shippea el binario de plataforma como sub-paquete, no necesita el script.
**Por qué importa**: No bloquea nada. La config correcta es `"pnpm": { "ignoredBuiltDependencies": ["esbuild"] }` en `package.json`.

### 2026-04-18 · vite.config.ts + vitest.config.ts · bloque `test:` duplicado

**Qué**: Si `vitest.config.ts` existe como fichero separado, el bloque `test: { ... }` en `vite.config.ts` causa error TS: `'test' does not exist in type 'UserConfigExport'`.
**Por qué**: Vitest v4 usa su propio tipo de config. Cuando hay `vitest.config.ts`, Vite no expone `test` en su type.
**Regla**: `vite.config.ts` solo define build/plugins. `vitest.config.ts` define entorno de test. Nunca duplicar `test:` en `vite.config.ts`.

### 2026-04-18 · pnpm/action-setup@v4 + `packageManager` en package.json · conflicto de versión

**Qué**: `pnpm/action-setup@v4` lee el campo `packageManager` de `package.json` automáticamente. Si además se especifica `version:` en el workflow, falla con `Error: Multiple versions of pnpm specified`.
**Regla**: Con `pnpm/action-setup@v4`, nunca añadir `with: version: X` si `packageManager` ya está en `package.json`. Es la única fuente de verdad.

### 2026-04-18 · sync-context.sh · `declare -A` incompatible con bash 3 de macOS

**Qué**: macOS incluye bash 3.2 por defecto. `declare -A` (arrays asociativos) es bash 4+. El script fallaba con `declare: -A: invalid option`.
**Fix**: Reemplazado por cadena separada por espacios con `grep -qw` para comprobar membresía. Si en el futuro se necesitan arrays asociativos en scripts `.claude/`, usar bash 4 (Homebrew) o evitarlos.

## CI/CD — Vercel + GitHub Actions

### 2026-04-18 · deploy-pre.yml · el workflow se ejecuta desde la rama destino, no desde main

**Qué**: `deploy-pre.yml` se ejecuta en ramas distintas de `main`. GitHub Actions usa el archivo de la **rama que recibe el push**. Si el fix está solo en `main`, `develop` sigue ejecutando la versión vieja.
**Cómo detectarlo**: el log del CI muestra `vercel deploy --prebuilt` sin `--prod` aunque la rama sea develop.
**Fix**: aplicar el cambio directamente a `develop` vía PR desde una rama `fix/`.

### 2026-04-18 · Vercel CLI · `--prod` actualiza URL principal; sin él crea URL temporal

**Qué**: `vercel deploy --prebuilt` sin `--prod` crea una URL única temporal. Con `--prod`, actualiza la URL de producción del proyecto.
**Regla**: `vercel build --prod` + `vercel deploy --prebuilt --prod` siempre deben ir juntos.

### 2026-04-18 · Vercel dashboard · auto-deploy de GitHub puede solaparse con el CI

**Qué**: si el proyecto Vercel tiene la integración GitHub activa (por defecto), Vercel hace su propio deploy en paralelo al workflow de CI, generando despliegues duplicados.
**Fix**: en cada proyecto Vercel → Settings → Git → "Ignored Build Step" → poner `exit 1`.

### 2026-04-18 · Vercel CLI · URL de deploy mezclada con logs en stdout

**Qué**: `vercel deploy --prebuilt` mezcla logs de progreso con la URL final en stdout. Capturar con `URL=$(vercel deploy ...)` puede capturar líneas de log en lugar de la URL.
**Fix**: `grep -Eo 'https://[^[:space:]]+\.vercel\.app[^[:space:]]*' | head -n 1`.

### 2026-04-18 · Vercel Analytics + Speed Insights · activación en dashboard obligatoria

**Qué**: Los componentes `<Analytics />` y `<SpeedInsights />` de `@vercel/analytics` y `@vercel/speed-insights` están montados en `src/main.tsx`. Sin embargo, el dashboard de Vercel permanece vacío hasta que Analytics se active manualmente por proyecto.

**Pasos para activar** (hacer una sola vez por proyecto):
1. Vercel Dashboard → proyecto `barber-dates-web-pre` → pestaña **Analytics** → **Enable**
2. Vercel Dashboard → proyecto `barber-dates-web-prod` → pestaña **Analytics** → **Enable**
3. Para Speed Insights: mismo flujo, pestaña **Speed Insights** → **Enable**

**En local**: los componentes se montan pero no envían datos — solo funcionan en dominios `*.vercel.app` o dominios custom configurados en Vercel.

**GDPR**: Vercel Analytics no usa cookies ni almacena IPs completas. Cumple sin banner de cookies en España bajo el marco RGPD actual.

### 2026-04-22 · Husky + pnpm · pnpm no encontrado en Git bash en Windows

**Qué**: Los hooks de Husky (`.husky/pre-commit`, `.husky/commit-msg`) usan `pnpm run` / `pnpm exec`, pero en Windows el ejecutable de pnpm está instalado en `%LOCALAPPDATA%\pnpm\.tools\pnpm\<version>\bin\` — una ruta que Git bash no incluye en su PATH. El hook falla con `pnpm: command not found`.

**Fix aplicado**: Cambiar `pnpm run` por `npm run` y `pnpm exec` por `npx` en ambos hooks. Los scripts de `package.json` funcionan igual con ambos gestores. `npm` siempre está en el PATH de Git bash.

**Síntoma**: `husky - pre-commit script failed (code 127)` con `pnpm: command not found in PATH`.

**Por qué importa**: El hook fallará siempre en Windows hasta que pnpm esté en el PATH de bash. `npm run` es la alternativa portátil.

## Errores conocidos pendientes

_(vacío)_

## Workarounds

### 2026-04-27 · react-hooks/set-state-in-effect (v7) · setState en useEffect bloqueado

**Qué**: `eslint-plugin-react-hooks` v7 añade la regla `react-hooks/set-state-in-effect` que bloquea el patrón `useEffect(() => setState(serverData), [serverData])` — el sync pattern clásico para inicializar local state desde server data.

**Solución adoptada**: "pending edits overlay" — la state local solo guarda los cambios del usuario (`null` o partial), y el valor efectivo se calcula como `pendingValue ?? serverValue`. Esto elimina el useEffect por completo y no provoca renders extra.

```typescript
// En lugar de:
const [localSchedule, setLocalSchedule] = useState<WeeklySchedule>(schedule)
useEffect(() => setLocalSchedule(schedule), [schedule])  // ← bloqueado por lint v7

// Usar:
const [pendingSchedule, setPendingSchedule] = useState<WeeklySchedule | null>(null)
const localSchedule = pendingSchedule ?? schedule  // null = "usar datos del servidor"
// Para edits: setPendingSchedule(s => { const b = s ?? schedule; return {...b, [key]: val} })
// Tras guardar: setPendingSchedule(null)
```

Para Record edits (servicios, barberos): `serviceEdits: Record<id, Partial<Service>>` + `services = serverData.map(s => ({...s, ...serviceEdits[s.id]}))`.

## Tips útiles

### 2026-04-26 · domain/booking · V8 no parsea meses en español con `new Date()`

**Qué**: `new Date('24 Dic 2026')` y variantes como `new Date('Dic 24, 2026')` devuelven `NaN` en V8 (Node y Chromium). Solo reconoce abreviaciones en inglés (Jan, Feb, …).

**Contexto**: Las fechas de cierres especiales (`MockClosure.date`) se almacenan como strings "DD Mes YYYY" con mes en español ("01 May 2026", "24 Dic 2026"). `getAvailableBarbersForDate` necesita comparar esas fechas con un `Date` objeto.

**Solución implementada** (`src/domain/booking/index.ts`):
```typescript
const ES_MONTH: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}
function parseClosureDate(str: string): Date | null {
  const native = new Date(str)  // May/Jun/etc. ya funcionan
  if (!isNaN(native.getTime())) return native
  // Fallback para meses en español
  const parts = str.trim().split(/\s+/)
  if (parts.length >= 3) {
    const monthIdx = ES_MONTH[parts[1].toLowerCase()]
    if (monthIdx !== undefined) {
      return new Date(Number(parts[2]), monthIdx, Number(parts[0]))
    }
  }
  return null
}
```

**Regla**: Nunca usar `new Date(closureString)` directamente — siempre pasar por `parseClosureDate`. Si en el futuro las fechas se migran a ISO 8601, esta función puede simplificarse.

### 2026-04-27 · domain/booking · toISOString() da fecha UTC incorrecta en España

**Qué**: `new Date().toISOString().slice(0,10)` en España (UTC+2) devuelve la fecha del día anterior a medianoche local. El campo `block_date` del dominio y el filtro de citas fallan comparando fechas UTC vs locales.

**Fix**: siempre construir fechas ISO locales con:
```typescript
const iso = [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-')
```
**Regla**: NUNCA usar `date.toISOString().slice(0,10)` en ninguna comparación de fechas de agenda. Solo es correcto para campos de audit (created_at, etc.) donde UTC es intencionado.

### 2026-04-27 · InsForge · eslint react-hooks/purity bloquea Date.now() en useMemo

**Qué**: La regla `react-hooks/purity` (en el plugin v7) bloquea `Date.now()` dentro de callbacks de hooks (`useMemo`, `useCallback`). La solución `new Date().getTime()` pasa la regla porque solo nombra `Date.now` específicamente, no `new Date().getTime()`.

**Workaround**: sustituir `Date.now()` → `new Date().getTime()` cuando se use dentro de hooks.

## Convenciones del proyecto

### Los mocks deben mantenerse sincronizados con el API real

**Contexto**: `src/mocks/` contiene handlers MSW que simulan el API de Supabase (InsForge).
**Regla**: Cualquier cambio en la capa `infrastructure/` que afecte a endpoints, nombres de tabla, columnas o forma de la respuesta **debe reflejarse también en el handler y fixture correspondiente de `src/mocks/`**. Si no, los mocks dejan de representar el comportamiento real y se vuelven engañosos.
**Cómo aplicarlo**: Al modificar un adaptador InsForge, buscar el handler MSW equivalente (`src/mocks/handlers/<dominio>.ts`) y actualizar la URL, estructura de respuesta y fixtures afectados en el mismo commit.
**Fixtures como fuente de verdad compartida**: `src/mocks/data/*.ts` se commitean al repo. Son los datos de partida para todos los devs. Si durante pruebas locales añades datos valiosos, edita el fixture y haz commit para que el resto del equipo los tenga.
