# Comando: /done

Cierra una tarea: review + quality gates + **sincronización de contexto** + propuesta de PR.

## Lo que debes hacer

### 1. Identificar la tarea activa

```bash
bash .claude/scripts/active-task.sh
```

### 2. Review de arquitectura y calidad

Lanzar subagente de review siguiendo `.claude/workflows/review.md`.

### 3. Quality gates

```bash
pnpm run type-check
pnpm run lint
pnpm run test:run
```

Si alguno falla → arreglar antes de continuar.

### 4. Verificar criterios de aceptación

Leer `README.md` de la tarea. Comprobar cada criterio uno a uno. Si alguno no está cumplido → volver al desarrollo.

### 5. ⚡ Sincronización de contexto (obligatoria)

Este paso asegura que los archivos de contexto reflejan la realidad del código que acaba de entrar.

```bash
bash .claude/scripts/sync-context.sh
```

El script lista qué artículos del Constitution podrían haber quedado desactualizados según los archivos tocados.

Para cada artículo señalado:

```bash
bash .claude/scripts/art.sh <N>
```

Comparar el artículo con lo implementado. Si hay desviación:

- **Regla de negocio nueva/cambiada** → proponer actualización de Art. 4 al usuario.
- **Nueva ruta o flujo de auth** → proponer actualización de Art. 6.
- **Nueva tabla o campo** → proponer actualización de Art. 5.
- **Nueva variable de entorno** → proponer actualización de Art. 13.
- **Workaround o gotcha descubierto** → `/learn <insight>` (va a KNOWLEDGE.md).
- **Decisión arquitectónica nueva** → proponer nuevo ADR en DECISIONS.md.
- **Cambio en el Constitution-INDEX** (nuevo art., renombre) → actualizar CONSTITUTION-INDEX.md.

**Formato para proponer cambios al usuario:**

```
[sync-context] Art. 4 posiblemente desactualizado:

Actual en Constitution:
  <contenido del artículo>

Propongo añadir/cambiar:
  <qué cambiaría, por qué>

¿Apruebas?
```

Nunca tocar CONSTITUTION.md sin confirmación explícita (Art. 14).

### 6. Actualizar estado de la tarea

- `STATE.md` → status `done`.
- `LOG.md` → entrada `done` con timestamp y resumen.

### 7. Propuesta de cierre

Solo cuando los pasos 2–5 están completos:

```
TASK-<id> lista para cerrar:

✅ Review agent — sin bloqueos
✅ Quality gates — type-check + lint + tests
✅ Criterios — N/N
✅ Context sync — <artículos actualizados o "sin cambios">

Cambios en esta rama:
  <bash .claude/scripts/diff-task.sh --stat>

Commits:
  <git log --oneline base..HEAD>

PR propuesto:
  Título: <tipo>(<scope>): <descripción>
  Body:
    ## Summary
    - <punto 1>
    - <punto 2>

    ## Test plan
    - [ ] <criterio 1>
    - [ ] <criterio 2>

¿Procedo con push + apertura de PR?
```

### 8. Esperar confirmación

No hacer `git push` ni `gh pr create` sin confirmación explícita del usuario.

## Si algo bloquea

| Bloqueo                                | Acción                                              |
| -------------------------------------- | --------------------------------------------------- |
| Review agent reporta ❌                | Arreglar antes de continuar                         |
| Quality gate falla                     | Arreglar antes de continuar                         |
| Criterio no cumplido                   | Volver al desarrollo                                |
| Usuario rechaza cambio de Constitution | No aplicarlo — anotar en LOG.md por qué se descartó |
