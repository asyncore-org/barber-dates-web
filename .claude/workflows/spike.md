# Workflow: Spike — guía por fase

---

## Fase ANÁLISIS — invocada por `/spike` y `/analyze`

**Objetivo**: clarificar la pregunta a investigar y el criterio de éxito. Muy corto.

### Lo que hay que fijar antes de explorar

1. **Una sola pregunta** (reformular si son varias).
2. **Time-box** acordado (default: 2h).
3. **Criterio de éxito**: cuándo el spike es concluyente.
4. **Qué no forma parte de la exploración** (evita scope creep).

### Artefactos

- `ANALYSIS.md` — qué se sabe, qué se desconoce, recursos relevantes.
- `QUESTIONS.md` si el usuario no ha especificado el time-box o los criterios.

---

## Fase IMPLEMENTACIÓN — invocada por `/implement`

En un spike, `/implement` significa "exploración libre":

- El código puede ser sucio, sin tests, con `any` — es un prototipo.
- Lo importante es responder la pregunta.
- Usar subagente `Explore` si la exploración es mayoritariamente investigación.
- Anotar hallazgos en `LOG.md` en tiempo real.

---

## Fase CIERRE — invocada por `/done`

En un spike, `/done` no abre un PR. En su lugar:

1. Escribir la respuesta definitiva en `README.md` de la tarea:
   - Respuesta (sí/no/depende).
   - Evidencia.
   - Recomendación.
2. Si el hallazgo es reutilizable → `/learn`.
3. Si hay que implementarlo bien → crear nueva tarea `feature`.
4. La rama `spike/*` se conserva archivada, no se mergea.

---

## Fase REVIEW

No aplica en spikes. El criterio de éxito es la respuesta a la pregunta, no la calidad del código.
