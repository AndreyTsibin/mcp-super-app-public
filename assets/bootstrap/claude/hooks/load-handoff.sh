#!/usr/bin/env bash
# Подаёт последний handoff из прошлой сессии в контекст новой — cold-start.
HANDOFF="${CLAUDE_PROJECT_DIR}/.claude/HANDOFF.md"
if [ -s "$HANDOFF" ]; then
  echo "=== COLD START — handoff из прошлой сессии (продолжай отсюда) ==="
  cat "$HANDOFF"
  echo "=== /COLD START ==="
fi
