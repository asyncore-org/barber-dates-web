# HANDOFF — TASK-<ID>

> Documento generado por `/handoff` para retomar la tarea en otra máquina o sesión sin contexto previo.

---

## Resumen ejecutivo

<Qué es, en qué va, qué queda. 5 líneas máx.>

## Estado git

- Rama: `<tipo>/<slug>`
- Commits hechos en esta rama: <lista resumida>
- Diff vs base: <N archivos, +A/-B>
- Cambios sin commitear: <sí/no + resumen>

## Próximo paso concreto

<Acción exacta que debe ejecutar el siguiente Claude. Copiar de `STATE.md` y ampliar si hace falta>

## Contexto imprescindible

- Archivos clave tocados: <lista>
- Decisiones tomadas: <referencia a DECISIONS.md>
- Gotchas descubiertos: <referencia a KNOWLEDGE.md o notas aquí>

## Comandos útiles para arrancar

```bash
git checkout <tipo>/<slug>
git log --oneline <base>..HEAD
# /resume <TASK-ID>  ← dentro de Claude Code para cargar contexto
```
