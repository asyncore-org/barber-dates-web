# Comando: /handoff

Genera un documento de contexto completo para retomar la tarea en otra máquina o sesión sin contexto previo. Útil cuando sabes que vas a parar y retomar más tarde.

## Lo que debes hacer

1. Localizar tarea activa.
2. Recopilar datos:
   - `git log --oneline <base>..HEAD`
   - `git diff --stat <base>..HEAD`
   - `git status --short`
   - Contenido resumido de `README.md`, `STATE.md`, `DECISIONS.md`.
3. Escribir/actualizar `handoff.md` de la tarea con el contenido del template pero **relleno**:

````markdown
# HANDOFF — TASK-<id>

## Resumen ejecutivo

<5 líneas: qué es, dónde va, qué queda>

## Estado git

- Rama: <branch>
- Base: <base>
- Commits desde base: N
  - abc1234 feat(...): ...
- Diff: X archivos, +A/-B líneas
- Cambios sin commitear: <sí/no + resumen>

## Próximo paso concreto

<copiar STATE.md → Próximo paso, ampliar si hace falta>

## Contexto imprescindible

- Archivos clave: <top 5 de files.md>
- Decisiones tomadas: <referencia>
- Gotchas: <referencia a KNOWLEDGE.md o notas aquí>

## Comandos útiles para arrancar

```bash
git checkout <branch>
git log --oneline <base>..HEAD
# /resume <TASK-ID>
```
````

```

4. Hacer `git status` final. Sugerir al usuario si quiere commitear el estado antes del handoff (para que el trabajo esté persistido en la rama).
5. Confirmar al usuario:
```

Handoff generado: .claude/tasks/<TASK-ID>/handoff.md
Para retomar en otro lado: clonar repo, checkout <branch>, abrir Claude Code y ejecutar /resume <TASK-ID>

```

```
