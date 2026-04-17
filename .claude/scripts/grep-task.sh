#!/usr/bin/env bash
# grep restringido a los archivos de la tarea activa.
# Uso: bash .claude/scripts/grep-task.sh <pattern>
# Ejemplo: bash .claude/scripts/grep-task.sh "domain"
set -euo pipefail

PATTERN="${1:-}"
if [[ -z "$PATTERN" ]]; then
  echo "Uso: bash .claude/scripts/grep-task.sh <pattern>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  echo "No hay tarea activa" >&2
  exit 1
fi

grep -rn "$PATTERN" "$TASK_DIR" --include="*.md" 2>/dev/null || echo "(sin resultados)"
