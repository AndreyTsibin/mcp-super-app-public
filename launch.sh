#!/usr/bin/env bash
# Auto-updating launcher for mcp-super-app: pulls the latest version before
# every start, but never blocks the server on a network hiccup or a broken
# build — it falls back to whatever dist/index.js already exists on disk.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

update_and_build() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0

  local before after
  before="$(git rev-parse HEAD 2>/dev/null || echo "")"
  git pull --quiet --ff-only >/dev/null 2>&1 || return 0
  after="$(git rev-parse HEAD 2>/dev/null || echo "")"

  # Nothing changed and a build already exists — skip the rebuild, it would
  # otherwise add npm's startup cost to every single session.
  if [ "$before" = "$after" ] && [ -f dist/index.js ]; then
    return 0
  fi

  npm install --silent --no-fund --no-audit >/dev/null 2>&1
  npm run build --silent >/dev/null 2>&1
}

update_and_build

if [ ! -f dist/index.js ]; then
  echo "mcp-super-app: dist/index.js отсутствует и автосборка не удалась." >&2
  echo "Собери вручную: cd '$DIR' && npm install && npm run build" >&2
  exit 1
fi

exec node dist/index.js
