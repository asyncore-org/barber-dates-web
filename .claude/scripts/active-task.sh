#!/usr/bin/env bash
# Devuelve la ruta de la tarea activa asociada a la rama git actual, si existe.
# Estrategia:
# 1) Match exacto por rama declarada en README.md de la tarea
# 2) Fallback por slug (último segmento, segmento tras primer /, y rama con / -> -)
# Salida: path de la carpeta o cadena vacía.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASKS_DIR="$ROOT_DIR/.claude/tasks"

if [[ ! -d "$TASKS_DIR" ]]; then
  exit 0
fi

BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
  exit 0
fi

pick_latest() {
  local current="${1:-}"
  local candidate="${2:-}"
  if [[ -z "$candidate" || ! -d "$candidate" ]]; then
    echo "$current"
    return
  fi
  if [[ -z "$current" || "$candidate" > "$current" ]]; then
    echo "$candidate"
    return
  fi
  echo "$current"
}

LATEST=""

# 1) Match exacto por rama en README
for dir in "$TASKS_DIR"/TASK-*; do
  [[ -d "$dir" ]] || continue
  README="$dir/README.md"
  [[ -f "$README" ]] || continue

  TASK_BRANCH="$(grep -E '^- \*\*Rama\*\*:' "$README" 2>/dev/null | sed -nE 's/.*`([^`]+)`.*/\1/p' | head -1 || true)"
  if [[ "$TASK_BRANCH" == "$BRANCH" ]]; then
    LATEST="$(pick_latest "$LATEST" "$dir")"
  fi
done

if [[ -n "$LATEST" ]]; then
  echo "$LATEST"
  exit 0
fi

# 2) Fallback por slugs candidatos
declare -a CANDIDATES=()
CANDIDATES+=("${BRANCH##*/}")
CANDIDATES+=("${BRANCH#*/}")
CANDIDATES+=("${BRANCH//\//-}")

for slug in "${CANDIDATES[@]}"; do
  [[ -n "$slug" ]] || continue
  for dir in "$TASKS_DIR"/TASK-*-"$slug"; do
    [[ -d "$dir" ]] || continue
    LATEST="$(pick_latest "$LATEST" "$dir")"
  done
done

echo "$LATEST"
