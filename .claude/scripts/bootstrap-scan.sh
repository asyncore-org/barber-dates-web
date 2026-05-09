#!/usr/bin/env bash
# Lightweight repo snapshot for /bootstrap. Prints summary to stdout.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

print_section() {
  echo ""
  echo "### $1"
}

print_list() {
  local items="$1"
  if [[ -z "$items" ]]; then
    echo "(none)"
  else
    echo "$items" | sed 's/^/- /'
  fi
}

echo "## Bootstrap scan"
echo ""
echo "Root: $ROOT_DIR"

print_section "Top-level directories"
top_dirs=$(find "$ROOT_DIR" -mindepth 1 -maxdepth 1 -type d ! -name ".git" 2>/dev/null | sed "s|^$ROOT_DIR/||" | sort)
print_list "$top_dirs"

print_section "Top-level files"
top_files=$(find "$ROOT_DIR" -mindepth 1 -maxdepth 1 -type f ! -name ".DS_Store" 2>/dev/null | sed "s|^$ROOT_DIR/||" | sort)
print_list "$top_files"

print_section "Layout hints"
layout_dirs=("src" "apps" "packages" "services" "docs" "infra" "backend" "frontend" "api" "web" "server" "client")
layout_found=()
for d in "${layout_dirs[@]}"; do
  if [[ -d "$ROOT_DIR/$d" ]]; then
    layout_found+=("$d/")
  fi
done
if [[ ${#layout_found[@]} -eq 0 ]]; then
  echo "(none)"
else
  printf '%s\n' "${layout_found[@]}" | sed 's/^/- /'
fi

print_section "Manifests and config (root)"
root_files=()
for f in package.json pnpm-lock.yaml yarn.lock package-lock.json pnpm-workspace.yaml tsconfig.json tsconfig.base.json vite.config.ts vite.config.js next.config.js next.config.mjs turbo.json nx.json lerna.json docker-compose.yml docker-compose.yaml Dockerfile vercel.json netlify.toml; do
  if [[ -e "$ROOT_DIR/$f" ]]; then
    root_files+=("$f")
  fi
done
if [[ ${#root_files[@]} -eq 0 ]]; then
  echo "(none)"
else
  printf '%s\n' "${root_files[@]}" | sed 's/^/- /'
fi

print_section "package.json locations (max 20)"
pkg_files=$(find "$ROOT_DIR" -maxdepth 4 -name package.json -print 2>/dev/null | sed "s|^$ROOT_DIR/||" | sort | head -20)
print_list "$pkg_files"

print_section "Env files (max 20)"
env_files=$(find "$ROOT_DIR" -maxdepth 3 -name ".env*" -print 2>/dev/null | sed "s|^$ROOT_DIR/||" | sort | head -20)
print_list "$env_files"

print_section "Data layer hints (dirs/files, max 20)"
data_hits=$(find "$ROOT_DIR" -maxdepth 4 \( -type d -name "prisma" -o -type d -name "supabase" -o -type d -name "migrations" -o -type f -name "schema.sql" -o -type f -name "schema.prisma" \) -print 2>/dev/null | sed "s|^$ROOT_DIR/||" | sort | head -20)
print_list "$data_hits"

print_section "CI and deploy hints"
ci_hits=()
if [[ -d "$ROOT_DIR/.github/workflows" ]]; then ci_hits+=(".github/workflows/"); fi
if [[ -f "$ROOT_DIR/.gitlab-ci.yml" ]]; then ci_hits+=(".gitlab-ci.yml"); fi
if [[ -f "$ROOT_DIR/bitbucket-pipelines.yml" ]]; then ci_hits+=("bitbucket-pipelines.yml"); fi
if [[ -f "$ROOT_DIR/vercel.json" ]]; then ci_hits+=("vercel.json"); fi
if [[ -f "$ROOT_DIR/netlify.toml" ]]; then ci_hits+=("netlify.toml"); fi
if [[ -f "$ROOT_DIR/Dockerfile" ]]; then ci_hits+=("Dockerfile"); fi
if [[ -f "$ROOT_DIR/docker-compose.yml" || -f "$ROOT_DIR/docker-compose.yaml" ]]; then
  ci_hits+=("docker-compose.*")
fi
if [[ ${#ci_hits[@]} -eq 0 ]]; then
  echo "(none)"
else
  printf '%s\n' "${ci_hits[@]}" | sed 's/^/- /'
fi
