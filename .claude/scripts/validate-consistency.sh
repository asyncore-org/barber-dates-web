#!/usr/bin/env bash
# Verifica consistencia del sistema agéntico:
# - No usar npm run para quality gates operativos
# - Presencia de comandos pnpm canónicos en archivos clave
# - Scripts obligatorios en package.json
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL=0

echo "[consistency] Running Claude system consistency checks..."

DRIFT_OUTPUT="$({
  grep -RInF "npm run type-check" "$ROOT_DIR/.claude/commands" "$ROOT_DIR/.claude/workflows" "$ROOT_DIR/docs" 2>/dev/null || true
  grep -RInF "npm run lint" "$ROOT_DIR/.claude/commands" "$ROOT_DIR/.claude/workflows" "$ROOT_DIR/docs" 2>/dev/null || true
  grep -RInF "npm run test -- --run" "$ROOT_DIR/.claude/commands" "$ROOT_DIR/.claude/workflows" "$ROOT_DIR/docs" 2>/dev/null || true
  grep -InF "npm run type-check" "$ROOT_DIR/CLAUDE.md" "$ROOT_DIR/.github/copilot-instructions.md" 2>/dev/null || true
  grep -InF "npm run lint" "$ROOT_DIR/CLAUDE.md" "$ROOT_DIR/.github/copilot-instructions.md" 2>/dev/null || true
  grep -InF "npm run test -- --run" "$ROOT_DIR/CLAUDE.md" "$ROOT_DIR/.github/copilot-instructions.md" 2>/dev/null || true
} | grep -v "pnpm run" | grep -vE '/\.claude/DECISIONS\.md:|/docs/07-consistency-checks\.md:' | sort -u || true)"

if [[ -n "$DRIFT_OUTPUT" ]]; then
  echo "[consistency] FAIL: Found legacy npm quality gate commands:" >&2
  echo "$DRIFT_OUTPUT" >&2
  FAIL=1
else
  echo "[consistency] OK: No legacy npm quality gate commands detected."
fi

declare -a REQUIRED_FILES=(
  ".claude/commands/check.md"
  ".claude/commands/review.md"
  ".claude/commands/done.md"
  ".claude/workflows/review.md"
  ".claude/CONSTITUTION.md"
)

declare -a REQUIRED_CMDS=(
  "pnpm run type-check"
  "pnpm run lint"
  "pnpm run test:run"
)

for rel in "${REQUIRED_FILES[@]}"; do
  abs="$ROOT_DIR/$rel"
  if [[ ! -f "$abs" ]]; then
    echo "[consistency] FAIL: Missing required file $rel" >&2
    FAIL=1
    continue
  fi

  for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! grep -Fq "$cmd" "$abs"; then
      echo "[consistency] FAIL: '$cmd' not found in $rel" >&2
      FAIL=1
    fi
  done
done

if command -v jq >/dev/null 2>&1; then
  if ! jq -e '.scripts["type-check"] and .scripts["lint"] and .scripts["test:run"]' "$ROOT_DIR/package.json" >/dev/null; then
    echo "[consistency] FAIL: package.json is missing one of scripts: type-check, lint, test:run" >&2
    FAIL=1
  else
    echo "[consistency] OK: package.json includes type-check, lint, and test:run scripts."
  fi
else
  echo "[consistency] WARN: jq not available, package.json script validation skipped." >&2
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "[consistency] Result: FAILED" >&2
  exit 1
fi

echo "[consistency] Result: OK"
