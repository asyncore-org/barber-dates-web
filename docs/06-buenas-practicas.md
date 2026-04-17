# 06 — Buenas Prácticas, Errores Comunes y FAQ

---

## Cómo ahorrar tokens

El coste de Claude es proporcional a los tokens que entran en su contexto. Estos son los hábitos que más ayudan:

### 1. Scripts de fetch parcial siempre

En lugar de pedir "lee el Constitution", pedir explícitamente qué artículo. En lugar de "dame el plan", pedir el paso concreto. Los scripts están diseñados para esto.

```bash
# ❌ Caro: Claude lee 250 líneas
Read ".claude/CONSTITUTION.md"

# ✅ Barato: Claude lee 15 líneas + ~25 del artículo
bash .claude/scripts/constitution-index.sh
bash .claude/scripts/art.sh 3
```

### 2. `/ask` para preguntas puntuales

Si quieres saber algo sobre el proyecto sin lanzar una tarea completa, usa `/ask`. Carga solo lo mínimo necesario.

```
/ask ¿cuántos puntos da cada visita?
/ask ¿qué rol necesita la ruta /admin/settings?
```

### 3. Subagentes para exploración

Cuando hay que explorar mucho código (buscar todos los archivos de appointments, auditar un módulo completo), Claude lanza un subagente `Explore` que hace la búsqueda en su propio contexto — sin inflar el contexto principal de la conversación.

### 4. `/compact-task` cuando el log crece

Si una tarea lleva muchos días y el `LOG.md` supera ~50 entradas, ejecuta `/compact-task`. El resumen de 30 líneas es mucho más barato de cargar que el log completo.

### 5. Empezar con `/status`

En lugar de explicar el contexto desde cero al iniciar una sesión, `/status` carga lo esencial en pocas líneas.

### 6. No repetir lo que Claude ya sabe en la sesión

Si en la misma sesión Claude ya cargó el Constitution Art. 4, no hace falta pedírselo de nuevo. El contexto de la sesión persiste mientras la conversación esté abierta.

---

## Estrategia Git

### Ramas

| Rama | Base | Destino del PR |
|------|------|----------------|
| `feature/<slug>` | `develop` | `develop` |
| `fix/<slug>` | `develop` | `develop` |
| `refactor/<slug>` | `develop` | `develop` |
| `chore/<slug>` | `develop` | `develop` |
| `hotfix/<slug>` | `main` ⚠️ | `main` + cherry-pick a `develop` |
| `spike/<slug>` | `develop` | No se mergea |
| Sub-tarea | Rama padre | Rama padre |

### Commits

**Formato obligatorio** (Husky + Commitlint lo valida):
```
<tipo>(<scope>): <descripción en inglés, presente imperativo>
```

**Tipos**: `feat` `fix` `refactor` `perf` `test` `docs` `chore` `ci` `style`

**Scopes**: `auth` `calendar` `appointments` `loyalty` `admin` `layout` `domain` `infrastructure` `hooks` `deps` `ci` `seo`

```bash
# Correcto
feat(auth): add Google OAuth login
fix(calendar): correct slot overlap calculation
chore(deps): update TanStack Query to v5.1
test(domain): add canCancelAppointment edge cases

# Rechazado por commitlint
"arregle el bug"
"cambios varios"
"WIP"
```

**Tamaño**: un commit por cambio lógico coherente. El árbol debe compilar y los tests pasar tras cada commit. Ni trivialidades, ni megacommits de toda la feature.

### Operaciones prohibidas (bloqueadas en settings.json)

```bash
git push --force    # bloqueado
git push -f         # bloqueado
git reset --hard    # bloqueado
rm -rf              # bloqueado
git commit --no-verify  # bloqueado (nunca saltarse commitlint)
git push origin main    # bloqueado (usar PR siempre)
git branch -D           # bloqueado
```

---

## Flujo de correcciones con /change

### Cuándo usar /change vs otras opciones

| Situación | Qué usar |
|-----------|----------|
| Un paso del plan no quedó bien | `/change <descripción>` dentro de la misma tarea |
| El plan entero está mal orientado | `/revise <qué>` para regenerar el plan |
| Bug independiente de la feature | `/fix <slug>` en nueva rama |
| Ajuste de < 3 líneas obvio | Puedes decírselo directamente, aunque /change sigue siendo mejor |

### El flujo exacto de /change

```
Tú: /change el hook no está leyendo el userId correctamente

Claude:
  1. Analiza el código afectado (sin tocar nada)
  2. Crea CHANGES/CHANGE-001.md con:
     - Qué se pidió cambiar
     - Diagnóstico de por qué está mal
     - Archivos afectados
     - Plan de corrección (pasos numerados)
  3. Te lo muestra y PARA

Tú: "ok" (o "cambia el paso 1...")

Tú: /implement
  → Claude ejecuta los pasos del CHANGE
  → Commit(s) con mensaje descriptivo
  → CHANGE marcado como "done"
```

