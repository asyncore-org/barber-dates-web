#!/usr/bin/env bash
# Hook PostToolUse: registra un cambio de archivo en files.md de la tarea activa.
# Lee JSON de stdin con el shape del hook de Claude Code.
# Añade: - YYYY-MM-DD HH:mm  <op>  <path>
set -euo pipefail

INPUT="$(cat)"

# Si no hay jq, salir silenciosamente
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty')"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Solo nos interesan edits/writes de código o docs
case "$TOOL_NAME" in
  Edit|Write|MultiEdit|NotebookEdit) ;;
  *) exit 0 ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  exit 0
fi

# Ignorar cambios dentro de la propia carpeta de tarea o del sistema agéntico
case "$FILE_PATH" in
  *"/.claude/tasks/"*) exit 0 ;;
  *"/.claude/"*) ;;  # seguimos registrando ediciones del sistema agéntico
esac

OP="M"
if [[ "$TOOL_NAME" == "Write" ]]; then
  # Heurística: el hook no nos dice si era nuevo; asumimos C si tool es Write.
  OP="C"
fi

REL_PATH="${FILE_PATH#$ROOT_DIR/}"
STAMP="$(date +"%Y-%m-%d %H:%M")"
echo "- $STAMP  $OP  $REL_PATH" >> "$TASK_DIR/files.md"
