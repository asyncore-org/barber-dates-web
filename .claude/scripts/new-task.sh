#!/usr/bin/env bash
# Crea una nueva carpeta de tarea a partir del template.
# Uso: bash .claude/scripts/new-task.sh <tipo> <slug> [titulo-libre]
#   tipo: feature | fix | refactor | chore | hotfix | spike
#   slug: identificador kebab-case (ej. calendar-virtualization)
#
# Genera: .claude/tasks/TASK-YYYYMMDD-HHmm-<tipo>-<slug>/
# Salida (stdout): la ruta de la carpeta creada (útil para pipelines).

set -euo pipefail

TYPE="${1:-}"
SLUG="${2:-}"
TITLE="${3:-}"

if [[ -z "$TYPE" || -z "$SLUG" ]]; then
  echo "Uso: bash .claude/scripts/new-task.sh <tipo> <slug> [titulo]" >&2
  echo "  tipo: feature | fix | refactor | chore | hotfix | spike" >&2
  exit 1
fi

case "$TYPE" in
  feature|fix|refactor|chore|hotfix|spike) ;;
  *)
    echo "Tipo inválido: $TYPE" >&2
    exit 1
    ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASKS_DIR="$ROOT_DIR/.claude/tasks"
TEMPLATE_DIR="$TASKS_DIR/_TEMPLATE"

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "No se encuentra $TEMPLATE_DIR" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M)"
TASK_ID="TASK-${STAMP}-${TYPE}-${SLUG}"
TASK_DIR="$TASKS_DIR/$TASK_ID"

if [[ -e "$TASK_DIR" ]]; then
  echo "Ya existe: $TASK_DIR" >&2
  exit 1
fi

mkdir -p "$TASK_DIR"
cp "$TEMPLATE_DIR"/*.md "$TASK_DIR/"
# Subcarpeta de change-requests
mkdir -p "$TASK_DIR/CHANGES"

# Sustituciones básicas en los .md de la tarea
CREATED_HUMAN="$(date +"%Y-%m-%d %H:%M")"
TITLE_DISPLAY="${TITLE:-$SLUG}"

# macOS sed requiere -i ''
SED_I=(-i '')
if [[ "$(uname)" != "Darwin" ]]; then
  SED_I=(-i)
fi

for f in "$TASK_DIR"/*.md; do
  sed "${SED_I[@]}" \
    -e "s|<ID>|${STAMP}-${TYPE}-${SLUG}|g" \
    -e "s|<TITULO>|${TITLE_DISPLAY}|g" \
    -e "s|YYYY-MM-DD HH:mm|${CREATED_HUMAN}|g" \
    -e "s|<tipo>|${TYPE}|g" \
    -e "s|<slug>|${SLUG}|g" \
    "$f"
done

echo "$TASK_DIR"
