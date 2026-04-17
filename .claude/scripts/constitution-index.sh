#!/usr/bin/env bash
# Muestra el índice del Constitution (15 líneas) para decidir qué artículo cargar.
# Uso: bash .claude/scripts/constitution-index.sh
# Después usar: bash .claude/scripts/art.sh <N>
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cat "$ROOT_DIR/.claude/CONSTITUTION-INDEX.md"
