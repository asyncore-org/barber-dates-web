#!/usr/bin/env bash
# Hook PreToolUse para Bash: si el comando parece un git commit y hay tarea activa,
# sugiere incluir el TASK-id en el cuerpo del mensaje (solo advertencia, no bloquea).
set -euo pipefail

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty')"
CMD="$(echo "$INPUT" | jq -r '.tool_input.command // empty')"

if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

if ! echo "$CMD" | grep -qE '^[[:space:]]*git[[:space:]]+commit'; then
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" ]]; then
  exit 0
fi

TASK_ID="$(basename "$TASK_DIR")"

# Solo advertencia — no bloquea
echo "[agentic-system] Commit en rama con tarea activa $TASK_ID." >&2
echo "[agentic-system] Considera mencionar $TASK_ID en el cuerpo del commit." >&2
exit 0
