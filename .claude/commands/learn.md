# Comando: /learn

Captura un aprendizaje reutilizable en `.claude/KNOWLEDGE.md`. Se usa cuando durante el desarrollo descubres algo que:

- Podría ahorrarle tiempo a otro desarrollador (o a ti mismo en otra sesión).
- Es un gotcha del stack.
- Es un comando/workaround que no era obvio.
- Es un error conocido que aún no se corrige.

## Uso

```
/learn <insight libre>
```

Ejemplos:

- `/learn InsForge no soporta .rpc() con array args — hay que usar .sql() directo`
- `/learn pnpm run dev a veces no hot-reloada si el workspace está en iCloud — reiniciar vite`

## Lo que debes hacer

1. Leer `.claude/KNOWLEDGE.md` para ver la estructura actual.
2. Identificar la sección donde encaja el insight:
   - **Entorno y arranque** — problemas de setup, variables, herramientas.
   - **Gotchas del stack** — comportamientos inesperados de libs.
   - **Errores conocidos pendientes** — bugs que no se corrigen aún.
   - **Workarounds** — soluciones temporales hasta que se arregle X.
   - **Tips útiles** — comandos, trucos productivos.
     Si no encaja en ninguna, crear una sección nueva.
3. Añadir la entrada con el formato:

```markdown
### YYYY-MM-DD — <título corto>

**Contexto**: <dónde/cuándo aparece>
**Qué**: <descripción clara>
**Por qué importa**: <consecuencia práctica>
<opcional> **Workaround/solución**: <pasos concretos>
```

4. Si el aprendizaje es suficientemente estructural, proponer al usuario promoverlo a un ADR en `.claude/DECISIONS.md`.
5. Confirmar al usuario con la ruta + sección donde se guardó.
