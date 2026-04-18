# Workflow: Refactor — guía por fase

---

## Fase ANÁLISIS — invocada por `/refactor` y `/analyze`

**Objetivo**: entender qué se toca y si hay red de seguridad (tests) suficiente.

### Qué cargar

```bash
bash .claude/scripts/art.sh 3   # arquitectura — siempre en refactors
```

### Lo que el análisis debe responder

1. ¿Qué archivos se refactorizan? ¿Cuántos?
2. ¿Hay tests que cubran el comportamiento actual del área?
   - Si no hay: el primer paso del plan será añadir tests de caracterización.
3. ¿El refactor cruza capas? Si sí, ¿está justificado?
4. ¿Hay consumidores externos del código que se refactoriza?

### Artefactos

- `ANALYSIS.md`.
- `QUESTIONS.md` si hay decisiones de diseño que tomar.

---

## Fase PLAN — invocada por `/plan`

### Pasos canónicos de un refactor

0. **(Si tests escasos)** Tests de caracterización — capturan comportamiento actual.
1. Refactor del núcleo (capa más interna primero).
2. Actualizar consumidores si la interfaz cambió.
3. Cleanup: eliminar código muerto/duplicado.

> Cada paso debe dejar el árbol compilando y los tests en verde.

---

## Fase IMPLEMENTACIÓN — invocada por `/implement`

- Commits por cambio lógico small.
- `pnpm run test:run` debe pasar tras cada commit.
- Si aparece un cambio de comportamiento → PARAR y avisar al usuario.

---

## Fase REVIEW — invocada por `/review`

Pregunta central para el agente de review: **¿hay algún cambio de comportamiento oculto?**
Comparar inputs/outputs de funciones antes y después si es posible.
