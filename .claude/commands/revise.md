# Comando: /revise

Ajusta el plan en base a feedback del usuario y genera una nueva versión de `PLAN.md`.
Úsalo cuando el plan inicial no encaja con lo que quieres.

## Uso

```
/revise <qué cambiar>
```

Ejemplos:

- `/revise el paso 2 y 3 júntalos en uno solo`
- `/revise antes del paso 1 añade un paso 0 que cree los tipos Zod en domain`
- `/revise descarta el paso de loyalty, eso lo hacemos en otra tarea`

## Lo que debes hacer

### 1. Cargar contexto mínimo

```bash
bash .claude/scripts/fetch.sh PLAN.md
bash .claude/scripts/fetch.sh ANALYSIS.md
```

### 2. Procesar el cambio

Analiza el cambio pedido y su impacto en el resto del plan:

- ¿Rompe algún paso que depende del que se cambia?
- ¿Genera inconsistencias con el ANALYSIS?
- ¿Viola alguna regla del Constitution? (si hay duda: `bash .claude/scripts/art.sh N`)

### 3. Actualizar PLAN.md

- Incrementa la versión del plan (`v1 → v2`, etc.).
- Aplica el cambio + propaga efectos en el resto de pasos.
- Actualiza el campo `*Versión N regenerada: YYYY-MM-DD HH:mm*`.

### 4. Actualizar PROGRESS.md

Reinicializar la tabla si los pasos cambiaron de número.

### 5. Añadir entrada `revise` a LOG.md

```
## YYYY-MM-DD HH:mm — revise
Plan actualizado a v<N>. Cambio: <lo que el usuario pidió>
```

### 6. Reportar al usuario

Mostrar los cambios aplicados (diff del plan), la nueva versión completa y preguntar:

```
Plan v<N> generado. Cambios aplicados:
  Paso 2 y 3 → fusionados en nuevo Paso 2
  Paso 4 → renumerado a Paso 3

¿Apruebas o quieres más ajustes?
```

### 7. PARAR aquí — No implementar nada.
