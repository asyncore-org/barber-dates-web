# Comando: /hotfix

Arranca un hotfix urgente a prod (base: `main`). Análisis rápido y PARAR.

## Uso
```
/hotfix <slug> [síntoma en prod]
```

## Flujo completo de un hotfix

```
/hotfix <slug>     → rama desde main + diagnóstico rápido
/plan              → plan quirúrgico (mínimo cambio)
/implement         → fix + /check obligatorio
/review            → verifica que el síntoma desaparece en PRE
/done              → PR a main + recordatorio de cherry-pick a develop
```

## Lo que debes hacer al ejecutar /hotfix

1. `git checkout main && git pull`.
2. `git checkout -b hotfix/<slug>`.
3. `bash .claude/scripts/new-task.sh hotfix <slug> "<síntoma>"`.
4. Rellenar `README.md`:
   - Impacto en prod (qué está roto, desde cuándo, a quién afecta).
   - Severidad.
   - Diagnóstico inicial si se sabe.
5. Análisis rápido: identificar causa raíz si es posible. Documentar en `ANALYSIS.md`.
6. **PARAR** y reportar diagnóstico. Pedir confirmación antes de planificar.

**Aviso automático al usuario**: tras mergear a main habrá que cherry-pick / merge también a `develop`.
