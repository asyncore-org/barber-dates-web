# Comando: /worktree

Crea un worktree git aislado para trabajar en paralelo en otra tarea sin afectar la rama actual.
Solo usar cuando el usuario lo pida explícitamente.

## Uso
```
/worktree <slug>   # crea worktree para feature/<slug>
```

## Lo que debes hacer

1. Verificar que hay una rama `feature/<slug>` (o similar) ya creada. Si no existe, crearla primero.
2. Crear el worktree en una carpeta hermana del repo:
   ```bash
   git worktree add ../barber-dates-web--<slug> feature/<slug>
   ```
3. Verificar que la carpeta se creó correctamente.
4. Reportar al usuario:
   ```
   Worktree creado: ../barber-dates-web--<slug>
   Rama: feature/<slug>
   
   Abre una segunda terminal en esa carpeta o una segunda ventana de Claude Code apuntando a:
   /Users/carlos/Library/Mobile Documents/com~apple~CloudDocs/Carlos/Negocios/Web citas barbería/barber-dates-web--<slug>
   
   Para limpiar el worktree cuando termines:
     git worktree remove ../barber-dates-web--<slug>
   ```

## Notas

- El worktree comparte el `.git` pero tiene su propio working directory.
- Los cambios en un worktree no afectan al otro.
- La carpeta de tarea `.claude/tasks/TASK-*` es local a cada worktree (no commiteada).
