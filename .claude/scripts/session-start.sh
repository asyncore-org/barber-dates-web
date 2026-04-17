#!/usr/bin/env bash
# Hook SessionStart: imprime a stdout un mensaje que Claude leerá como contexto
# si hay una tarea activa asociada a la rama actual.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  exit 0
fi

TASK_ID="$(basename "$TASK_DIR")"

cat <<EOF
[agentic-system] Rama actual: $BRANCH
[agentic-system] Tarea activa detectada: $TASK_ID
[agentic-system] Para retomarla ejecuta: /resume $TASK_ID
[agentic-system] Estado: $(grep -A1 '^## Estado actual' "$TASK_DIR/STATE.md" 2>/dev/null | tail -n1 | sed 's/^[[:space:]]*//')
EOF
