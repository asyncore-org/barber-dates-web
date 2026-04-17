# Comando: /check

Ejecuta todos los quality gates del proyecto y reporta el estado.

## Lo que debes hacer

Ejecuta estos comandos en secuencia y reporta el resultado de cada uno:

```bash
pnpm run type-check
pnpm run lint
pnpm run test:run
bash .claude/scripts/validate-consistency.sh
```

Formato del reporte:

```
✅ TypeScript — sin errores
❌ ESLint — 3 errores en src/components/calendar/MonthCalendar.tsx
✅ Tests — 12 passed, 0 failed
✅ Consistency — sin drift de quality gates ni reglas operativas
```

Si hay errores, muéstralos completos y ofrécete a solucionarlos.

## Cuándo ejecutarlo

- Antes de hacer un commit
- Después de una refactorización grande
- Cuando el usuario pida verificar el estado del proyecto
- Antes de empezar una nueva fase de desarrollo

## Notas

- Si el proyecto aún no tiene `package.json` (Fase 0), indicar que primero hay que hacer el scaffold
- Si hay errores de TypeScript, priorizar solucionarlos antes que los de ESLint
- Los tests de `src/domain/` son los más importantes: funciones puras sin mocks
