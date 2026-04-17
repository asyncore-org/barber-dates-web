# Comando: /plan

Genera o regenera `PLAN.md` con pasos numerados y criterios por paso.
Solo se ejecuta después de que `ANALYSIS.md` y `QUESTIONS.md` estén completos/respondidos.

## Precondiciones

- Debe existir tarea activa con `ANALYSIS.md` relleno.
- Todas las preguntas críticas de `QUESTIONS.md` deben estar respondidas.
  Si no: listar las pendientes y PARAR.

## Lo que debes hacer

### 1. Cargar contexto mínimo

```bash
bash .claude/scripts/fetch.sh ANALYSIS.md
bash .claude/scripts/fetch.sh QUESTIONS.md
bash .claude/scripts/fetch.sh README.md
```

Solo leer los Artículos del Constitution que apliquen a las capas identificadas en el ANALYSIS.

### 2. Redactar PLAN.md

Escribe `.claude/tasks/<TASK-ID>/PLAN.md` con:

```markdown
## Resumen del plan
<2-3 frases>

## Pasos

### Paso 1 — <título>
- Capa(s): ...
- Archivos nuevos: ...
- Archivos modificados: ...
- Comando(s) de scaffolding: /new-domain X / /new-infra X / etc.
- Criterio de completado: <qué se verifica para marcar como done>
- Estado: pending
```

**Criterios de un buen plan:**
- Cada paso = 1 commit coherente (no demasiado pequeño, no demasiado grande).
- Orden: domain → infrastructure → hooks → components → pages (de adentro hacia afuera).
- Si un paso puede fallar de forma independiente, se separa en dos.
- Cada paso tiene un criterio de completado verificable.

### 3. Inicializar PROGRESS.md

Copia la tabla de pasos de `PLAN.md` a `PROGRESS.md` con todos los pasos en `pending`.

### 4. Reportar al usuario

```
Plan v1 generado para TASK-<id>:

Paso 1 — <título>  (domain, ~1 commit)
Paso 2 — <título>  (infrastructure, ~1 commit)
Paso 3 — <título>  (hooks + components, ~2 commits)
...

Total: N pasos · estimado M commits

¿Apruebas el plan o quieres ajustar algo? (usa /revise <qué cambiar>)
```

### 5. PARAR aquí

Esperar respuesta del usuario. **No implementar nada.**
Si el usuario dice "ok" o "aprobado" → indicarle que use `/implement` para comenzar.