### Lo que garantiza

- Nunca modifica código sin que hayas visto el diagnóstico y el plan.
- Documenta exactamente qué cambió y por qué en `CHANGES/CHANGE-N.md`.
- Si el CHANGE afecta al plan original, propone regenerarlo con `/revise`.

---

## Ejemplos completos de flujos reales

### Ejemplo A: Feature completa (sistema de fidelización)

```
# SESIÓN 1

/feature loyalty-system sistema completo de puntos de fidelización

# Claude analiza ~5 min y para con preguntas:
# Q-1: ¿Los puntos se otorgan al marcar 'completed' o al final del día?
# Q-2: ¿Puede haber múltiples premios activos a la vez?
# Q-3: ¿Los puntos caducan?

# Tú respondes:
# Q-1: Al marcar 'completed', instantáneamente
# Q-2: Sí, múltiples premios activos
# Q-3: No caducan

/plan
# Claude propone 5 pasos (domain → infra → hooks → components → integración)
# Tú: "el paso 4 dividirlo en dos: LoyaltyCard y RewardsList por separado"

/revise el paso 4 divídelo en: paso 4a LoyaltyCard y paso 4b RewardsList

# Claude: "Plan v2 generado. ¿Apruebas?"
# Tú: "ok"

/implement
# Paso 1: domain types + rules + tests → commit feat(domain): add loyalty rules and types
# Claude para: "Paso 1 completado. ¿Continúo?"
# Tú: "sí"

/next
# Paso 2: infrastructure → commit feat(infrastructure): add loyalty InsForge adapters
# Claude para

/next
# Paso 3: hooks → commit feat(hooks): add useLoyaltyCard and useRewards

# Fin de sesión 1 — lo dejas aquí
/pause


# SESIÓN 2 (al día siguiente)

/resume
# Claude: "TASK loyalty-system. Pasos 1-3 done. Próximo: Paso 4a — LoyaltyCard component. ¿Continúo?"
# Tú: "sí"

/next   # Paso 4a
/next   # Paso 4b
/next   # Paso 5 — integración en AppointmentsPage

# Algo en el paso 5 no te gusta
/change el badge de puntos debería mostrarse en el header, no en la lista de citas

# Claude analiza, crea CHANGE-001.md, para
# Tú: "ok"
/implement   # aplica el change

/review
# Agente: ✅ sin violaciones de arquitectura
# Tests: ✅ 31 passed
# Criterios: 5/5 ✅

/done
# Context sync: "Art. 4 desactualizado — propongo añadir regla 8 sobre puntos de fidelización"
# Tú: "sí"
# Claude actualiza Constitution + propone PR
# Tú: "sí al PR"
# → gh pr create
```

---

### Ejemplo B: Hotfix urgente

```
# El cliente llama: la app crashea al reservar citas en móvil desde esta mañana

/hotfix booking-crash app crashea al reservar en móvil

# Claude: rama hotfix/booking-crash desde MAIN
# Análisis: identifica que el cambio de ayer rompió la validación de slots en móvil

/plan
# Plan: 1 test que reproduce + 1 fix + verificación manual

/implement
# Test que reproduce → commit test(calendar): add regression test for mobile slot validation
# Fix → commit fix(calendar): handle viewport-dependent slot calculation

/review  # todo pasa

/done
# Claude: "¿Procedo con PR a main? RECORDATORIO: hacer cherry-pick del fix a develop"
# Tú: "sí"
# PR a main → deploy a prod en minutos
# Cherry-pick a develop → sin regresión en el siguiente deploy

/learn el bug de slots en móvil fue causado por usar window.innerWidth directamente — usar CSS breakpoints o ResizeObserver
```

---

### Ejemplo C: Spike de investigación

```
/spike ssr-feasibility ¿merece la pena añadir SSR parcial para la landing?

# Claude: rama spike/ssr-feasibility
# Análisis: qué hay que investigar, time-box 2h, criterios de éxito definidos

/implement
# Exploración libre: prototipar SSR con vite-plugin-ssr, medir métricas, leer docs

# Al terminar, Claude escribe en README.md:
# Respuesta: No en este momento.
# Evidencia: La landing es estática, sin datos dinámicos. vite-plugin-prerender
#            (ya en el plan) cubre el caso de uso con menos complejidad.
# Recomendación: Seguir con vite-plugin-prerender como está planificado.

/done
# No abre PR. Rama spike/ssr-feasibility queda archivada.
# La respuesta queda documentada para futuras consultas.
```

---

## Errores comunes y cómo evitarlos

### ❌ Pedir implementación directamente

**Incorrecto**:
```
implementa el sistema de citas completo
```

**Correcto**:
```
/feature appointment-system sistema de gestión de citas
```

**Por qué**: sin análisis, Claude toma decisiones arbitrarias de arquitectura. Sin plan, imposible retomar si se interrumpe y sin trazabilidad de decisiones.

---

### ❌ Pedir correcciones sin /change

