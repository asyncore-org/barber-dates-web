# Comando: /chore

Arranca una tarea de mantenimiento: rama + carpeta + análisis del alcance.

## Uso

```
/chore <slug> [qué se hace]
```

## Flujo completo de un chore

```
/chore <slug>      → análisis de impacto (breaking changes, compatibilidad)
/plan              → qué se toca y en qué orden
/implement         → cambios + /check tras cada uno
/done              → PR
```

## Lo que debes hacer al ejecutar /chore

1. `git checkout -b chore/<slug>` (base: `develop`).
2. `bash .claude/scripts/new-task.sh chore <slug> "<descripción>"`.
3. Rellenar `README.md` con alcance exacto.
4. Análisis mínimo:
   - Si es dep update: `npm outdated`, identificar major/minor/patch.
   - Si es major → anotar breaking changes en `ANALYSIS.md` y generar preguntas.
   - Si es config → anotar qué archivos afecta.
5. **PARAR** si hay decisiones que el usuario debe tomar (especialmente en major deps).

**Sin commits. Sin tocar nada todavía.**
