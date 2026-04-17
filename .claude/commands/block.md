# Comando: /block

Marca la tarea activa como bloqueada con un motivo.

## Uso
```
/block <motivo corto>
```

## Lo que debes hacer

1. Localizar tarea activa: `bash .claude/scripts/active-task.sh`.
2. Si no hay tarea activa, avisar al usuario.
3. Actualizar `STATE.md`:
   - Cambiar estado a `blocked`.
   - Rellenar sección "Bloqueos" con el motivo + qué se necesita para desbloquear.
4. Añadir entrada `block` a `LOG.md` con timestamp y motivo.
5. Confirmar al usuario:
   ```
   TASK-<id> marcada como bloqueada.
   Motivo: <...>
   Desbloqueo necesario: <...>
   ```

## Nota

Una tarea bloqueada sigue activa — `/status` la lista. Para desbloquear, el usuario indica que se ha resuelto y se vuelve a `active`.
