#!/usr/bin/env bash
# Muestra el diff de la rama actual contra su base (develop o main).
# Uso: bash .claude/scripts/diff-task.sh [--stat]
#       --stat → solo estadísticas (archivos + líneas, sin el diff completo)
set -euo pipefail

MODE="${1:-}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

# Determina la base por convención de rama
case "$BRANCH" in
  hotfix/*) BASE="main" ;;
  *)        BASE="develop" ;;
esac

# Verifica que la base existe
if ! git -C "$ROOT_DIR" rev-parse --verify "$BASE" >/dev/null 2>&1; then
  BASE="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD~1 2>/dev/null || echo "HEAD~1")"
fi

if [[ "$MODE" == "--stat" ]]; then
  git -C "$ROOT_DIR" diff --stat "${BASE}...HEAD"
else
  git -C "$ROOT_DIR" diff "${BASE}...HEAD" -- \
    ':!.claude/tasks/*' \
    ':!*.md' \
    2>/dev/null | head -400
fi
