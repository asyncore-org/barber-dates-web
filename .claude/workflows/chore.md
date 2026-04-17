# Workflow: Chore — guía por fase

---

## Fase ANÁLISIS — invocada por `/chore` y `/analyze`

**Objetivo**: dimensionar el impacto del cambio de mantenimiento.

### Para dep updates

```bash
npm outdated   # ver qué hay disponible
```

Clasificar cada dep:
- **patch/minor**: bajo riesgo, pocas preguntas.
- **major**: leer breaking changes, generar preguntas para el usuario.

### Para config changes

Identificar qué archivos se ven afectados y si hay impacto en CI/CD.

### Artefactos

- `ANALYSIS.md` con impacto documentado.
- `QUESTIONS.md` para decisiones sobre major deps.

---

## Fase PLAN — invocada por `/plan`

Un paso por cambio independiente. Orden: más riesgoso primero (falla rápido).

---

## Fase IMPLEMENTACIÓN — invocada por `/implement`

- `/check` tras cada cambio (especialmente dep updates).
- Si una dep rompe algo → PARAR, documentar en `KNOWLEDGE.md`, pedir decisión al usuario.

---

## Fase CIERRE — invocada por `/done`

PR con body que resuma qué se actualizó y por qué.
