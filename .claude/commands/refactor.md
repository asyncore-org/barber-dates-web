# Comando: /refactor

Arranca un refactor: crea rama + carpeta + análisis. Se para aquí.

## Uso

```
/refactor <slug> [qué se refactoriza]
```

## Flujo completo de un refactor

```
/refactor <slug>   → análisis: qué se toca, tests de cobertura existentes
/plan              → plan con red de seguridad (tests primero si escasos)
/implement         → refactor en pasos que mantienen el árbol verde
/review            → ¿algún cambio de comportamiento oculto?
/done              → PR
```

## Lo que debes hacer al ejecutar /refactor

1. Base: `develop` o rama actual.
2. `git checkout -b refactor/<slug>`.
3. `bash .claude/scripts/new-task.sh refactor <slug> "<descripción>"`.
4. Rellenar `README.md`:
   - Qué se refactoriza y por qué.
   - Garantía de no-cambio funcional.
5. Ejecutar `/analyze`:
   - Identificar qué tests cubren el área.
   - Si los tests son escasos → anotar que el primer paso del plan será tests de caracterización.
   - Documentar en `ANALYSIS.md`.
6. **PARAR**. Pedir confirmación antes de planificar.

**Sin commits. Sin tocar `src/`.**
