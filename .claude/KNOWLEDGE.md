# Knowledge — Gio Barber Shop

> Descubrimientos vivos durante el desarrollo: gotchas, workarounds, comandos útiles, errores conocidos no resueltos, tips de entorno. Se commitea. Se actualiza vía `/learn <insight>` o manualmente.

Cada entrada debe tener: **Fecha · Contexto · Qué · Por qué importa**.

---

## Entorno y arranque

*(vacío — se irá llenando)*

## Gotchas del stack

### 2026-04-17 · tsconfig `baseUrl` · TS 5.7 IDE vs CLI

**Qué**: El VS Code language server muestra `baseUrl` como "Error" (deprecated, TS 7.0 will break). El CLI `tsc --noEmit` pasa sin error (exit 0).
**Por qué**: El LS es más estricto que el compilador. `baseUrl` con `paths` sigue funcionando en TS 5.7 y 6.x — solo romperá en TS 7.0.
**Workaround actual**: Ignorar el aviso del IDE. Al actualizar a TS 7.0, migrar a la solución que indique https://aka.ms/ts6 (probablemente `vite-tsconfig-paths` o nueva sintaxis de paths sin baseUrl).

### 2026-04-17 · pnpm esbuild build scripts

**Qué**: `pnpm install` avisa que esbuild no puede ejecutar su build script. El build de Vite funciona igualmente — esbuild shippea el binario de plataforma como sub-paquete, no necesita el script.
**Por qué importa**: No bloquea nada. La config correcta es `"pnpm": { "ignoredBuiltDependencies": ["esbuild"] }` en `package.json`.

## Errores conocidos pendientes

*(vacío)*

## Workarounds

*(vacío)*

## Tips útiles

*(vacío)*
