# Comando: /compact-task

Genera un resumen ejecutivo de la tarea cuando `LOG.md` ha crecido mucho.
Útil para limpiar el contexto antes de retomar o cuando el log tiene > 30 entradas.

## Lo que debes hacer

1. Lee la tarea activa:
   ```bash
   bash .claude/scripts/fetch.sh LOG.md
   bash .claude/scripts/fetch.sh STATE.md
   bash .claude/scripts/fetch.sh PROGRESS.md
   ```
2. Genera un resumen de máximo **30 líneas** que incluya:
   - Qué se ha hecho hasta ahora (puntos clave del log).
   - Decisiones tomadas (referencia a DECISIONS.md si hay entradas).
   - Último checkpoint.
   - Próximo paso.
   - Bloqueos actuales (si hay).
3. Guarda el resumen al inicio de `LOG.md` bajo un nuevo heading:
   ```markdown
   ## RESUMEN EJECUTIVO (compactado YYYY-MM-DD HH:mm)
   <resumen de 30 líneas>
   ---
   ## LOG (desde el inicio)
   <el log original completo sigue aquí>
   ```
4. Actualiza `STATE.md` → sección "Notas para retomar" con el mismo resumen.
5. Reportar: "Log compactado. El resumen tiene N líneas."

## Cuándo usarlo

- Cuando LOG.md supera ~50 entradas.
- Antes de `/resume` para no cargar todo el historial.
- Cuando sientes que el contexto de la sesión se está llenando.
