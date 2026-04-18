# Workflow: Review — guía por fase

> Invocado por `/review`. Aplica a todos los tipos de tarea (feature, fix, refactor, chore, hotfix).

---

## Fase REVIEW

**Objetivo**: auditar el diff de forma independiente antes de cerrar.

### 1. Cargar contexto mínimo del diff

```bash
bash .claude/scripts/diff-task.sh --stat       # resumen: N archivos, +A/-B
bash .claude/scripts/files-touched.sh          # lista de archivos modificados
bash .claude/scripts/fetch.sh PLAN.md          # criterios de aceptación
```

### 2. Lanzar subagente de review independiente

El subagente no debe tener el contexto de la conversación actual — evalúa el código con ojos frescos.

```
Agent({
  subagent_type: "Explore",
  description: "Review de arquitectura y calidad",
  prompt: "Audita el diff de la rama actual contra <base> en el repo barber-dates-web.

  Contexto del proyecto:
  - Clean Architecture React: domain/ puro → infrastructure/ → hooks/ → components/pages/
  - Reglas en .claude/CONSTITUTION.md
  - Backend InsForge (tipo Supabase): mapper snake_case↔camelCase en infrastructure/

  Archivos modificados: <output de files-touched.sh>

  Evalúa (para cada hallazgo: file_path:line_number):
  1. Violaciones de capas: ¿components/ o pages/ importan de infrastructure/?
  2. Reglas de negocio en componentes (deben estar en domain/).
  3. TypeScript: uso de 'any', tipado incompleto.
  4. Funciones puras en domain/ sin test unitario.
  5. TanStack Query: queryKeys malformadas o ausentes.
  6. Formularios sin validación Zod.
  7. UI nueva sin loading/error state.
  8. InsForge calls fuera de infrastructure/ (domain/ u hooks/ que llaman directo a InsForge).

  Formato:
  ✅ Sin problemas | ⚠️ Revisar (no bloquea) | ❌ Bloquea
  Máximo 300 palabras."
})
```

### 3. Quality gates

```bash
pnpm run type-check
pnpm run lint
pnpm run test:run
```

### 4. Verificar criterios de aceptación

Leer `PLAN.md` sección "Criterios de aceptación globales". Marcar cada uno:

- ✅ Implementado y verificable.
- ❌ No implementado → volver a desarrollo.

### 5. Escribir REVIEW.md en la tarea

```markdown
# REVIEW · YYYY-MM-DD HH:mm

## Agente de review

<output resumido>

## Quality gates

- TypeScript: ✅/❌
- ESLint: ✅/❌ (detalles si falla)
- Tests: ✅/❌ (N passed / M failed)

## Criterios de aceptación

- [x] criterio 1
- [ ] criterio 2 — PENDIENTE: <detalle>

## Veredicto: APROBADO | BLOQUEADO

<motivo si bloqueado>
```

### 6. Reportar al usuario

**Si APROBADO**: sugerir `/done`.

**Si BLOQUEADO**: listar exactamente qué falla + qué hace falta para desbloquearlo.
Esperar que el usuario corrija (con `/change` si es un ajuste, o directamente con `/implement`) y vuelva a `/review`.
