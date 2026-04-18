# Comando: /implement

Ejecuta uno o varios pasos del `PLAN.md` aprobado. **Única puerta de entrada al código de producción.**

## Uso

```
/implement              # siguiente paso pendiente
/implement next         # igual que el anterior
/implement 3            # paso específico
/implement 2..4         # rango de pasos
/implement all          # todos los pendientes (pide confirmación si son > 3)
```

## Precondiciones

- `PLAN.md` existe y tiene estado `approved` (o el usuario ha dicho "ok" al plan).
- No hay pasos `in-progress` sin terminar.
- Si hay `CHANGES/` con un change-request activo no implementado → avisar.

## Lo que debes hacer

### 1. Identificar el(los) paso(s) a implementar

```bash
bash .claude/scripts/fetch.sh PROGRESS.md     # ver estado general
bash .claude/scripts/plan-step.sh <N>          # ver solo el paso N
```

### 2. Para cada paso (en orden)

#### 2a. Cargar contexto del paso

- Leer solo la sección del paso en `PLAN.md`.
- Leer los Arts. del Constitution que apliquen a la capa del paso.
- Si el paso toca domain → `bash .claude/scripts/art.sh 3 && bash .claude/scripts/art.sh 4`.
- Si el paso toca infra → `bash .claude/scripts/art.sh 3`.

#### 2b. Marcar el paso como `in-progress` en PROGRESS.md

#### 2c. Implementar el paso

Usar los comandos de scaffolding si aplica:

- `/new-domain <entidad>` → tipos + reglas + test
- `/new-infra <entidad>` → adaptador InsForge
- `/new-hook <nombre>` → TanStack Query hook
- `/new-component <nombre>` → componente
- `/new-page <nombre>` → página

Seguir estrictamente las reglas arquitectónicas del Constitution (Art. 3).
**Sin `any`. Sin saltarse capas. Sin lógica de negocio en componentes.**

> **Radar de contexto**: mientras implementas, si el paso introduce algo de lo siguiente, anótalo en `LOG.md` bajo la etiqueta `[context-flag]` para que `/done` lo detecte fácilmente:
>
> - Nueva regla de negocio o cambio en una existente → Art. 4
> - Nueva tabla, campo o relación → Art. 5
> - Nueva ruta o cambio en AuthGuard → Art. 6
> - Nueva variable de entorno → Art. 13
> - Gotcha o workaround descubierto → KNOWLEDGE.md
> - Decisión arquitectónica → DECISIONS.md

#### 2d. Verificar el criterio de completado del paso

El criterio está en `PLAN.md → Paso N → Criterio de completado`.
Si no pasa el criterio → NO hacer commit, arreglar primero.

#### 2e. Commit del paso

```bash
git add <archivos del paso>
git commit -m "<type>(<scope>): <descripción>"
```

El mensaje de commit debe coincidir con el tipo y scope definidos en el paso.

#### 2f. Marcar el paso como `done` en PROGRESS.md

Registrar el hash del commit.

#### 2g. Añadir entrada a LOG.md

```
## YYYY-MM-DD HH:mm — checkpoint
Paso N completado: <título>. Commit: <hash>. Próximo: Paso N+1 — <título>
```

### 3. Pausa entre pasos (si se ejecutan múltiples)

Tras cada paso, reportar brevemente al usuario:

```
✅ Paso N completado — <título>
   Commit: <hash>
   Archivos: <N archivos, +A/-B>

Próximo: Paso N+1 — <título>
¿Continúo o prefieres revisar antes?
```

Esperar respuesta si el usuario lo indicó, o continuar si dijo "all" / "implement all".

### 4. Al terminar todos los pasos del plan

```
Implementación completa:
  Paso 1 ✅  Paso 2 ✅  Paso 3 ✅  ...

Commits realizados:
  <hash> — <mensaje>
  <hash> — <mensaje>

Siguiente: /review para auditar el resultado antes de cerrar la tarea.
```

## Regla dura

`/implement` es el **único** comando que puede crear o modificar archivos de producción (`src/`).
Fuera de `/implement`, solo se modifican archivos en `.claude/tasks/<TASK-ID>/`.
