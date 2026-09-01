#!/usr/bin/env node
/**
 * Context budget meter.
 *
 *   node scripts/context-cost.mjs              # named budgets (cold start, second wave)
 *   node scripts/context-cost.mjs <file...>    # ad-hoc files
 *
 * Why tokens and not lines: density across this repo's docs runs from 5 to 32
 * tokens per line. A line budget passes files that cost five times their size.
 *
 * The tokenizer is o200k_base (GPT-4o) via `gpt-tokenizer` — a ±10% approximation
 * of Claude's tokenizer, which is not public. Good enough to compare against a
 * budget and to prove a before/after; not a billing figure.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

let encode;
try {
  ({ encode } = await import("gpt-tokenizer/model/gpt-4o"));
} catch {
  console.error(
    "gpt-tokenizer is missing — run `npm install` (it is a devDependency).",
  );
  process.exit(1);
}

/** Memory folder Claude Code uses for this project (see src/lib/project-slug.ts). */
const MEMORY_DIR = join(
  homedir(),
  ".claude/projects",
  ROOT.replace(/[^a-zA-Z0-9]/g, "-"),
  "memory",
);

/**
 * Named budgets. `budget` is the playbook's ceiling in tokens; null = measured
 * but not capped.
 */
const BUDGETS = [
  {
    title: "COLD START — loaded before the first line of the task",
    budget: 20_000,
    files: [
      join(homedir(), ".claude/CLAUDE.md"),
      join(ROOT, ".claude/CLAUDE.md"),
      join(MEMORY_DIR, "MEMORY.md"),
      join(ROOT, ".claude/HANDOFF.md"),
    ],
  },
  {
    title: "SECOND WAVE — read to work out what to do",
    budget: 12_000,
    files: [join(ROOT, "docs/_dev/tracker.md"), join(ROOT, "docs/_dev/scope.md")],
  },
];

/** Per-file ceilings, checked across all of docs/ and .claude/. */
const FILE_BUDGETS = [
  { match: /\.claude\/CLAUDE\.md$/, budget: 4_000, label: "CLAUDE.md" },
  { match: /\.claude\/HANDOFF\.md$/, budget: 5_000, label: "SessionStart injection" },
  { match: /_dev\/tracker\.md$/, budget: 4_000, label: "tracker" },
  { match: /docs\/.*\.md$/, budget: 8_000, label: "doc" },
];

function measure(path) {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  return { tokens: encode(text).length, lines: text.split("\n").length };
}

function short(path) {
  return path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path.replace(homedir(), "~");
}

function row(path, m) {
  const perLine = (m.tokens / m.lines).toFixed(1);
  return `${String(m.tokens).padStart(7)} tok  ${String(m.lines).padStart(4)} ln  ${perLine.padStart(5)} t/ln  ${short(path)}`;
}

const adHoc = process.argv.slice(2);
let failed = 0;

if (adHoc.length) {
  let total = 0;
  for (const p of adHoc) {
    const m = measure(p);
    if (!m) {
      console.log(`${"MISSING".padStart(7)}       ${p}`);
      continue;
    }
    total += m.tokens;
    console.log(row(p, m));
  }
  console.log(`${String(total).padStart(7)} TOTAL`);
  process.exit(0);
}

for (const group of BUDGETS) {
  console.log(`\n${group.title}`);
  let total = 0;
  for (const p of group.files) {
    const m = measure(p);
    if (!m) {
      console.log(`${"MISSING".padStart(7)}       ${short(p)}`);
      continue;
    }
    total += m.tokens;
    console.log(row(p, m));
  }
  const over = total > group.budget;
  if (over) failed++;
  console.log(
    `${String(total).padStart(7)} TOTAL  (budget ${group.budget}) ${over ? "OVER BUDGET" : "ok"}`,
  );
}

console.log("\nPER-FILE BUDGETS");
const { globSync } = await import("node:fs");
const docs = [
  ...globSync("docs/**/*.md", { cwd: ROOT }),
  ...globSync(".claude/*.md", { cwd: ROOT }),
].map((p) => join(ROOT, p));

for (const p of docs.sort()) {
  // Archived documents are not read during work — they are kept for "how did we measure".
  if (p.includes("/_dev/archive/")) continue;
  const rule = FILE_BUDGETS.find((r) => r.match.test(p));
  if (!rule) continue;
  const m = measure(p);
  if (!m || m.tokens <= rule.budget) continue;
  failed++;
  console.log(
    `${String(m.tokens).padStart(7)} tok  OVER ${rule.budget} (${rule.label})  ${short(p)}`,
  );
}
if (!failed) console.log("      — all within budget");

process.exit(failed ? 1 : 0);
