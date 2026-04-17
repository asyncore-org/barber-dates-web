#!/usr/bin/env bash
# Extrae un artículo concreto del CONSTITUTION.md.
# Uso: bash .claude/scripts/art.sh <N>
# Ejemplo: bash .claude/scripts/art.sh 3
set -euo pipefail

N="${1:-}"
if [[ -z "$N" ]]; then
  echo "Uso: bash .claude/scripts/art.sh <número>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT_DIR/.claude/CONSTITUTION.md"

if [[ ! -f "$FILE" ]]; then
  echo "No se encuentra CONSTITUTION.md" >&2
  exit 1
fi

# Estrategia: estado found. Cuando found=1 y encontramos otro "## Art. X", salimos.
# Esto evita el bug de range overlap (Art. 3 matchea /[0-9]/ y cierra el rango en la misma línea).
result=$(awk -v n="$N" '
  found && /^## Art\. [0-9]/ { exit }
  !found && ($0 ~ ("^## Art\\. " n " ")) { found=1 }
  found { print }
' "$FILE")

if [[ -z "$result" ]]; then
  echo "Artículo $N no encontrado en CONSTITUTION.md" >&2
  exit 1
fi

echo "$result" | head -80
