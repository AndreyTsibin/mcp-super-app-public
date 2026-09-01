import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { mergeHook } from "./settings-merge.js";

const ASSETS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
);
const GUARD = path.join(ASSETS, "guard", "destructive-guard.mjs");
const HANDOFF_HOOK = path.join(ASSETS, "bootstrap", "claude", "hooks", "load-handoff.mjs");

/** Run a hook script the way Claude Code does: node <script>, JSON on stdin. */
function runHook(
  script: string,
  stdin: string,
  env: NodeJS.ProcessEnv = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [script],
      { env: { ...process.env, ...env } },
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
    child.stdin?.end(stdin);
  });
}

/** The guard's verdict for one Bash command: its reason, or "" for allow. */
async function verdict(command: string): Promise<string> {
  const out = await runHook(GUARD, JSON.stringify({ tool_input: { command } }));
  if (out.trim() === "") return "";
  return JSON.parse(out).hookSpecificOutput.permissionDecisionReason;
}

async function tmpdir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "mcp-super-app-hooks-"));
}

test("guard blocks destructive commands", async () => {
  assert.match(await verdict("rm -rf build"), /trash/);
  assert.match(await verdict("cd /tmp && rm foo"), /trash/);
  assert.match(await verdict("git reset --hard HEAD~1"), /reset --hard/);
  assert.match(await verdict("git clean -fd"), /clean -f/);
  assert.match(await verdict("git push --force origin main"), /push --force/);
});

test("guard allows safe lookalikes", async () => {
  assert.equal(await verdict("git rm --cached secrets.json"), "");
  assert.equal(await verdict("git push --force-with-lease origin main"), "");
  assert.equal(await verdict("ls -la && git status"), "");
  assert.equal(await verdict("npm run build"), "");
});

test("guard fails open on unusable input", async () => {
  assert.equal(await runHook(GUARD, "not json at all"), "");
  assert.equal(await runHook(GUARD, JSON.stringify({ tool_input: {} })), "");
  assert.equal(await runHook(GUARD, ""), "");
});

test("handoff hook prints the handoff, and stays quiet without one", async () => {
  const dir = await tmpdir();
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });

  const empty = await runHook(HANDOFF_HOOK, "", { CLAUDE_PROJECT_DIR: dir });
  assert.equal(empty, "");

  await fs.writeFile(path.join(dir, ".claude", "HANDOFF.md"), "Где встали: на тестах\n");
  const out = await runHook(HANDOFF_HOOK, "", { CLAUDE_PROJECT_DIR: dir });
  assert.match(out, /COLD START/);
  assert.match(out, /Где встали: на тестах/);
});

test("hook merge replaces the legacy bash entry instead of duplicating it", async () => {
  const dir = await tmpdir();
  const settingsPath = path.join(dir, "settings.json");
  await fs.writeFile(
    settingsPath,
    JSON.stringify({
      permissions: { allow: ["Bash(ls:*)"] },
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: 'bash "$HOME/.claude/hooks/guard.sh"' }],
          },
        ],
      },
    }),
  );

  const opts = {
    event: "PreToolUse",
    matcher: "Bash",
    command: "node",
    args: ["/home/u/.claude/hooks/guard.mjs"],
    marker: "guard.mjs",
    replaces: ["guard.sh"],
  };

  const migrated = await mergeHook(settingsPath, opts);
  assert.equal(migrated.status, "migrated");

  const after = JSON.parse(await fs.readFile(settingsPath, "utf8"));
  const hooks = after.hooks.PreToolUse[0].hooks;
  assert.equal(hooks.length, 1, "legacy entry must be rewritten, not duplicated");
  assert.deepEqual(hooks[0], {
    type: "command",
    command: "node",
    args: ["/home/u/.claude/hooks/guard.mjs"],
  });
  assert.deepEqual(after.permissions, { allow: ["Bash(ls:*)"] }, "rest of the file survives");

  // Second run has nothing left to migrate.
  assert.equal((await mergeHook(settingsPath, opts)).status, "already-present");
});
