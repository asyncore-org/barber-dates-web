#!/usr/bin/env bash
# Extrae un paso concreto del PLAN.md de la tarea activa.
# Uso: bash .claude/scripts/plan-step.sh <N>
# Ejemplo: bash .claude/scripts/plan-step.sh 3
set -euo pipefail

N="${1:-}"
if [[ -z "$N" ]]; then
  echo "Uso: bash .claude/scripts/plan-step.sh <número>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  echo "No hay tarea activa" >&2
  exit 1
fi

PLAN="$TASK_DIR/PLAN.md"
if [[ ! -f "$PLAN" ]]; then
  echo "No existe PLAN.md en la tarea activa" >&2
  exit 1
fi

# Extrae desde "### Paso N" hasta el siguiente "### Paso" o EOF
awk "/^### Paso ${N}[^0-9]/,/^### Paso [0-9]/" "$PLAN" \
  | grep -v "^### Paso [0-9]" \
  | head -60
