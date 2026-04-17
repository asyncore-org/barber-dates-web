#!/usr/bin/env bash
# Hook PostToolUse: emite un aviso cuando se edita un archivo que podría
# dejar desactualizado algún artículo del Constitution o KNOWLEDGE.md.
# No bloquea — solo informa. Claude puede ignorarlo si ya lo sabe.
set -euo pipefail

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty')"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

# No avisar para archivos de la propia carpeta de tareas o comandos
case "$FILE_PATH" in
  *"/.claude/tasks/"*|*"/.claude/commands/"*|*"/.claude/workflows/"*) exit 0 ;;
esac

MSG=""

case "$FILE_PATH" in
  */domain/*/rules.ts)
    MSG="[context-watch] Editaste reglas de dominio → ¿cambió alguna regla de negocio? (Art. 4)" ;;
  */domain/*/types.ts)
    MSG="[context-watch] Editaste tipos de dominio → ¿cambió el modelo de datos? (Art. 5)" ;;
  */infrastructure/insforge/*.ts)
    MSG="[context-watch] Editaste infrastructure → ¿nuevo campo, tabla o mapper? (Art. 5)" ;;
  */pages/*.tsx|*/router*|*/routes*|*App.tsx)
    MSG="[context-watch] Editaste rutas o páginas → ¿nueva ruta o cambio de AuthGuard? (Art. 6)" ;;
  *.env*|*vite.config*)
    MSG="[context-watch] Editaste configuración → ¿nueva variable de entorno? (Art. 13)" ;;
  */styles/*|*tailwind.config*)
    MSG="[context-watch] Editaste estilos → ¿nuevo color o token no documentado? (Art. 10)" ;;
esac

if [[ -n "$MSG" ]]; then
  echo "$MSG" >&2
  echo "[context-watch] Si hay cambio → anota [context-flag] en LOG.md. Se revisará en /done." >&2
fi

exit 0
