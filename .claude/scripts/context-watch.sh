#!/usr/bin/env bash
# Hook PostToolUse: emite un aviso cuando se edita un archivo que podría
# dejar desactualizado algún artículo del Constitution o KNOWLEDGE.md.
# No bloquea — solo informa. Claude puede ignorarlo si ya lo sabe.
set -euo pipefail

INPUT="$(cat)"

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty')"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

# No avisar para archivos de la propia carpeta de tareas o comandos
case "$FILE_PATH" in
  *"/.claude/tasks/"*|*"/.claude/commands/"*|*"/.claude/workflows/"*) exit 0 ;;
esac

MSG=""

case "$FILE_PATH" in
    */domain/*/rules.ts|*/domain/*/*.rules.ts|*/domain/*/rules.test.ts|*/domain/*/*.rules.test.ts)
    MSG="[context-watch] Editaste reglas de dominio → ¿cambió alguna regla de negocio? (Art. 4)" ;;
    */domain/*/types.ts|*/domain/*/*.types.ts)
    MSG="[context-watch] Editaste tipos de dominio → ¿cambió el modelo de datos? (Art. 5)" ;;
    */infrastructure/insforge/*.ts|*/infrastructure/*insforge*/*.ts|*/mocks/handlers/*.ts|*/mocks/data/*.ts|*/supabase/migrations/*)
    MSG="[context-watch] Editaste infrastructure → ¿nuevo campo, tabla o mapper? (Art. 5)" ;;
    */pages/*.tsx|*/pages/*/*.tsx|*/pages/*/index.ts|*/pages/*/index.tsx|*/router*|*/routes*|*/components/auth/*|*/components/layout/*|*/App.tsx|*/main.tsx)
    MSG="[context-watch] Editaste rutas o páginas → ¿nueva ruta o cambio de AuthGuard? (Art. 6)" ;;
    */.claude/scripts/active-task.sh|*/.claude/scripts/diff-task.sh|*/.claude/commands/feature.md|*/.claude/commands/hotfix.md)
      MSG="[context-watch] Editaste estrategia de rama/base → revisa Art. 9 para coherencia de flujo." ;;
    */.claude/commands/check.md|*/.claude/commands/review.md|*/.claude/commands/done.md|*/.claude/workflows/review.md|*/.claude/workflows/refactor.md)
      MSG="[context-watch] Editaste quality gates operativos → verifica Art. 14 (pnpm run type-check/lint/test:run)." ;;
    *.env*|*vite.config*|*vercel.json|*/.github/workflows/*.yml|*/.github/workflows/*.yaml|*/src/config*|*/src/lib/env*)
    MSG="[context-watch] Editaste configuración → ¿nueva variable de entorno? (Art. 13)" ;;
    */styles/*|*tailwind.config*|*components.json|*.css)
    MSG="[context-watch] Editaste estilos → ¿nuevo color o token no documentado? (Art. 10)" ;;
esac

if [[ -n "$MSG" ]]; then
  echo "$MSG" >&2
  echo "[context-watch] Si hay cambio → anota [context-flag] en LOG.md. Se revisará en /done." >&2
fi

exit 0
