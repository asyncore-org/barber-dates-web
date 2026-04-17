# Documentación del Desarrollador — Gio Barber Shop

> **Solo para el desarrollador humano. Claude no carga esta carpeta automáticamente.**
> Última actualización: 2026-04-17

---

## Índice

| Archivo | Contenido |
|---------|-----------|
| [01-sistema-agentico.md](01-sistema-agentico.md) | Qué es el sistema, por qué existe, estructura de archivos completa |
| [02-archivos-de-contexto.md](02-archivos-de-contexto.md) | Constitution, KNOWLEDGE, DECISIONS, CONSTITUTION-INDEX — cómo leerlos y mantenerlos |
| [03-flujo-de-desarrollo.md](03-flujo-de-desarrollo.md) | El ciclo completo analyze→plan→implement→review→done con diagramas |
| [04-referencia-comandos.md](04-referencia-comandos.md) | Los 31 comandos slash documentados en detalle |
| [05-sistema-de-tareas.md](05-sistema-de-tareas.md) | Carpetas TASK-, scripts de fetch parcial, hooks automáticos, continuidad entre sesiones |
| [06-buenas-practicas.md](06-buenas-practicas.md) | Ahorro de tokens, correcciones con /change, estrategia git, errores comunes, ejemplos reales, FAQ |

---

## Lectura rápida si estás empezando

1. Lee [01-sistema-agentico.md](01-sistema-agentico.md) para entender el sistema en 5 minutos.
2. Lee [03-flujo-de-desarrollo.md](03-flujo-de-desarrollo.md) para ver el ciclo completo antes de tu primera tarea.
3. Ten [04-referencia-comandos.md](04-referencia-comandos.md) a mano como consulta rápida.

---

## Principio más importante

> **Claude no toca código de producción (`src/`) fuera del comando `/implement`.**

Todo lo que ocurre antes — análisis, preguntas, plan, correcciones — produce solo documentos en la carpeta de la tarea. Nunca código. Esto garantiza que nada se implementa sin un plan aprobado.

---

## Quick start: primera tarea

```
# 1. Arrancar la tarea (Claude analiza y para con preguntas)
/feature <slug> <descripción de lo que quieres>

# 2. Responder las preguntas que Claude generó

# 3. Generar el plan
/plan

# 4. Revisar el plan. Ajustar si hace falta:
/revise <qué cambiar>

# 5. Implementar (Claude va paso a paso, un commit por paso)
/implement

# 6. Si algo no quedó bien:
/change <descripción del ajuste>

# 7. Revisar el resultado
/review

# 8. Cerrar (actualiza contexto + propone PR)
/done
```
