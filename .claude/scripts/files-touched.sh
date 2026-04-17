#!/usr/bin/env bash
# Lista única y ordenada de archivos tocados en la tarea activa (deduplicado de files.md).
# Uso: bash .claude/scripts/files-touched.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  echo "No hay tarea activa" >&2
  exit 1
fi

FILES_MD="$TASK_DIR/files.md"
if [[ ! -f "$FILES_MD" ]]; then
  echo "(files.md no existe aún)" >&2
  exit 0
fi

# Extrae la 3ª columna (path) de las líneas de log, deduplica y ordena
grep -E '^- [0-9]{4}-' "$FILES_MD" \
  | awk '{print $NF}' \
  | sort -u \
  || echo "(sin archivos registrados)"
