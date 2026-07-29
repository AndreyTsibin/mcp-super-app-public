import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { ToolError } from "./errors.js";
import { assertProjectDir } from "./scaffold.js";

const HOME = path.resolve(os.homedir());
const CLAUDE_DIR = path.join(HOME, ".claude");

/** Assert the call rejects with a ToolError whose message includes `needle`. */
async function rejectsWith(projectPath: string, needle: RegExp): Promise<void> {
  await assert.rejects(assertProjectDir(projectPath), (err: unknown) => {
    assert.ok(err instanceof ToolError, `expected ToolError, got ${err}`);
    assert.match(err.message, needle);
    return true;
  });
}

test("rejects a relative path", async () => {
  await rejectsWith("relative/path", /absolute path/);
});

test("rejects the home directory itself", async () => {
  await rejectsWith(HOME, /global config location/);
});

test("rejects the home directory with a trailing slash", async () => {
  await rejectsWith(HOME + path.sep, /global config location/);
});

test("rejects ~/.claude", async () => {
  await rejectsWith(CLAUDE_DIR, /global config location/);
});

test("rejects a parent of ~/.claude (e.g. /Users)", async () => {
  await rejectsWith(path.dirname(HOME), /global config location/);
});

test("rejects the filesystem root", async () => {
  await rejectsWith(path.parse(HOME).root, /global config location/);
});

test("rejects a non-normalized path that resolves to $HOME", async () => {
  await rejectsWith(path.join(CLAUDE_DIR, ".."), /global config location/);
});

// A real, existing project directory unrelated to global config must pass.
let tmpProject: string;

before(async () => {
  tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), "scaffold-guard-"));
});

after(async () => {
  await fs.rm(tmpProject, { recursive: true, force: true });
});

test("accepts a real project directory", async () => {
  await assert.doesNotReject(assertProjectDir(tmpProject));
});

test("accepts a subdirectory of ~/.claude (e.g. install targets under it)", async () => {
  // Only ~/.claude and its ancestors are blocked; children are legitimate
  // targets (this mirrors install_guard's own ~/.claude/hooks writes, which
  // go through a different path but must not be forbidden by policy).
  const child = path.join(CLAUDE_DIR, "skills", "some-skill");
  // Existence check runs after the guard; a missing dir throws "not found",
  // NOT the global-config refusal — that's the distinction we assert.
  await assert.rejects(assertProjectDir(child), (err: unknown) => {
    assert.ok(err instanceof ToolError);
    assert.doesNotMatch(err.message, /global config location/);
    return true;
  });
});

test("rejects a non-existent (but otherwise valid) directory", async () => {
  await rejectsWith(path.join(tmpProject, "nope"), /not found/);
});