**Incorrecto**:
```
no, ese hook no está bien, hazlo de otra manera
```

**Correcto**:
```
/change el hook useAppointments debería recibir userId como parámetro, no leerlo del store
```

**Por qué**: la corrección directa no queda documentada, Claude puede malinterpretar el alcance, y no hay plan aprobado.

---

### ❌ Ignorar las preguntas de /analyze

Si Claude genera preguntas y tú simplemente dices "sigue adelante", asumirá defaults que pueden no ser lo que quieres.

**Regla**: responde cada pregunta. Si una te da igual: "Q-2: me da igual, elige tú el criterio que más sentido tenga."

---

### ❌ No hacer /pause antes de cerrar

Si cierras Claude Code abruptamente, `STATE.md` puede quedar con información de sesiones anteriores. El hook `Stop` intenta persistir el estado, pero es mejor ser explícito.

---

### ❌ Modificar el Constitution sin actualizar el índice

Si editas `CONSTITUTION.md` directamente y no actualizas `CONSTITUTION-INDEX.md`, Claude puede cargar el artículo equivocado creyendo que cubre algo diferente.

**Protocolo al tocar el Constitution directamente**:
1. Bump de versión en la cabecera.
2. Actualizar `CONSTITUTION-INDEX.md` si cambió el scope de algún artículo.
3. Entrada en `DECISIONS.md` explicando el cambio.

---

### ❌ Asumir que Claude sabe lo que hiciste fuera de la sesión

Si editaste un archivo directamente, ejecutaste comandos en tu terminal, o creaste una rama a mano, Claude no lo sabe. Díselo explícitamente al inicio de la sesión o usa `/status` para que vea el estado actual.

---

### ❌ Usar /implement sin plan aprobado

`/implement` busca un `PLAN.md` aprobado en la tarea activa. Si no existe, se negará a ejecutar.

Si quieres hacer un cambio pequeño y rápido sin plan formal, usa `/change <desc>` que tiene su propio flujo simplificado.

---

## FAQ

**¿Puedo usar Claude sin estos comandos para tareas simples?**

Sí. Para preguntas usa `/ask`. Para cambios de 1-2 líneas triviales puedes decírselos directamente. El sistema está diseñado para tareas no triviales — no hay que burocratizar lo simple.

---

**¿Cuántas tareas puedo tener abiertas al mismo tiempo?**

Las que quieras. Cada una está en su propia rama y carpeta. `/status` las lista todas. Usa `git checkout <otra-rama>` para cambiar y `/resume` para retomar. Para trabajo verdaderamente paralelo, usa `/worktree <slug>`.

---

**¿Qué pasa si el Constitution se queda desactualizado?**

Los mecanismos de protección son tres:
1. Hook `context-watch.sh` — avisa cuando se editan archivos sensibles.
2. `/sync-context` en `/done` — obligatorio antes de cada PR.
3. El propio análisis inicial — Claude lee el Constitution al arrancar cada tarea.

Si sospechas que está desactualizado en cualquier momento: `/sync-context`.

---

**¿Puedo añadir nuevos comandos al sistema?**

Sí. Crea un archivo en `.claude/commands/<nombre>.md` siguiendo el formato de los existentes. Claude lo reconocerá como `/<nombre>` automáticamente.

---

**¿Puedo modificar el Constitution directamente sin pasar por Claude?**

Sí, eres el dueño del proyecto. Recuerda: bump de versión, actualizar el índice si hace falta, entrada en `DECISIONS.md`.

---

**¿Qué pasa si Claude propone un cambio al Constitution que no quiero?**

Dices "no". Claude lo anota en el `LOG.md` de la tarea como cambio considerado y rechazado, para que quede trazabilidad.

---

**¿Los scripts de fetch parcial son solo para Claude o los puedo usar yo también?**

Los puedes usar tú directamente desde la terminal. Son útiles para inspeccionar el estado de una tarea, ver qué artículo dice el Constitution sobre algo, o revisar el diff de la rama.

```bash
bash .claude/scripts/art.sh 4          # leer las reglas de negocio
bash .claude/scripts/diff-task.sh --stat  # ver cuánto has cambiado
bash .claude/scripts/files-touched.sh     # qué archivos has tocado
```

---

**¿Cómo sé qué versión del Constitution estoy usando?**

La cabecera de `CONSTITUTION.md` siempre tiene la versión actual:
```markdown
Versión: 1.0.0 · Última revisión: 2026-04-17
```

---

**¿Qué es el `_TEMPLATE/` en la carpeta de tareas?**

Es la plantilla base que `new-task.sh` usa para crear nuevas tareas. Si quieres cambiar la estructura de las carpetas de tarea (añadir un campo a `README.md`, por ejemplo), edita los archivos en `_TEMPLATE/`. Las tareas existentes no se actualizan, solo las nuevas.

---

*Fin de la documentación. Para cualquier duda sobre el sistema, usa `/ask` en Claude Code o consulta directamente los archivos de `.claude/`.*
