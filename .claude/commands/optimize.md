# Comando: /optimize

Arranca un flujo completo de optimización: crea rama + carpeta + análisis especializado por scope.
Se para al terminar el análisis — **no implementa nada hasta que el usuario apruebe el plan**.

## Uso

```
/optimize [scope]
```

Sin scope → analiza todo (bundle + queries + accessibility + seo + renders).  
Con scope → foco en esa área concreta.

**Scopes disponibles**:

| Scope | Qué analiza | Herramientas |
|---|---|---|
| `bundle` | Tamaño de chunks, tree-shaking, imports dinámicos | `pnpm run analyze`, revisión de `import()` lazy |
| `queries` | N+1, paginación, campos innecesarios, índices | Revisión de `infrastructure/` adapters InsForge |
| `accessibility` | aria labels, keyboard nav, focus management, contraste | Revisión estática de componentes |
| `seo` | SeoHead por página, robots.txt, llms.txt, prerenderizado | Revisión de `pages/` y `public/` |
| `renders` | Re-renders innecesarios, memo, useMemo, useCallback | Revisión de hooks y componentes |
| *(sin args)* | Todos los anteriores | Suma de todas las herramientas |

## Flujo completo de una optimización

```
/optimize [scope]  → crea rama + carpeta + ANÁLISIS especializado (para aquí)
[tú revisas los hallazgos y prioridades]
/plan              → PLAN.md con optimizaciones priorizadas (para aquí)
[tú apruebas o pides /revise]
/implement         → ejecuta las optimizaciones paso a paso
/review            → audita que no hay regresiones
/test              → verifica en browser que todo funciona
/done              → propone PR (con confirmación)
[Si algo falla: /change <qué> → nuevo ciclo implement → review → test]
```

## Lo que debes hacer al ejecutar /optimize

### 1. Determinar el scope

- Si el usuario no especificó scope → scope = `all` (analiza todo).
- Si especificó uno o varios → foco en esos.

### 2. Crear la rama y carpeta de tarea

```bash
git checkout develop && git pull origin develop
git checkout -b refactor/optimize-<scope>
bash .claude/scripts/new-task.sh refactor "optimize-<scope>" "Optimización: <scope>"
```

Si scope = all → slug `optimize-all`, descripción `"Optimización general: bundle, queries, a11y, seo, renders"`.

### 3. Ejecutar el análisis especializado por scope

Lee `.claude/workflows/optimize.md` y aplica la sección correspondiente al scope pedido.

El análisis debe:
- Usar las herramientas descritas en el workflow para cada scope.
- Identificar problemas concretos con archivo + línea siempre que sea posible.
- Estimar impacto (alto / medio / bajo) y esfuerzo (pequeño / medio / grande).

### 4. Generar el reporte priorizado

Formato del reporte:

```
## Hallazgos de optimización — <scope> (<fecha>)

### 🔴 Crítico (impacto alto / esfuerzo bajo — hacer primero)
- [BUN-01] chunk `vendor` (1.2 MB sin gzip) — separar react-pdf con import() dinámico → estimado -400 KB
- [QRY-01] `getAppointments` carga todos los registros sin paginar — añadir `.range()` InsForge

### 🟡 Mejora (impacto medio o esfuerzo medio)
- [RND-01] `<CalendarGrid>` re-renderiza en cada keystroke del buscador — memo o debounce
- [SEO-01] Página `/barber/:id` no tiene meta description dinámica

### 🟢 Nice-to-have (bajo impacto o alto esfuerzo)
- [A11Y-01] Botón de cancelar cita sin aria-label explícito

## Recomendación
[Breve párrafo: qué atacar primero y por qué]
```

Guardar el reporte en `ANALYSIS.md` de la tarea.

### 5. PARAR

Presentar el reporte al usuario. Indicarle que si aprueba los hallazgos, ejecute `/plan` para priorizar y planificar las implementaciones.

**No implementar nada todavía. No tocar `src/`.**

## Notas

- El código de cada hallazgo usa prefijo de scope: `BUN`, `QRY`, `A11Y`, `SEO`, `RND`.
- La rama es `refactor/` porque el objetivo es mejorar sin cambiar comportamiento observable.
  Excepción: si una optimización añade funcionalidad (ej. paginación), la rama puede ser `feature/`.
- En el `/plan` subsiguiente, cada hallazgo 🔴 debe ser un paso del plan; los 🟡 se agrupan o priorizan según el usuario.
