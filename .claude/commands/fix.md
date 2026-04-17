# Comando: /fix

Arranca un bugfix: crea rama + carpeta + análisis inicial. Se para aquí.

## Uso
```
/fix <slug> [síntoma observable]
```

## Flujo completo de un fix

```
/fix <slug>        → crea rama + carpeta + ANÁLISIS (para aquí)
[tú confirmas reproducción o aportas más datos]
/plan              → plan de corrección
/implement         → arreglo mínimo
/review            → verifica que el síntoma desaparece
/done              → PR
```

## Lo que debes hacer al ejecutar /fix

1. Base: `develop` (o rama actual si es sub-tarea).
2. `git checkout -b fix/<slug>`.
3. `bash .claude/scripts/new-task.sh fix <slug> "<síntoma>"`.
4. Rellenar `README.md` con síntoma, pasos para reproducir, comportamiento esperado vs actual.
5. Ejecutar `/analyze`:
   - Intentar reproducir el bug.
   - Identificar causa raíz (no el síntoma).
   - Anotar en `ANALYSIS.md`.
   - Generar preguntas si el síntoma no está suficientemente descrito.
6. **PARAR**. Pedir al usuario que confirme el diagnóstico o aporte más datos.

**Sin commits. Sin tocar `src/`.**
