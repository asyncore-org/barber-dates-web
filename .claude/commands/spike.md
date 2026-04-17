# Comando: /spike

Arranca una exploración/prototipo: rama + carpeta + clarificación de la pregunta. Se para aquí.

## Uso
```
/spike <slug> [pregunta a responder]
```

## Flujo completo de un spike

```
/spike <slug>      → clarifica pregunta + time-box + criterios de éxito (para aquí)
[tú confirmas]
/implement         → exploración libre (código no-mergeable)
[al terminar: documenta respuesta en README.md]
/done              → cierra sin PR (la rama se archiva)
```

## Lo que debes hacer al ejecutar /spike

1. `git checkout -b spike/<slug>` (base: `develop` o rama actual).
2. `bash .claude/scripts/new-task.sh spike <slug> "<pregunta>"`.
3. Rellenar `README.md`:
   - **Pregunta concreta** (una sola).
   - **Time-box** propuesto (default: 2h).
   - **Criterios de éxito**.
4. Análisis mínimo: ¿qué necesitamos explorar? ¿hay documentación relevante? Anotar en `ANALYSIS.md`.
5. **PARAR**. Confirmar con el usuario antes de explorar.

**Aviso**: el código del spike NO se mergea. Al terminar se documenta la respuesta y se decide si abrir una tarea real.
