# Comando: /ask

Responde una pregunta sobre el proyecto sin crear ninguna tarea ni modificar ningún archivo.
Usa scripts de contexto parcial para no cargar el contexto completo.

## Uso
```
/ask <pregunta libre>
```

Ejemplos:
- `/ask ¿cuál es la regla exacta de cancelación de citas?`
- `/ask ¿cómo se estructura un hook nuevo con TanStack Query?`
- `/ask ¿qué RLS aplica a la tabla loyalty_cards?`

## Lo que debes hacer

1. Identifica qué parte del sistema es relevante para responder.
2. Carga SOLO lo necesario con los scripts:
   ```bash
   bash .claude/scripts/art.sh 4         # si es pregunta de negocio
   bash .claude/scripts/art.sh 5         # si es pregunta de modelo de datos
   bash .claude/scripts/section.sh .claude/CONSTITUTION.md "Art. 7"  # si es de convenciones
   ```
3. Si la respuesta requiere explorar el código:
   ```
   Agent({ subagent_type: "Explore", prompt: "Busca <X> en src/. Responde en < 100 palabras." })
   ```
4. Responde de forma concisa y directa.
5. **No crear tarea. No modificar ningún archivo.**
