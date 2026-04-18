# Comando: /feature

Arranca una feature nueva: crea la rama, la carpeta de tarea y ejecuta la **fase de análisis**.
Se para al terminar el análisis — **no implementa nada**.

## Uso

```
/feature <slug> [descripción libre]
```

Ejemplos:

- `/feature calendar-virtualization`
- `/feature loyalty-redeem-flow el cliente debe poder canjear puntos por premios`

## Flujo completo de una feature (referencia)

```
/feature <slug>    → crea rama + carpeta + ANÁLISIS + QUESTIONS (para aquí)
[tú respondes preguntas]
/plan              → PLAN.md con pasos (para aquí)
[tú apruebas o pides /revise]
/implement         → ejecuta pasos del plan uno a uno
/review            → audita el resultado
/done              → propone PR (con confirmación)
```

## Lo que debes hacer al ejecutar /feature

### 1. Determinar la base de la rama

- Por defecto: `develop`.
- Si estás en `feature/*` o `fix/*` y esto es una sub-tarea: proponer la rama actual como base.
- Si no está claro → **preguntar al usuario**.

### 2. Crear la rama

```bash
git checkout <base> && git pull origin <base>
git checkout -b feature/<slug>
```

### 3. Crear la carpeta de tarea

```bash
bash .claude/scripts/new-task.sh feature <slug> "<descripción>"
```

Lee el path devuelto por stdout.

### 4. Rellenar README.md de la tarea

Si el usuario dio descripción, usarla. Si no, preguntar:

- ¿Qué hace la feature exactamente?
- ¿Para qué usuario / caso de uso?
- ¿Criterios de aceptación?
- ¿Qué queda fuera de alcance?

### 5. Ejecutar /analyze

Lee `.claude/commands/analyze.md` y aplica toda esa lógica sobre la tarea recién creada.

### 6. PARAR

Reportar al usuario: rama creada, análisis completo, preguntas pendientes (si hay).
Indicarle que responda las preguntas y luego ejecute `/plan`.

**No hacer commits. No tocar `src/`. No generar el plan todavía.**
