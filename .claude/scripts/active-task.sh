#!/usr/bin/env bash
# Devuelve la ruta de la tarea activa asociada a la rama git actual, si existe.
# Heurística: la tarea más reciente cuya rama coincida con el branch actual.
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

# Slug deducido: todo lo que va detrás del "/" en la rama (feature/foo-bar → foo-bar)
SLUG="${BRANCH#*/}"

if [[ -z "$SLUG" || "$SLUG" == "$BRANCH" ]]; then
  exit 0
fi

# Busca la carpeta más reciente que termine en "-$SLUG"
LATEST=""
for dir in "$TASKS_DIR"/TASK-*-"$SLUG"; do
  [[ -d "$dir" ]] || continue
  if [[ -z "$LATEST" || "$dir" > "$LATEST" ]]; then
    LATEST="$dir"
  fi
done

echo "$LATEST"
