# 07 — Consistency Checks del Sistema Agéntico

---

## Objetivo

Evitar drift entre lo que el sistema dice y lo que ejecuta realmente.

En particular, este chequeo protege contra:

- Reintroducir comandos legacy de quality gates con `npm run` en comandos/workflows/docs.
- Olvidar los comandos canónicos de Art. 14 (`pnpm run type-check`, `pnpm run lint`, `pnpm run test:run`) en archivos operativos clave.
- Perder scripts críticos en `package.json`.

---

## Script

Ruta:

```bash
.claude/scripts/validate-consistency.sh
```

Ejecución directa:

```bash
bash .claude/scripts/validate-consistency.sh
```

Si todo está correcto, devuelve exit code `0` y muestra `Result: OK`.
Si detecta drift, devuelve exit code `1` y lista los hallazgos.

---

## Qué valida

### 1) Drift de comandos legacy

Busca patrones `npm run type-check|lint|test -- --run` en:

- `.claude/commands/`
- `.claude/workflows/`
- `docs/`
- `CLAUDE.md`
- `.github/copilot-instructions.md`

### 2) Comandos canónicos obligatorios

Valida que existan las 3 líneas canónicas en:

- `.claude/commands/check.md`
- `.claude/commands/review.md`
- `.claude/commands/done.md`
- `.claude/workflows/review.md`
- `.claude/CONSTITUTION.md`

### 3) Scripts en package.json

Valida que `package.json` tenga:

- `scripts.type-check`
- `scripts.lint`
- `scripts.test:run`

---

## Integración en el flujo

El comando `/check` ya debe ejecutar:

```bash
pnpm run type-check
pnpm run lint
pnpm run test:run
bash .claude/scripts/validate-consistency.sh
```

Recomendación operativa:

- Ejecutarlo antes de `/review` si tocaste `.claude/`, `docs/` o `CLAUDE.md`.
- Ejecutarlo siempre antes de `/done` en tareas de infraestructura del sistema agéntico.

---

## Qué hacer si falla

1. Corrige primero los hallazgos de comandos legacy (`npm run ...`).
2. Asegura presencia de las 3 líneas canónicas en archivos operativos.
3. Si falta un script en `package.json`, restáuralo o ajusta la política de Art. 14 con aprobación explícita.

---

## Nota de diseño

El chequeo está pensado para ser estricto en archivos operativos y flexible en registros históricos (por ejemplo ADRs que describen cambios pasados).
