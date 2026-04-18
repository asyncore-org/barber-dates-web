#!/usr/bin/env bash
# Analiza los archivos tocados en la tarea activa y devuelve los artículos del
# Constitution que podrían haber quedado desactualizados.
#
# Uso: bash .claude/scripts/sync-context.sh
# Salida: tabla de artículos afectados + qué archivo lo dispara
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TASK_DIR="$(bash "$ROOT_DIR/.claude/scripts/active-task.sh" 2>/dev/null || echo "")"

if [[ -z "$TASK_DIR" || ! -d "$TASK_DIR" ]]; then
  echo "No hay tarea activa" >&2
  exit 1
fi

FILES_MD="$TASK_DIR/files.md"
if [[ ! -f "$FILES_MD" ]]; then
  echo "(files.md vacío — no hay archivos registrados)"
  exit 0
fi

# Extraer paths de archivos tocados
TOUCHED=$(grep -E '^- [0-9]{4}-' "$FILES_MD" | awk '{print $NF}' | sort -u 2>/dev/null || echo "")

if [[ -z "$TOUCHED" ]]; then
  echo "(no hay archivos registrados en files.md)"
  exit 0
fi

echo "## Archivos tocados → Artículos posiblemente afectados"
echo ""

# bash 3 compatible: space-separated string instead of associative array
ARTICLES_SEEN=""

_seen() {
  echo " $ARTICLES_SEEN " | grep -qw "$1"
}

_mark() {
  ARTICLES_SEEN="$ARTICLES_SEEN $1"
}

check_path() {
  local path="$1"
  local art="$2"
  local reason="$3"
  if ! _seen "$art"; then
    echo "- **Art. $art** — $reason"
    echo "  Disparado por: \`$path\`"
    _mark "$art"
  else
    echo "  (también: \`$path\`)"
  fi
}

while IFS= read -r path; do
  [[ -z "$path" ]] && continue

  # Art. 3 — Arquitectura
  case "$path" in
    src/infrastructure/*|src/hooks/*|src/domain/*|src/components/*|src/pages/*)
      check_path "$path" "3" "Arquitectura — cambio en capa controlada" ;;
  esac

  # Art. 9 — Estrategia de ramas
  case "$path" in
    .claude/scripts/active-task.sh|.claude/scripts/diff-task.sh|.claude/commands/feature.md|.claude/commands/fix.md|.claude/commands/hotfix.md|.claude/commands/worktree.md)
      check_path "$path" "9" "Estrategia de ramas/base — ¿sigue coherente con Art. 9?" ;;
  esac

  # Art. 4 — Reglas de negocio
  case "$path" in
    src/domain/*/rules.ts|src/domain/*/rules.test.ts)
      check_path "$path" "4" "Reglas de negocio — ¿cambió alguna constante o regla?" ;;
  esac

  # Art. 5 — Modelo de datos
  case "$path" in
    src/domain/*/types.ts|src/domain/*/*.types.ts|src/infrastructure/insforge/*.ts|src/infrastructure/*/*.ts|src/mocks/handlers/*.ts|src/mocks/data/*.ts|supabase/migrations/*)
      check_path "$path" "5" "Modelo de datos — ¿nueva tabla, campo o relación?" ;;
  esac

  # Art. 6 — Rutas
  case "$path" in
    src/pages/*|src/pages/*/*|src/router*|src/routes*|src/App.tsx|src/main.tsx|src/components/auth/*|src/components/layout/*)
      check_path "$path" "6" "Rutas — ¿nueva ruta, AuthGuard nuevo o cambio de flujo de auth?" ;;
  esac

  # Art. 10 — Paleta de colores
  case "$path" in
    src/*.css|src/*/*.css|src/*/*/*.css|tailwind.config*|components.json|*.css|src/styles/*)
      check_path "$path" "10" "Colores/estilos — ¿se usó un color o token nuevo?" ;;
  esac

  # Art. 11 — Rendimiento
  case "$path" in
    src/pages/*.tsx|src/pages/*/*.tsx|src/components/*.tsx|src/components/*/*.tsx)
      check_path "$path" "11" "Rendimiento — ¿nuevo lazy(), memo o virtual?" ;;
  esac

  # Art. 13 — Variables de entorno
  case "$path" in
    .env*|vite.config*|src/config*|src/lib/env*|.github/workflows/*.yml|.github/workflows/*.yaml|vercel.json)
      check_path "$path" "13" "Env vars — ¿nueva variable VITE_*?" ;;
  esac

  # Art. 14 — Quality gates
  case "$path" in
    .claude/commands/check.md|.claude/commands/review.md|.claude/commands/done.md|.claude/workflows/review.md|.claude/workflows/refactor.md|package.json|.claude/settings.json)
      check_path "$path" "14" "Quality gates — ¿se mantienen type-check/lint/test:run con pnpm?" ;;
  esac

  # KNOWLEDGE.md
  case "$path" in
    src/infrastructure/*|src/domain/*|*.config.*)
      if ! _seen "KNOWLEDGE"; then
        echo "- **KNOWLEDGE.md** — ¿Descubriste algún gotcha o workaround?"
        echo "  Disparado por: \`$path\`"
        _mark "KNOWLEDGE"
      fi
      ;;
  esac

done <<< "$TOUCHED"

echo ""
echo "### Cómo verificar cada artículo"
for art in $ARTICLES_SEEN; do
  [[ "$art" == "KNOWLEDGE" ]] && continue
  echo "  bash .claude/scripts/art.sh $art"
done
echo ""
echo "Si algo está desactualizado → propón el cambio al usuario antes de modificar el Constitution (Art. 14)."
