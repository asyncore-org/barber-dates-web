# Comando: /pause

Pausa la tarea activa: persiste el estado y avisa de cómo retomar.

## Lo que debes hacer

1. Localizar tarea activa con `bash .claude/scripts/active-task.sh`.
2. Actualizar `STATE.md`:
   - Estado → `paused`.
   - Sección "Notas para retomar" → contexto suficiente para continuar sin hacer preguntas.
3. Añadir entrada a `LOG.md`:
   ```
   ## YYYY-MM-DD HH:mm — pause
   Tarea pausada. Último checkpoint: <...>. Para retomar: /resume <TASK-ID>
   ```
4. Si hay cambios sin commitear → sugerir al usuario si quiere commitearlos antes de pausar
   (no forzar, solo sugerir).
5. Reportar:
   ```
   TASK-<id> pausada.
   Para retomar en cualquier sesión: /resume <TASK-ID>
   Estado guardado: <checkpoint actual>
   ```

## Diferencia con /block

- `/pause` → tarea lista para continuar, la paro yo voluntariamente.
- `/block` → hay algo externo que me impide avanzar.
