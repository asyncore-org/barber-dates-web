#!/usr/bin/env bash
# kb-query.sh — Query the browser knowledge base
#
# Usage:
#   bash .claude/scripts/kb-query.sh --list                           # list sites + processes
#   bash .claude/scripts/kb-query.sh _processes                       # all processes with descriptions
#   bash .claude/scripts/kb-query.sh _processes --search <keyword>    # search processes by keyword
#   bash .claude/scripts/kb-query.sh _processes <process-name>        # show process steps + constitution
#   bash .claude/scripts/kb-query.sh <domain> --index                 # show site _index.yml + constitution head
#   bash .claude/scripts/kb-query.sh <domain> <section>               # show tools.md for section
#   bash .claude/scripts/kb-query.sh <domain> <section> --dom         # show dom-snap.html
#   bash .claude/scripts/kb-query.sh <domain> <section> --script <name.js>  # show a script

set -e

KB_ROOT="$HOME/.claude/browser-kb"

# node + js-yaml helper (run from project root where browser/node_modules exists)
_yaml_list_processes() {
  node -e "
const path = require('path');
const yaml = require(path.resolve('./browser/node_modules/js-yaml'));
const fs = require('fs');
const data = yaml.load(fs.readFileSync('$KB_ROOT/_processes/_index.yml', 'utf8'));
for (const [name, info] of Object.entries(data.processes || {})) {
  const desc = info.description || '';
  const kw = (info.keywords || []).join(', ');
  const updated = info.updatedAt || '';
  console.log('  • ' + name);
  console.log('    ' + desc);
  if (kw) console.log('    keywords: ' + kw);
  if (updated) console.log('    updated: ' + updated);
  console.log();
}
" 2>/dev/null || awk '
/^  [a-z]/ { gsub(/:$/,""); printf "  • %s\n", substr($0,3) }
/description:/ { printf "    %s\n\n", substr($0, index($0,"description:")+13) }
' "$KB_ROOT/_processes/_index.yml"
}

_yaml_search_processes() {
  local keyword="$1"
  node -e "
const path = require('path');
const yaml = require(path.resolve('./browser/node_modules/js-yaml'));
const fs = require('fs');
const kw = process.argv[1].toLowerCase();
const data = yaml.load(fs.readFileSync('$KB_ROOT/_processes/_index.yml', 'utf8'));
let found = false;
for (const [name, info] of Object.entries(data.processes || {})) {
  const desc = (info.description || '').toLowerCase();
  const kwList = (info.keywords || []).map(k => k.toLowerCase());
  const sites = (info.sites || []).map(s => s.toLowerCase());
  const match = kw.split(' ').every(w =>
    name.toLowerCase().includes(w) || desc.includes(w) ||
    kwList.some(k => k.includes(w)) || sites.some(s => s.includes(w))
  );
  if (match) {
    found = true;
    console.log('  • ' + name);
    console.log('    description: ' + (info.description || ''));
    if (info.keywords) console.log('    keywords: ' + info.keywords.join(' '));
    if (info.sites) console.log('    sites: ' + info.sites.join(', '));
    console.log('    steps: $KB_ROOT/_processes/' + name + '/steps.md');
    console.log();
  }
}
if (!found) console.log('  (no match found — try broader keyword)');
" "$keyword" 2>/dev/null || {
  # fallback: plain grep
  grep -i "$keyword" "$KB_ROOT/_processes/_index.yml" | sed 's/^/  /'
}
}

# Ensure KB exists
if [ ! -d "$KB_ROOT" ]; then
  echo "browser-kb not initialized. Run: node browser/scripts/kb-init.js"
  exit 1
fi

DOMAIN="${1:-}"
SECTION="${2:-}"
FLAG="${3:-}"

# ── --list: show all sites + processes ───────────────────────────────────────
if [ "$DOMAIN" = "--list" ]; then
  echo "=== Known sites ==="
  if [ -f "$KB_ROOT/_index.yml" ]; then
    grep -E "^  [a-z]" "$KB_ROOT/_index.yml" | sed 's/://g' | sed 's/^  /  • /'
  else
    ls "$KB_ROOT" | grep -v '^_' | sed 's/^/  • /'
  fi
  echo ""
  echo "=== Known processes ==="
  _yaml_list_processes
  exit 0
fi

if [ -z "$DOMAIN" ]; then
  echo "Usage: kb-query.sh <domain|_processes|--list> [section|--index|--search <kw>] [--dom|--script <name>]"
  exit 1
fi

