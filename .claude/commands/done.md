# Comando: /done

Cierra una tarea: review + quality gates + **sincronización de contexto** + propuesta de PR.

## Lo que debes hacer

### 1. Identificar la tarea activa

```bash
bash .claude/scripts/active-task.sh
```

### 1b. Gate: verificar que /test pasó

Antes de continuar, comprobar que existe `TEST.md` con veredicto `PASS`:

```bash
bash .claude/scripts/fetch.sh TEST.md
```

| Situación | Acción |
|-----------|--------|
| `TEST.md` existe y veredicto es `PASS` | Continuar |
| `TEST.md` existe y veredicto es `FAIL` | **PARAR** — comunicar al usuario: *"TEST.md reporta FAIL. Corrige los fallos con /change antes de cerrar."* |
| `TEST.md` no existe | **PARAR** — comunicar: *"Ejecuta /test antes de /done para verificar los flujos visualmente."* |

No continuar hasta que este gate esté en verde.

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

### 6b. Determinar la rama destino y mergear

**REGLA DURA**: La rama destino es siempre `develop`. La única excepción es `hotfix/*`, que apunta a `main`.

```bash
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == hotfix/* ]]; then
  BASE="main"
else
  BASE="develop"
fi
git fetch origin
git merge origin/$BASE
```

**NUNCA uses `main` como base excepto en `hotfix/*`.** Si el script de detección de PR existente devuelve `main` como base, ignóralo y usa `develop` igualmente (salvo que sea hotfix).

Si hay conflictos → resolverlos y hacer commit antes de continuar. No proponer la PR con conflictos sin resolver.

### 6c. Verificar estado de PR existente

Comprobar si ya existe una PR para esta rama antes de proponer crear una nueva:

```bash
gh pr list --head $(git branch --show-current) --state all --json number,state,title
```

Según el resultado:

- **Sin resultados** → proceder al paso 7 normalmente con `gh pr create`.
- **PR OPEN** → no crear nueva; comunicar al usuario: `"La PR #N ya está abierta y lista para merge."` No proponer `gh pr create`.
- **PR MERGED o CLOSED** → informar al usuario del estado y preguntar: `"La PR #N ya fue mergeada/cerrada. ¿Quieres abrir una PR nueva para esta iteración?"`

### 7. Propuesta de cierre

Solo cuando los pasos 2–5 están completos:

```
TASK-<id> lista para cerrar:

✅ /test — PASS (X/X flujos)
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

La PR **siempre** se crea con `--base develop` (o `--base main` si es rama `hotfix/*`). Nunca omitir el flag `--base`.

### 8. Esperar confirmación

No hacer `git push` ni `gh pr create` sin confirmación explícita del usuario.

## Si algo bloquea

| Bloqueo                                | Acción                                              |
| -------------------------------------- | --------------------------------------------------- |
| Review agent reporta ❌                | Arreglar antes de continuar                         |
| Quality gate falla                     | Arreglar antes de continuar                         |
| Criterio no cumplido                   | Volver al desarrollo                                |
| Usuario rechaza cambio de Constitution | No aplicarlo — anotar en LOG.md por qué se descartó |
