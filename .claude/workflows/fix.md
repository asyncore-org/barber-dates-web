# Workflow: Fix (bugfix) — guía por fase

---

## Fase ANÁLISIS — invocada por `/fix` y `/analyze`

**Objetivo**: reproducir el bug e identificar la causa raíz. No el síntoma.

### Qué cargar

```bash
bash .claude/scripts/art.sh 4   # reglas de negocio (si el bug es de lógica)
bash .claude/scripts/art.sh 3   # arquitectura (para entender qué capa falla)
```

Explorar con subagente si hay que rastrear código:
```
Agent({ subagent_type: "Explore", prompt: "Busca en src/ cualquier referencia a <síntoma>. < 150 palabras." })
```

### Lo que el análisis debe responder

1. ¿Se puede reproducir el bug? ¿Cómo?
2. ¿En qué capa está la causa raíz? (no en qué componente se ve el efecto)
3. ¿Hay tests que deberían haber capturado esto?
4. ¿Tiene efectos laterales arreglarlo?
5. ¿Hay otros lugares del código con el mismo problema?

### Artefactos

- `ANALYSIS.md` con causa raíz identificada.
- `QUESTIONS.md` si el síntoma no está suficientemente descrito.

### Cómo termina

Reportar diagnóstico al usuario y **PARAR**. Esperar confirmación antes de `/plan`.

---

## Fase PLAN — invocada por `/plan`

**Objetivo**: plan mínimo. Primero el test que reproduce, luego el fix.

### Pasos canónicos de un fix

1. **Test que reproduce el bug** (falla en `develop`, pasará con el fix).
2. **Fix mínimo de la causa raíz** — sin refactor colateral.
3. Verificación: el test del paso 1 ahora pasa.

> Si el fix afecta a capas múltiples: un paso por capa (mismo orden que en feature).

### Artefactos

- `PLAN.md` — máximo 4-5 pasos.
- `PROGRESS.md` — inicializado.

---

## Fase IMPLEMENTACIÓN — invocada por `/implement`

- Cambio mínimo. Sin refactor colateral.
- Si ves algo que limpiar → anotarlo en `KNOWLEDGE.md` o abrir tarea `refactor` separada.
- El test del paso 1 debe fallar antes del fix y pasar después.

---

## Fase REVIEW — invocada por `/review`

Igual que en `feature.md` + verificación específica:
- El síntoma original ya no se reproduce.
- El test nuevo pasa.
- No hay regresiones en tests existentes.

---

## Fase CIERRE — invocada por `/done`

Si el bug reveló un gotcha del stack → `/learn <insight>` antes de cerrar.
