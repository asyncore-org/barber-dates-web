# 03 — El Flujo de Desarrollo

---

## El ciclo completo

Todo desarrollo no trivial sigue este ciclo. Los comandos son los puntos de control donde tú intervenes.

```
╔══════════════════════════════════════════════════════════════════╗
║  ARRANQUE                                                        ║
║                                                                  ║
║  Tú: /feature <slug> [descripción]                               ║
║      (o /fix, /refactor, /chore, /hotfix, /spike)               ║
║                                                                  ║
║  Claude hace:                                                    ║
║    1. Lee constitution-index (15 líneas)                         ║
║    2. Carga solo los artículos relevantes con art.sh             ║
║    3. Crea rama git (desde develop o rama actual)                ║
║    4. Crea carpeta .claude/tasks/TASK-YYYYMMDD-HHmm-.../        ║
║    5. Investiga el código con subagente Explore                  ║
║    6. Escribe ANALYSIS.md con diagnóstico                        ║
║    7. Escribe QUESTIONS.md con preguntas                         ║
║    8. PARA — te muestra las preguntas                            ║
╚══════════════════════════════════════════════╦═══════════════════╝
                                               │
                             ┌─────────────────▼─────────────────┐
                             │  TÚ respondes las preguntas        │
                             │  (o dices "me da igual, elige tú") │
                             └─────────────────┬─────────────────┘
                                               │
╔══════════════════════════════════════════════▼═══════════════════╗
║  PLAN                                                            ║
║                                                                  ║
║  Tú: /plan                                                       ║
║                                                                  ║
║  Claude hace:                                                    ║
║    1. Lee ANALYSIS.md + QUESTIONS.md (respuestas incluidas)      ║
║    2. Genera PLAN.md con pasos numerados                         ║
║       - Cada paso = 1 commit coherente                           ║
║       - Orden: domain → infra → hooks → components → pages      ║
║       - Criterio de completado por paso                          ║
║    3. Inicializa PROGRESS.md (todos en "pending")                ║
║    4. PARA — te muestra el plan completo                         ║
╚══════════════════════════════════════════════╦═══════════════════╝
                                               │
                   ┌───────────────────────────┤
                   │                           │
     ┌─────────────▼──────────┐    ┌──────────▼──────────────────┐
     │  Tú: /revise <qué>     │    │  Tú: "ok" / "aprobado"      │
     │                        │    └──────────┬──────────────────┘
     │  Claude: ajusta PLAN.md│               │
     │  nueva versión (v2...) │               │
     │  PARA de nuevo         │               │
     └─────────────┬──────────┘               │
                   └───────────────────────────┘
                                               │
╔══════════════════════════════════════════════▼═══════════════════╗
║  IMPLEMENTACIÓN                                                  ║
║                                                                  ║
║  Tú: /implement  (o /next, /implement 3, /implement 2..4)        ║
║                                                                  ║
║  Claude hace por cada paso:                                      ║
║    1. Lee solo plan-step.sh N (no todo el PLAN.md)               ║
║    2. Carga art.sh relevantes para esa capa                      ║
║    3. Implementa el paso (scaffolding + código)                  ║
║    4. Verifica criterio de completado                            ║
║    5. git add + git commit (un commit por paso)                  ║
║    6. Actualiza PROGRESS.md → paso "done"                        ║
║    7. Añade entrada en LOG.md                                    ║
║    8. PARA — reporta y pregunta si continúas                     ║
║                                                                  ║
║  Hooks activos mientras trabaja:                                 ║
║    - log-file-change.sh → actualiza files.md automáticamente     ║
║    - context-watch.sh → avisa si toca archivo sensible           ║
║    - type-check → TypeScript en tiempo real tras cada .ts edit   ║
╚══════════════════════════════════════════════╦═══════════════════╝
                                               │
                        ┌──────────────────────┤
                        │                      │
          ┌─────────────▼──────────┐           │
          │  Algo no quedó bien    │           │ Todo bien
          │                        │           │
          │  Tú: /change <desc>    │           │
          │                        │           │
          │  Claude:               │           │
          │  1. Analiza el cambio  │           │
          │  2. Crea CHANGE-N.md   │           │
          │  3. Plan de corrección │           │
          │  4. PARA               │           │
          │                        │           │
          │  Tú: "ok" → /implement │           │
          └─────────────┬──────────┘           │
                        └──────────────────────┘
                                               │
╔══════════════════════════════════════════════▼═══════════════════╗
║  REVIEW                                                          ║
║                                                                  ║
║  Tú: /review                                                     ║
║                                                                  ║
║  Claude hace:                                                    ║
║    1. Lanza subagente independiente (no tiene el contexto tuyo)  ║
║       que audita el diff contra las reglas del Constitution      ║
║    2. npm run type-check + lint + test                           ║
║    3. Verifica criterios de aceptación del README.md             ║
║    4. Escribe REVIEW.md con veredicto                            ║
║    5. Reporta: APROBADO o BLOQUEADO (con qué hay que arreglar)   ║
╚══════════════════════════════════════════════╦═══════════════════╝
                                               │
╔══════════════════════════════════════════════▼═══════════════════╗
║  CIERRE                                                          ║
║                                                                  ║
║  Tú: /done                                                       ║
║                                                                  ║
║  Claude hace:                                                    ║
║    1. sync-context.sh → detecta archivos de contexto obsoletos   ║
║    2. Lee artículos afectados y compara con lo implementado      ║
║    3. Te propone actualizaciones al Constitution (si las hay)    ║
║    4. Con tu OK: actualiza Constitution + KNOWLEDGE + DECISIONS  ║
║    5. Actualiza STATE.md → done. Añade entrada en LOG.md         ║
║    6. Te propone título + body del PR                            ║
║    7. PARA — espera tu confirmación                              ║
║    8. Con tu OK: git push + gh pr create                         ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Por qué cada fase es obligatoria

| Si saltas... | Consecuencia |
|--------------|-------------|
| `/analyze` | Claude no sabe qué archivos existen, toma decisiones arquitectónicas a ciegas |
| `/plan` | Sin contrato escrito, imposible retomar si se interrumpe. Claude improvisa |
| `/implement` | No existe — es la puerta obligatoria al código. Sin ella no hay código |
| `/review` | Los errores de capas (components importando de infrastructure) son silenciosos |
| Context sync en `/done` | Constitution desactualizado → siguiente tarea trabaja con info falsa |

---

## Variaciones del flujo

### Feature con sub-tarea

A veces mientras haces una feature descubres que necesitas hacer algo más pequeño primero (un tipo de dominio que falta, un adaptador que no existe). Puedes arrancar una sub-tarea desde la rama actual:

```
# Estás en feature/loyalty-system
/feature loyalty-points-domain sub-tarea: tipos y reglas de puntos
# Claude pregunta: "¿base develop o rama actual?"
# Dices: "rama actual"
# → crea feature/loyalty-points-domain desde feature/loyalty-system
# Al cerrar → PR a feature/loyalty-system, no a develop
```

### Hotfix — flujo diferente

```
/hotfix booking-broken descripción del bug en prod

# Claude: rama hotfix/* desde MAIN (no develop)
/plan    # plan quirúrgico, máximo 3 pasos
/implement
/review
/done
# Claude te recuerda SIEMPRE: "hay que hacer cherry-pick a develop"
```

### Spike — sin merge

```
/spike tanstack-virtual-appointments ¿TanStack Virtual mejora el rendimiento de la lista de citas?
# Claude crea rama spike/*, define time-box y criterios de éxito
# Tú exploras sin restricciones de calidad
/implement   # exploración libre
# Al terminar: documentas la respuesta en README.md de la tarea
/done        # NO abre PR. La rama se archiva.
```

### Pausa y retoma

```
# Fin del día, tarea a medias
/pause
# Guarda STATE.md con checkpoint y próximo paso

# Al día siguiente
/status       # foto del estado
/resume       # Claude lee README+STATE+LOG y pregunta si continúa
/next         # siguiente paso
```
