import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { ensureIgnored } from "./gitignore.js";

const SKILLS = [".claude/skills/"];

const made: string[] = [];

/** A fresh temp directory; `repo: true` also runs `git init` in it. */
async function makeDir(repo: boolean): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gitignore-test-"));
  made.push(dir);
  if (repo) execFileSync("git", ["-C", dir, "init", "-q"]);
  return dir;
}

after(async () => {
  await Promise.all(made.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function writeIgnore(dir: string, content: string): Promise<void> {
  await fs.writeFile(path.join(dir, ".gitignore"), content, "utf8");
}

function readIgnore(dir: string): Promise<string> {
  return fs.readFile(path.join(dir, ".gitignore"), "utf8");
}

/** True when git considers `probe` ignored inside `dir`. */
function ignored(dir: string, probe: string): boolean {
  try {
    execFileSync("git", ["-C", dir, "check-ignore", "-q", "--", probe], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("leaves an equivalent pattern alone, keeping its negations alive", async () => {
  const dir = await makeDir(true);
  const original = [
    ".claude/skills/*",
    "!.claude/skills/niche-research/",
    "!.claude/skills/copywriting/",
    "!.claude/skills/image-prompts/",
    "",
  ].join("\n");
  await writeIgnore(dir, original);

  const added = await ensureIgnored(dir, SKILLS);

  assert.deepEqual(added, []);
  assert.equal(await readIgnore(dir), original);
  // The point of the fix: the versioned core skills stay visible to git.
  assert.equal(ignored(dir, ".claude/skills/ui-ux-pro-max/SKILL.md"), true);
  assert.equal(ignored(dir, ".claude/skills/niche-research/SKILL.md"), false);
});

test("creates .gitignore when the project has none", async () => {
  const dir = await makeDir(true);

  const added = await ensureIgnored(dir, SKILLS);

  assert.deepEqual(added, [...SKILLS]);
  assert.match(await readIgnore(dir), /^# Skills .*\n\.claude\/skills\/\n$/m);
});

test("appends under existing unrelated rules", async () => {
  const dir = await makeDir(true);
  await writeIgnore(dir, "node_modules/\ndist/\n");

  const added = await ensureIgnored(dir, SKILLS);

  assert.deepEqual(added, [...SKILLS]);
  const content = await readIgnore(dir);
  assert.match(content, /^node_modules\/$/m);
  assert.match(content, /^\.claude\/skills\/$/m);
});

test("falls back to literal comparison outside a git repository", async () => {
  const dir = await makeDir(false);
  await writeIgnore(dir, ".claude/skills/\n");

  // Literal match — nothing to add.
  assert.deepEqual(await ensureIgnored(dir, SKILLS), []);
  // No literal match, and git cannot be asked — append.
  assert.deepEqual(await ensureIgnored(dir, ["skills-lock.json"]), ["skills-lock.json"]);
  assert.match(await readIgnore(dir), /^skills-lock\.json$/m);
});

test("is idempotent across repeated calls", async () => {
  const dir = await makeDir(true);
  const patterns = [".claude/skills/", ".agents/skills/", "skills-lock.json"];

  assert.deepEqual(await ensureIgnored(dir, patterns), patterns);
  const first = await readIgnore(dir);

  assert.deepEqual(await ensureIgnored(dir, patterns), []);
  assert.equal(await readIgnore(dir), first);
});

test("adds only the patterns git does not already cover", async () => {
  const dir = await makeDir(true);
  await writeIgnore(dir, ".claude/skills/*\n");

  const added = await ensureIgnored(dir, [".claude/skills/", ".claude/commands/diagram.md"]);

  assert.deepEqual(added, [".claude/commands/diagram.md"]);
  assert.doesNotMatch(await readIgnore(dir), /^\.claude\/skills\/$/m);
});
