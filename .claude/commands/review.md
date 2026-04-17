# Comando: /review

Audita el trabajo implementado antes de cerrar la tarea.
Lanza un subagente independiente que evalúa el diff contra el Constitution y el PLAN.

## Cuándo usarlo

- Tras completar todos los pasos de `/implement`.
- Antes de ejecutar `/done`.
- En cualquier momento si quieres un chequeo intermedio.

## Lo que debes hacer

### 1. Recopilar contexto del diff

```bash
bash .claude/scripts/diff-task.sh --stat     # resumen de cambios
bash .claude/scripts/files-touched.sh        # archivos tocados
```

### 2. Lanzar subagente de review

```
Agent({
  subagent_type: "Explore",
  prompt: "Audita el diff de la rama actual contra develop (o main si es hotfix).

  Contexto del proyecto: barber-dates-web usa Clean Architecture React (domain → infrastructure → hooks → components/pages). Reglas de Constitution en .claude/CONSTITUTION.md.

  Archivos modificados: <lista de files-touched.sh>

  Evalúa:
  1. Violaciones de arquitectura: ¿alguna capa importa de otra que no debería?
     (pages/components importando de infrastructure/ es prohibido)
  2. Reglas de negocio en componentes (deben estar en src/domain/).
  3. Uso de 'any' en TypeScript.
  4. Funciones de domain/ que no tienen test.
  5. TanStack Query hooks sin queryKeys correctos.
  6. Formularios sin validación Zod.
  7. Loading/error states omitidos en UI nueva.

  Reporta: ✅ Cumple | ⚠️ Revisar | ❌ Bloquea
  Para cada hallazgo: file_path:line_number
  Responde en < 300 palabras."
})
```

### 3. Ejecutar quality gates

```bash
npm run type-check
npm run lint
npm run test -- --run
```

### 4. Verificar criterios de aceptación

Leer `PLAN.md` → Criterios de aceptación globales. Comprobar uno a uno.

### 5. Escribir REVIEW.md

```markdown
# REVIEW — TASK-<ID> · YYYY-MM-DD HH:mm

## Resultado del agente de review

<output resumido del subagente>

## Quality gates

- TypeScript: ✅/❌
- ESLint: ✅/❌ (N errores)
- Tests: ✅/❌ (N passed, M failed)

## Criterios de aceptación

- [x] criterio 1
- [ ] criterio 2 — PENDIENTE

## Veredicto: APROBADO | BLOQUEADO

Motivo: <...>
```

### 6. Reportar al usuario

Si todo pasa → sugerir `/done`.
Si hay bloqueos → listarlos y esperar corrección antes de continuar.
