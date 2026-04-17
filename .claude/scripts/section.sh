#!/usr/bin/env bash
# Extrae una sección por su heading de cualquier archivo markdown.
# Uso: bash .claude/scripts/section.sh <archivo> <texto-del-heading>
# Ejemplo: bash .claude/scripts/section.sh .claude/CONSTITUTION.md "Art. 3"
#          bash .claude/scripts/section.sh CLAUDE.md "Comandos disponibles"
set -euo pipefail

FILE="${1:-}"
HEADING="${2:-}"

if [[ -z "$FILE" || -z "$HEADING" ]]; then
  echo "Uso: bash .claude/scripts/section.sh <archivo> <heading>" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
# Acepta rutas absolutas o relativas desde la raíz del repo
ABS_FILE="$ROOT_DIR/$FILE"
[[ -f "$ABS_FILE" ]] || ABS_FILE="$FILE"

if [[ ! -f "$ABS_FILE" ]]; then
  echo "Archivo no encontrado: $FILE" >&2
  exit 1
fi

# 1. Encontrar el número de línea del heading
LINE_NUM=$(grep -n "$HEADING" "$ABS_FILE" | head -1 | cut -d: -f1)
if [[ -z "$LINE_NUM" ]]; then
  echo "Heading '$HEADING' no encontrado en $FILE" >&2
  exit 1
fi

# 2. Determinar nivel del heading (número de # iniciales)
HEADING_LINE=$(sed -n "${LINE_NUM}p" "$ABS_FILE")
HASHES=$(printf '%s' "$HEADING_LINE" | sed 's/[^#].*//')
LEVEL="${#HASHES}"

if [[ "$LEVEL" -eq 0 ]]; then
  echo "La línea encontrada no parece un heading markdown: $HEADING_LINE" >&2
  exit 1
fi

# 3. Extraer desde LINE_NUM hasta el próximo heading de igual o mayor jerarquía
awk -v start="$LINE_NUM" -v level="$LEVEL" '
  NR < start { next }
  NR > start {
    # Si la línea empieza con # contar cuántos hay
    if (match($0, /^#+/)) {
      if (RLENGTH <= level) exit
    }
  }
  { print }
' "$ABS_FILE" | head -100
