# Comando: /change

Flujo de **corrección controlada** dentro de una tarea activa.
Se usa cuando algo implementado no es como se quería, o cuando el usuario pide ajustar algo concreto.
**Nunca toca código directamente: primero analiza, propone plan de cambio y espera /implement.**

## Uso

```
/change <descripción del ajuste>
```

Ejemplos:

- `/change el mapper de appointments no está mapeando el campo notes correctamente`
- `/change el hook useAppointments debería recibir el userId como parámetro, no leerlo del store`
- `/change cambia el color del botón de reserva a dorado (#C8A44E) en lugar de azul`

## Lo que debes hacer

### 1. Registrar el change-request

Crear `.claude/tasks/<TASK-ID>/CHANGES/CHANGE-<N>.md` (incrementar N):

```markdown
# CHANGE-N — <título> · YYYY-MM-DD HH:mm

## Qué se pide cambiar

<descripción exacta del usuario>

## Diagnóstico

<tras analizar el código: qué está mal y por qué>

## Archivos afectados

<lista de archivos que hay que tocar>

## Impacto en el plan

<si hay PLAN.md: qué pasos quedan afectados>

## Plan del cambio

### Paso C-1 — <título>

- Archivos: ...
- Qué se cambia: ...
- Criterio: ...

## Estado: draft | approved | done
```

### 2. Analizar el cambio (sin tocar código)

```bash
bash .claude/scripts/diff-task.sh --stat          # ver qué está implementado
bash .claude/scripts/files-touched.sh              # archivos en la tarea
```

Usar subagente `Explore` si hay que investigar el código en detalle:

```
Agent({
  subagent_type: "Explore",
  prompt: "En src/<path>, busca <qué>. Dime exactamente en qué líneas está el problema.
           Responde en < 150 palabras."
})
```

### 3. Detectar preguntas de aclaración

Si el cambio es ambiguo, añadir preguntas a `QUESTIONS.md` antes de proponer el plan.
No proponer plan hasta tener suficiente claridad.

### 4. Proponer el plan del cambio

Mostrar al usuario `CHANGE-N.md` completo y preguntar:

```
Change-<N> analizado:

Diagnóstico: <...>
Archivos a tocar: <N>

Plan del cambio:
  Paso C-1 — <título>
  Paso C-2 — <título>

¿Apruebas? (usa /implement para ejecutarlo)
```

### 5. PARAR aquí

**No modificar ningún archivo de `src/` hasta que el usuario apruebe y ejecute `/implement`.**
Si el usuario aprueba, el CHANGE queda en estado `approved`.
`/implement` lo detectará y ejecutará los pasos del change antes que cualquier paso nuevo del plan.

### 6. Tras implementar

El CHANGE pasa a `done`. Se añade entrada en `LOG.md`:

```
## YYYY-MM-DD HH:mm — change-done
CHANGE-N implementado: <título>. Commits: <hashes>
```

Si el CHANGE altera el PLAN original, regenerar `PLAN.md` y `PROGRESS.md` con `/revise`.
