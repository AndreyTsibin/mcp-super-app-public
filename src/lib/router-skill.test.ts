import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { syncRouterSkill } from "./router-skill.js";
import { assetPath } from "./scaffold.js";

const made: string[] = [];

after(async () => {
  await Promise.all(made.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeHome(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "router-skill-test-"));
  made.push(dir);
  return dir;
}

const skillFile = (home: string): string =>
  path.join(home, ".claude", "skills", "mcp-super-app", "SKILL.md");

test("the shipped asset is a well-formed skill with the three entry points", async () => {
  const asset = await fs.readFile(assetPath("router", "SKILL.md"), "utf8");
  assert.match(asset, /^---\r?\nname: mcp-super-app\r?\n/);
  for (const tool of ["bootstrap_project", "create_website", "create_image"]) {
    assert.match(asset, new RegExp(tool), `menu is missing ${tool}`);
  }
  // No templating left: the file is installed byte for byte.
  assert.equal(/<!--/.test(asset), false, "HTML comment markers left in the asset");
});

test("syncRouterSkill: installs into an empty home", async () => {
  const home = await makeHome();
  const result = await syncRouterSkill({ home });
  assert.equal(result.changed, true);
  assert.equal(result.error, undefined);
  assert.equal(result.path, skillFile(home));
  const written = await fs.readFile(skillFile(home), "utf8");
  assert.match(written, /name: mcp-super-app/);
});

test("syncRouterSkill: the installed copy is the asset, byte for byte", async () => {
  const home = await makeHome();
  await syncRouterSkill({ home });
  assert.equal(
    await fs.readFile(skillFile(home), "utf8"),
    await fs.readFile(assetPath("router", "SKILL.md"), "utf8"),
  );
});

test("syncRouterSkill: a second call is a no-op", async () => {
  const home = await makeHome();
  await syncRouterSkill({ home });
  const before = await fs.stat(skillFile(home));
  const result = await syncRouterSkill({ home });
  assert.equal(result.changed, false);
  // Untouched, not merely identical: a rewrite every start would churn mtimes.
  assert.equal((await fs.stat(skillFile(home))).mtimeMs, before.mtimeMs);
});

test("syncRouterSkill: a stale copy is brought up to the asset", async () => {
  const home = await makeHome();
  await fs.mkdir(path.dirname(skillFile(home)), { recursive: true });
  await fs.writeFile(skillFile(home), "устаревшая версия\n", "utf8");
  const result = await syncRouterSkill({ home });
  assert.equal(result.changed, true);
  assert.match(await fs.readFile(skillFile(home), "utf8"), /name: mcp-super-app/);
});

test("syncRouterSkill: fails open when the target cannot be written", async () => {
  const home = await makeHome();
  // `~/.claude` is a file, so mkdir of the skills path cannot succeed.
  await fs.writeFile(path.join(home, ".claude"), "not a directory", "utf8");
  const result = await syncRouterSkill({ home });
  assert.equal(result.changed, false);
  assert.equal(typeof result.error, "string");
});

test("syncRouterSkill: a missing asset is reported, not thrown", async () => {
  const home = await makeHome();
  const result = await syncRouterSkill({
    home,
    source: path.join(home, "nope", "SKILL.md"),
  });
  assert.equal(result.changed, false);
  assert.match(result.error ?? "", /ENOENT/);
});
