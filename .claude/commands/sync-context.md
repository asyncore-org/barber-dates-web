# Comando: /sync-context

Revisa si algún archivo de contexto del sistema agéntico ha quedado desactualizado tras los cambios de la tarea activa.

**Se ejecuta automáticamente dentro de `/done`. También se puede invocar manualmente en cualquier momento.**

## Cuándo usarlo manualmente

- Después de un `/implement` grande antes de continuar con el siguiente paso.
- Cuando tienes dudas de si el Constitution refleja la realidad actual del código.
- Cuando el usuario dice "actualiza lo que haga falta".

## Lo que debes hacer

### 1. Detectar artículos posiblemente afectados

```bash
bash .claude/scripts/sync-context.sh
```

El script analiza `files.md` de la tarea activa y cruza los paths tocados contra un mapa de "qué archivos afectan a qué artículos del Constitution".

### 2. Verificar cada artículo señalado

Para cada Art. que el script liste:

```bash
bash .claude/scripts/art.sh <N>
```

Comparar el contenido del artículo con la realidad actual del código implementado.

### 3. Detectar desviaciones

Para cada artículo verificado, evaluar:

| Tipo de desviación | Acción |
|--------------------|--------|
| El artículo ya no refleja lo implementado (ej. nueva regla de negocio, nueva ruta, nueva tabla) | Proponer actualización al usuario |
| Se descubrió un workaround o gotcha durante la implementación | `/learn <insight>` → KNOWLEDGE.md |
| Se tomó una decisión arquitectónica nueva | Proponer ADR nuevo en DECISIONS.md |
| Cambio en el Constitution-INDEX (nuevo artículo, renombre) | Actualizar CONSTITUTION-INDEX.md |

### 4. Proponer cambios al usuario

Para cada artículo que necesite actualización:

```
Artículo X desactualizado:

Actual:
  <contenido actual del artículo>

Propuesta de cambio:
  <qué cambiaría y por qué>

¿Apruebas esta actualización del Constitution?
```

**Nunca modificar el Constitution sin confirmación explícita del usuario** (regla del Art. 14).

### 5. Aplicar cambios aprobados

Editar directamente la sección correspondiente de `CONSTITUTION.md`.
Actualizar también `CONSTITUTION-INDEX.md` si cambió algún artículo.
Bump de versión en la cabecera del Constitution.
Añadir entrada en `DECISIONS.md` global si el cambio es relevante.

### 6. Reportar al usuario

```
Context sync completado:
  ✅ Art. 3 — sin cambios
  ✅ Art. 6 — sin cambios
  📝 Art. 4 — actualizado: añadida regla 8 sobre <X>
  📝 KNOWLEDGE.md — añadida nota sobre <Y>
  ✅ DECISIONS.md — sin cambios nuevos
```
