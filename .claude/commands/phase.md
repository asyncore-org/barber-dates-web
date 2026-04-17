# Comando: /phase

Muestra el estado actual del desarrollo y las tareas de la fase activa.

## Lo que debes hacer

1. **Leer `CLAUDE.md`** para ver cuál es la fase actual
2. **Leer `PLAN_GIO_BARBER_SHOP.md`** (carpeta padre: `../PLAN_GIO_BARBER_SHOP.md`) para ver los checklist de cada fase
3. **Inspeccionar el proyecto** para verificar qué está realmente implementado vs. lo que el plan dice
4. **Reportar** en este formato:

```
## Fase actual: Fase 0 — Setup Inicial

### ✅ Completado
- Repositorio GitHub con ramas main y develop
- [otros elementos completados]

### 🔄 En progreso
- [elementos empezados pero no terminados]

### ❌ Pendiente
- [elementos sin empezar]

### Siguiente acción recomendada
[Una sola acción concreta que desbloquea el progreso]
```

## Cuándo ejecutarlo
- Al inicio de una sesión de trabajo para orientarse
- Cuando el usuario pregunta "¿cómo vamos?" o "¿qué falta?"
- Para decidir qué construir a continuación

## Notas
- Verificar el estado REAL del código, no solo recordar el plan
- Si hay algo en el plan que ya no tiene sentido dado el estado actual, señalarlo
- Priorizar siempre desbloquear la fase actual antes de hablar de fases futuras
