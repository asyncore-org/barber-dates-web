#!/usr/bin/env bash
# Trae un archivo específico de la tarea activa (o de una tarea por ID).
# Uso: bash .claude/scripts/fetch.sh <file>             (tarea activa)
#      bash .claude/scripts/fetch.sh <file> <TASK-ID>   (tarea específica)
# Ejemplos:
#   bash .claude/scripts/fetch.sh PLAN.md
#   bash .claude/scripts/fetch.sh ANALYSIS.md TASK-20260417-1030-feature-auth
set -euo pipefail

FILE="${1:-}"
TASK_ID="${2:-}"

if [[ -z "$FILE" ]]; then
  echo "Uso: bash .claude/scripts/fetch.sh <file> [TASK-ID]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASKS_DIR="$ROOT_DIR/.claude/tasks"

if [[ -n "$TASK_ID" ]]; then
  TASK_DIR="$(ls -d "$TASKS_DIR/${TASK_ID}"* 2>/dev/null | head -1 || echo "")"
else
  TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"
fi

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  echo "No se encontró la tarea${TASK_ID:+ $TASK_ID}" >&2
  exit 1
fi

TARGET="$TASK_DIR/$FILE"
if [[ ! -f "$TARGET" ]]; then
  echo "Archivo no encontrado en la tarea: $FILE" >&2
  echo "Archivos disponibles: $(ls "$TASK_DIR")" >&2
  exit 1
fi

cat "$TARGET"
