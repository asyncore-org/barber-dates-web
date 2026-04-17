# Comando: /resume

Retoma una tarea activa en una sesión nueva sin perder contexto.

## Uso

```
/resume              # retoma la tarea asociada a la rama actual
/resume <TASK-ID>    # retoma la tarea especificada (y hace checkout de su rama)
```

## Lo que debes hacer

1. **Localizar la tarea**:
   - Sin argumento: `bash .claude/scripts/active-task.sh`.
   - Con `<TASK-ID>`: `ls -d .claude/tasks/<TASK-ID>*` y hacer `git checkout` de su rama.
2. **Leer estos archivos de la carpeta de la tarea** (en orden):
   - `README.md` → contrato.
   - `STATE.md` → estado actual + próximo paso.
   - `LOG.md` → las últimas ~10 entradas.
   - `DECISIONS.md` → decisiones locales.
   - `files.md` → archivos tocados.
3. **Verificar git**:
   ```bash
   git status --short
   git log --oneline <base>..HEAD
   ```
4. **Verificar que no hay deriva**: si `files.md` menciona archivos que ya no existen o cambios perdidos, avisar al usuario.
5. **Añadir entrada `resume` a `LOG.md`** con timestamp.
6. **Actualizar `STATE.md`** si ha pasado tiempo o el estado ha cambiado.
7. **Resumen al usuario**:

```
## Retomando TASK-<id>

Contrato: <1 línea del README>
Estado: <active | paused | ...>
Último checkpoint: <STATE.md>
Próximo paso: <STATE.md>

Cambios sin commitear: <sí/no>
Commits en esta rama: <N desde base>

¿Continúo con el próximo paso?
```

8. **Esperar confirmación** antes de ejecutar el próximo paso.
