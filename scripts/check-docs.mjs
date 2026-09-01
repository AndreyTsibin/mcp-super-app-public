#!/usr/bin/env node
/**
 * Docs guard: broken markdown links + stale code paths in backticks.
 *
 *   node scripts/check-docs.mjs           # exit 1 on findings
 *   node scripts/check-docs.mjs --verbose # also list what was skipped and why
 *
 * Two checks, because they rot differently. Markdown links are visibly broken and
 * tend to stay correct; paths in backticks are read by nobody and rot silently —
 * that is where a refactor leaves its debris.
 *
 * THE REPO-SPECIFIC PART: most markdown here is template material this server writes
 * into OTHER projects (`assets/`). Paths inside it point at the generated project and
 * MUST NOT resolve here. Those are resolved against the template root and, failing
 * that, skipped — otherwise the guard reports 100+ false findings and stops being read.
 */

import { readFileSync, existsSync, globSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const VERBOSE = process.argv.includes("--verbose");

/**
 * Files excluded from the path check, each with the reason it is excluded.
 * An exclusion without a reason becomes indistinguishable from a bug in six months.
 */
const EXCLUDED = [
  {
    match: /^docs\/_dev\/archive\//,
    why: "closed documents: quoting paths that no longer exist is what an archive is for",
  },
  {
    match: /^docs\/architecture\/context-playbook\.md$/,
    why: "external playbook: its paths are examples for any project, not ours",
  },
  {
    match: /^(INSTALL|README)\.md$/,
    why: "written for the reader's own machine and their generated projects",
  },
  {
    match: /^docs\/architecture\/(INSTALL|PROJECT-BOOTSTRAP)\.md$/,
    why: "methodology handed to the generated project, describes ITS layout",
  },
  {
    match: /^CHANGELOG\.md$/,
    why: "records what a path was called at release time; renames must not rewrite history",
  },
];

/** Extensions that look like code paths worth checking. */
const CODE_EXT = "ts|tsx|js|mjs|cjs|json|md|xml|csv|php|css|astro|sh|yml|yaml";

// `.claude/*.md` is listed separately: a leading-dot directory does not match `**`,
// and CLAUDE.md / HANDOFF.md are the two most-read files in the repo.
const files = [
  ...globSync("**/*.md", { cwd: ROOT }),
  ...globSync(".claude/*.md", { cwd: ROOT }),
]
  .filter((p) => !p.includes("node_modules") && !p.startsWith("dist/"))
  .sort();

/** Strip fenced blocks so syntax examples never count as findings. */
function withoutFences(text) {
  let inside = false;
  return text.split("\n").map((line) => {
    if (/^\s*```/.test(line)) {
      inside = !inside;
      return "";
    }
    return inside ? "" : line;
  });
}

/** Template roots: a path inside them resolves against the generated project. */
function templateRoot(file) {
  const m = file.match(/^assets\/(bootstrap|landing|multipage|skills\/[^/]+|commands\/[^/]+)\//);
  return m ? join(ROOT, "assets", m[1]) : null;
}

function resolvesAnywhere(file, path) {
  // `node_modules` is a base on purpose: docs legitimately point at files inside a
  // dependency (`lucide-static/tags.json`), and those rot the same way ours do.
  const bases = [
    ROOT,
    join(ROOT, dirname(file)),
    join(ROOT, "src"),
    join(ROOT, "assets"),
    join(ROOT, "node_modules"),
  ];
  const tpl = templateRoot(file);
  if (tpl) bases.push(tpl, join(tpl, "site"), join(tpl, "docs"));
  return bases.some((b) => existsSync(join(b, path)));
}

const brokenLinks = [];
const stalePaths = [];
const skipped = [];

for (const file of files) {
  const excluded = EXCLUDED.find((e) => e.match.test(file));
  const lines = withoutFences(readFileSync(join(ROOT, file), "utf8"));
  const insideTemplate = file.startsWith("assets/");

  lines.forEach((rawLine, i) => {
    const at = `${file}:${i + 1}`;

    // --- 1. markdown links: [text](path) --------------------------------------
    // Inline code is dropped first: `[text](path)` in a table is a syntax example.
    const line = rawLine.replace(/`[^`]*`/g, "");
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g)) {
      const target = m[1].split("#")[0].trim();
      if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
      if (existsSync(join(ROOT, dirname(file), target))) continue;
      if (insideTemplate && !excluded) {
        skipped.push({ at, path: target, why: "template link → generated project" });
        continue;
      }
      if (excluded) {
        skipped.push({ at, path: target, why: excluded.why });
        continue;
      }
      brokenLinks.push({ at, path: target });
    }

    // --- 2. code paths in backticks ------------------------------------------
    if (excluded) return;
    for (const m of rawLine.matchAll(new RegExp("`([A-Za-z0-9_./()@-]+\\.(?:" + CODE_EXT + "))`", "g"))) {
      const path = m[1];
      if (!path.includes("/") || path.startsWith("@") || path.startsWith("/")) continue;
      if (resolvesAnywhere(file, path)) continue;
      if (insideTemplate) {
        skipped.push({ at, path, why: "template path → generated project" });
        continue;
      }
      stalePaths.push({ at, path });
    }
  });
}

const report = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length}):`);
  for (const f of items) console.log(`  ${f.at}  →  ${f.path}`);
};

report("BROKEN MARKDOWN LINKS", brokenLinks);
report("STALE CODE PATHS", stalePaths);

if (VERBOSE) {
  console.log(`\nskipped ${skipped.length} (templates and documented exclusions):`);
  for (const s of skipped) console.log(`  ${s.at}  →  ${s.path}  [${s.why}]`);
}

const total = brokenLinks.length + stalePaths.length;
console.log(
  total
    ? `\n${total} finding(s) in ${files.length} markdown files.`
    : `\nclean — ${files.length} markdown files, ${skipped.length} skipped as template/excluded.`,
);
process.exit(total ? 1 : 0);
