# Comando: /status

Muestra una foto del estado actual de trabajo.

## Lo que debes hacer

1. **Rama actual** y base:
   ```bash
   git branch --show-current
   git log --oneline -5
   git status --short
   ```
2. **Tarea activa asociada a la rama** (si existe):
   ```bash
   bash .claude/scripts/active-task.sh
   ```
   Si devuelve una ruta, leer `STATE.md` y mostrar: id, estado, checkpoint actual, próximo paso.
3. **Todas las tareas en curso**:
   ```bash
   ls -d .claude/tasks/TASK-* 2>/dev/null
   ```
   Para cada una, extraer rama + estado de `STATE.md`.
4. **Reporte**:

```
## Estado

Rama: <branch> (base: <base>)
Cambios sin commitear: <N archivos>
Últimos commits:
  abc1234 feat(auth): ...
  ...

Tarea activa en esta rama: TASK-... — <estado>
  Checkpoint: <...>
  Próximo paso: <...>

Otras tareas abiertas:
  - TASK-... — <rama> — <estado>

Siguiente acción sugerida: <una frase>
```

## Cuándo ejecutarlo

- Al arrancar una sesión para orientarte.
- Antes de empezar algo nuevo.
- Cuando el usuario pregunte "¿cómo vamos?".