# ── _processes: query processes ───────────────────────────────────────────────
if [ "$DOMAIN" = "_processes" ]; then

  # --search <keyword>
  if [ "$SECTION" = "--search" ]; then
    KEYWORD="${FLAG:-}"
    if [ -z "$KEYWORD" ]; then
      echo "Usage: kb-query.sh _processes --search <keyword>"
      exit 1
    fi
    echo "=== Processes matching: '$KEYWORD' ==="
    _yaml_search_processes "$KEYWORD"
    exit 0
  fi

  # No section: list all processes with detail
  PROCESS_NAME="$SECTION"
  if [ -z "$PROCESS_NAME" ]; then
    echo "=== Available processes ==="
    _yaml_list_processes
    echo "Tip: kb-query.sh _processes --search <keyword>  to find by keyword"
    echo "     kb-query.sh _processes <name>              to read a process"
    exit 0
  fi

  # Specific process
  PROCESS_DIR="$KB_ROOT/_processes/$PROCESS_NAME"
  if [ ! -d "$PROCESS_DIR" ]; then
    echo "Process not found: $PROCESS_NAME"
    echo ""
    echo "Available processes:"
    ls "$KB_ROOT/_processes/" 2>/dev/null | grep -v '_index.yml' | sed 's/^/  • /'
    echo ""
    echo "Tip: use --search <keyword> to find by keyword"
    exit 1
  fi

  if [ -f "$PROCESS_DIR/constitution.md" ]; then
    cat "$PROCESS_DIR/constitution.md"
    echo ""
    echo "---"
    echo ""
  fi
  if [ -f "$PROCESS_DIR/steps.md" ]; then
    cat "$PROCESS_DIR/steps.md"
  fi
  exit 0
fi

SITE_DIR="$KB_ROOT/$DOMAIN"
if [ ! -d "$SITE_DIR" ]; then
  echo "Site not found: $DOMAIN"
  echo ""
  echo "Available sites:"
  ls "$KB_ROOT/" 2>/dev/null | grep -v '^_' | sed 's/^/  • /'
  exit 1
fi

# ── --index: show site index + constitution head ──────────────────────────────
if [ "$SECTION" = "--index" ] || [ -z "$SECTION" ]; then
  echo "=== Index: $DOMAIN ==="
  if [ -f "$SITE_DIR/_index.yml" ]; then
    cat "$SITE_DIR/_index.yml"
  else
    echo "(no _index.yml)"
  fi
  echo ""
  echo "=== Constitution (primeras 30 líneas) ==="
  if [ -f "$SITE_DIR/constitution.md" ]; then
    head -30 "$SITE_DIR/constitution.md"
  fi
  exit 0
fi

SECTION_DIR="$SITE_DIR/$SECTION"
if [ ! -d "$SECTION_DIR" ]; then
  echo "Section not found: $DOMAIN/$SECTION"
  echo ""
  echo "Available sections:"
  ls "$SITE_DIR/" 2>/dev/null | grep -v '^_' | grep -v '\.md' | grep -v '\.yml' | sed 's/^/  • /'
  exit 1
fi

# ── --dom: show DOM snapshot ──────────────────────────────────────────────────
if [ "$FLAG" = "--dom" ]; then
  DOM_FILE="$SECTION_DIR/dom-snap.html"
  if [ ! -f "$DOM_FILE" ]; then
    echo "No DOM snapshot for $DOMAIN/$SECTION"
    exit 1
  fi
  cat "$DOM_FILE"
  exit 0
fi

# ── --script: show a specific script ─────────────────────────────────────────
if [ "$FLAG" = "--script" ]; then
  SCRIPT_NAME="${4:-}"
  if [ -z "$SCRIPT_NAME" ]; then
    echo "Available scripts for $DOMAIN/$SECTION:"
    ls "$SECTION_DIR/scripts/" 2>/dev/null | sed 's/^/  • /' || echo "  (none)"
    exit 0
  fi
  SCRIPT_FILE="$SECTION_DIR/scripts/$SCRIPT_NAME"
  if [ ! -f "$SCRIPT_FILE" ]; then
    echo "Script not found: $SCRIPT_NAME"
    echo "Available:"
    ls "$SECTION_DIR/scripts/" 2>/dev/null | sed 's/^/  • /'
    exit 1
  fi
  cat "$SCRIPT_FILE"
  exit 0
fi

# ── Default: show tools.md for section ───────────────────────────────────────
TOOLS_FILE="$SECTION_DIR/tools.md"
if [ -f "$TOOLS_FILE" ]; then
  cat "$TOOLS_FILE"
else
  echo "No tools.md for $DOMAIN/$SECTION"
  echo ""
  echo "Contents of $SECTION_DIR:"
  ls "$SECTION_DIR/" 2>/dev/null | sed 's/^/  • /'
fi

# Stale warning using node
STALE=$(node -e "
const path = require('path');
try {
  const yaml = require(path.resolve('./browser/node_modules/js-yaml'));
  const fs = require('fs');
  const idx = yaml.load(fs.readFileSync('$SITE_DIR/_index.yml', 'utf8'));
  const sec = (idx.sections || {})['$SECTION'] || {};
  process.stdout.write(sec.stale ? 'STALE' : '');
} catch(e) { process.stdout.write(''); }
" 2>/dev/null) || true

if [ "$STALE" = "STALE" ]; then
  echo ""
  echo "WARNING: This section is marked STALE -- selectors may be outdated."
fi
