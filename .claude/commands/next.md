# Comando: /next

Atajo para `/implement next` — ejecuta el siguiente paso pendiente del plan activo.

## Lo que debes hacer

1. Carga `PROGRESS.md` de la tarea activa:
   ```bash
   bash .claude/scripts/fetch.sh PROGRESS.md
   ```
2. Identifica el primer paso con estado `pending`.
3. Llama al flujo completo de `/implement` para ese paso.

Si no hay pasos pendientes → reportar que el plan está completo y sugerir `/review`.
Si no hay plan → avisar que primero hay que ejecutar `/plan`.
