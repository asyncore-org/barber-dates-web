# STATE — TASK-<ID>

> Estado vivo de la tarea. Se reescribe con cada checkpoint relevante.
> Para el histórico append-only, ver `LOG.md`.

---

## Estado actual

**<active | paused | blocked | done>** — YYYY-MM-DD HH:mm

## Checkpoint actual

<Una frase: en qué punto exacto del desarrollo estamos. Ej: "Domain terminado con tests, empezando infrastructure".>

## Próximo paso

<Una acción concreta y ejecutable. Ej: "Crear src/infrastructure/insforge/appointments.ts con mapper y CRUD básico">

## Archivos en curso

<Archivos que están siendo editados en este momento, si procede.>

## Bloqueos

<Si status=blocked, detallar motivo y qué se necesita para desbloquear.>

## Notas para retomar en otra sesión

<Contexto que un Claude nuevo necesita para continuar sin hacer preguntas redundantes.>
