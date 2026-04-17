#!/usr/bin/env bash
# Muestra el diff de la rama actual contra su base (develop o main).
# Uso: bash .claude/scripts/diff-task.sh [--stat]
#       --stat → solo estadísticas (archivos + líneas, sin el diff completo)
set -euo pipefail

MODE="${1:-}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

trim() {
  local s="$1"
  s="${s#${s%%[![:space:]]*}}"
  s="${s%${s##*[![:space:]]}}"
  echo "$s"
}

resolve_existing_ref() {
  local ref="$1"
  ref="$(trim "$ref")"
  if [[ -z "$ref" ]]; then
    return
  fi
  if git -C "$ROOT_DIR" rev-parse --verify "$ref" >/dev/null 2>&1; then
    echo "$ref"
    return
  fi
  if git -C "$ROOT_DIR" rev-parse --verify "origin/$ref" >/dev/null 2>&1; then
    echo "origin/$ref"
    return
  fi
}

BASE=""

# 1) Intenta resolver base desde metadata de la tarea activa
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"
if [[ -n "$TASK_DIR" && -d "$TASK_DIR" && -f "$TASK_DIR/README.md" ]]; then
  BASE_LINE="$(grep -E '^- \*\*Base\*\*:' "$TASK_DIR/README.md" 2>/dev/null | head -1 || true)"
  if [[ -n "$BASE_LINE" ]]; then
    BASE_CANDIDATE=""
    BASE_CANDIDATE="$(echo "$BASE_LINE" | sed -nE 's/.*`([^`]+)`.*/\1/p' | head -1)"
    if [[ -n "$BASE_CANDIDATE" ]]; then
      BASE_CANDIDATE="$(trim "$BASE_CANDIDATE")"
    fi
    if [[ -z "$BASE_CANDIDATE" ]]; then
      BASE_CANDIDATE="${BASE_LINE#*:}"
      BASE_CANDIDATE="$(echo "$BASE_CANDIDATE" | awk -F' \| ' '{print $1}')"
      BASE_CANDIDATE="$(trim "$BASE_CANDIDATE")"
    fi
    BASE="$(resolve_existing_ref "$BASE_CANDIDATE")"
  fi
fi

# 2) Fallback por convención de rama
if [[ -z "$BASE" ]]; then
  case "$BRANCH" in
    hotfix/*) BASE="$(resolve_existing_ref "main")" ;;
    *)        BASE="$(resolve_existing_ref "develop")" ;;
  esac
fi

# 3) Fallback por upstream de la rama actual
if [[ -z "$BASE" ]]; then
  UPSTREAM="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || echo "")"
  BASE="$(resolve_existing_ref "$UPSTREAM")"
fi

# 4) Último recurso
if [[ -z "$BASE" ]]; then
  BASE="HEAD~1"
fi

if [[ "$MODE" == "--stat" ]]; then
  git -C "$ROOT_DIR" diff --stat "${BASE}...HEAD"
else
  git -C "$ROOT_DIR" diff "${BASE}...HEAD" -- \
    ':!.claude/tasks/*' \
    ':!*.md' \
    2>/dev/null | head -400
fi
