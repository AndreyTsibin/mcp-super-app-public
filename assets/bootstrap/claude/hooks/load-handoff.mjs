#!/usr/bin/env node
// Подаёт последний handoff из прошлой сессии в контекст новой — cold-start.
// Node вместо bash: работает и на Windows, где bash может не оказаться.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Обычно путь приходит от Claude Code; если переменной нет — считаем от самого
// скрипта: <project>/.claude/hooks/load-handoff.mjs → два уровня вверх.
const projectDir =
  process.env.CLAUDE_PROJECT_DIR ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

try {
  const handoff = readFileSync(path.join(projectDir, ".claude", "HANDOFF.md"), "utf8");
  if (handoff.trim() !== "") {
    process.stdout.write(
      `=== COLD START — handoff из прошлой сессии (продолжай отсюда) ===\n${handoff}\n=== /COLD START ===\n`,
    );
  }
} catch {
  // Файла нет или не читается — тишина, cold start просто не сработает.
}
