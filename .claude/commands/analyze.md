# Comando: /analyze

Ejecuta la **fase de análisis** de la tarea activa (o la arranca si se llama sin tarea previa).
Se puede rellamar en cualquier momento para re-analizar con nueva información.

## Cuándo se usa

- Automáticamente al ejecutar `/feature`, `/fix`, `/refactor`, etc.
- Manualmente cuando quieres profundizar el análisis antes de planificar.
- Cuando el usuario aporta nueva información que invalida el análisis previo.

## Lo que debes hacer

### 1. Cargar contexto mínimo necesario (ahorro de tokens)

**Primero: leer el índice** (~15 líneas) para saber qué artículos son relevantes. No toques CONSTITUTION.md completo.

```bash
bash .claude/scripts/constitution-index.sh
```

Luego cargar SOLO los artículos que aplican a esta tarea concreta:

```bash
bash .claude/scripts/art.sh 3   # Arquitectura — casi siempre
bash .claude/scripts/art.sh 4   # si toca domain/ (reglas de negocio)
bash .claude/scripts/art.sh 5   # si toca DB / InsForge
# El índice te dice exactamente cuándo cargar cada uno
```

### 2. Explorar el código relevante

Usa subagente `Explore` para no cargar el contexto principal:

```
Agent({
  subagent_type: "Explore",
  prompt: "En el repo barber-dates-web/, busca todos los archivos relacionados con <tema>.
           Dime qué archivos existen, qué exportan y qué dependencias tienen entre sí.
           Responde en < 200 palabras."
})
```

### 3. Escribir ANALYSIS.md

Rellena `.claude/tasks/<TASK-ID>/ANALYSIS.md` con:

- Capas afectadas (marca solo las que aplican).
- Archivos relevantes encontrados.
- Artículos del Constitution que aplican.
- Dependencias y riesgos.
- Restricciones descubiertas.
- **Conclusión**: qué hay que hacer, sin detalles de implementación.

### 4. Generar preguntas (QUESTIONS.md)

Si hay ambigüedades que el usuario debe resolver antes de planificar, escríbelas en `QUESTIONS.md`.

Formato de cada pregunta:

```
### Q-N — <título>
**Contexto**: por qué es necesario saber esto
**Pregunta**: lo que se necesita decidir
**Opciones**: A) ... | B) ... | C) libre
**Impacto**: qué cambia en el plan según la respuesta
```

### 5. Reportar al usuario

```
Análisis completado para TASK-<id>:

**Capas**: domain · infrastructure · hooks  (las que aplican)
**Archivos relevantes**: N encontrados
**Riesgos**: <si hay>

QUESTIONS.md — <N> preguntas en espera de respuesta:
  Q-1: <título>
  Q-2: <título>

Cuando respondas las preguntas, ejecuta /plan para generar el plan de implementación.
```

### 6. PARAR aquí

**No escribir código de producción. No crear archivos fuera de la carpeta de la tarea.**
La implementación empieza solo tras `/plan` aprobado + `/implement`.
