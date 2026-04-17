# Workflow: Hotfix — guía por fase

> Base siempre: `main`. Deploy urgente a producción.

---

## Fase ANÁLISIS — invocada por `/hotfix` y `/analyze`

**Objetivo**: identificar la causa raíz rápido. Velocidad importa pero no justifica saltarse pasos.

### Qué cargar

```bash
bash .claude/scripts/art.sh 4   # si es bug de lógica de negocio
bash .claude/scripts/art.sh 3   # si es bug de arquitectura
```

### Lo que el análisis debe responder

1. ¿Cuál es la causa raíz exacta? (no el síntoma visible)
2. ¿Cuál es el cambio mínimo para arreglarlo?
3. ¿Hay riesgo de regresión en otros flujos?
4. ¿Hay que hacer algo en la DB (migración, dato corrupto)?

### Artefactos

- `ANALYSIS.md` — conciso, orientado a velocidad.

---

## Fase PLAN — invocada por `/plan`

Plan quirúrgico: máximo 3 pasos. Sin refactor, sin cleanup.

1. Test que reproduce (si el time-to-fix lo permite).
2. Fix mínimo.
3. Verificación manual en PRE.

---

## Fase IMPLEMENTACIÓN — invocada por `/implement`

- Cambio mínimo. Cero colateral.
- `/check` obligatorio antes de proponer merge.

---

## Fase CIERRE — invocada por `/done`

**Doble merge obligatorio**:

1. PR a `main` → deploy a prod.
2. Cherry-pick / merge del fix también a `develop` (o se pierde en el siguiente deploy).

El comando `/done` recuerda esto explícitamente al usuario antes de proponer el PR.

Documentar en `KNOWLEDGE.md` qué pasó, causa y cómo evitarlo.
