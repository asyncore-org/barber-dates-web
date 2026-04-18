# Knowledge — Gio Barber Shop

> Descubrimientos vivos durante el desarrollo: gotchas, workarounds, comandos útiles, errores conocidos no resueltos, tips de entorno. Se commitea. Se actualiza vía `/learn <insight>` o manualmente.

Cada entrada debe tener: **Fecha · Contexto · Qué · Por qué importa**.

---

## Entorno y arranque

_(vacío — se irá llenando)_

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

## Errores conocidos pendientes

_(vacío)_

## Workarounds

_(vacío)_

## Tips útiles

_(vacío)_

## Convenciones del proyecto

### Los mocks deben mantenerse sincronizados con el API real

**Contexto**: `src/mocks/` contiene handlers MSW que simulan el API de Supabase (InsForge).
**Regla**: Cualquier cambio en la capa `infrastructure/` que afecte a endpoints, nombres de tabla, columnas o forma de la respuesta **debe reflejarse también en el handler y fixture correspondiente de `src/mocks/`**. Si no, los mocks dejan de representar el comportamiento real y se vuelven engañosos.
**Cómo aplicarlo**: Al modificar un adaptador InsForge, buscar el handler MSW equivalente (`src/mocks/handlers/<dominio>.ts`) y actualizar la URL, estructura de respuesta y fixtures afectados en el mismo commit.
**Fixtures como fuente de verdad compartida**: `src/mocks/data/*.ts` se commitean al repo. Son los datos de partida para todos los devs. Si durante pruebas locales añades datos valiosos, edita el fixture y haz commit para que el resto del equipo los tenga.
