import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { renderRouterSkill, syncRouterSkill } from "./router-skill.js";
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

const TEMPLATE = `---
name: mcp-super-app
---
<!-- magnific:start -->
- с ключом
<!-- magnific:end -->
<!-- no-magnific:start -->
- без ключа
<!-- no-magnific:end -->
конец
`;

test("renderRouterSkill: keeps exactly one create_image variant", () => {
  assert.equal(renderRouterSkill(TEMPLATE, true), "---\nname: mcp-super-app\n---\n- с ключом\nконец\n");
  assert.equal(renderRouterSkill(TEMPLATE, false), "---\nname: mcp-super-app\n---\n- без ключа\nконец\n");
});

test("renderRouterSkill: the shipped asset leaves no markers behind", async () => {
  const template = await fs.readFile(assetPath("router", "SKILL.md"), "utf8");
  for (const magnific of [true, false]) {
    const rendered = renderRouterSkill(template, magnific);
    assert.equal(/<!--/.test(rendered), false, `markers left with magnific=${magnific}`);
    assert.match(rendered, /^---\nname: mcp-super-app\n/);
    assert.match(rendered, /create_image/);
  }
  assert.match(renderRouterSkill(template, true), /Magnific/);
  assert.equal(/Magnific/.test(renderRouterSkill(template, false)), false);
});

test("syncRouterSkill: installs into an empty home", async () => {
  const home = await makeHome();
  const result = await syncRouterSkill({ home, magnific: false });
  assert.equal(result.changed, true);
  assert.equal(result.error, undefined);
  assert.equal(result.path, skillFile(home));
  const written = await fs.readFile(skillFile(home), "utf8");
  assert.match(written, /name: mcp-super-app/);
});

test("syncRouterSkill: a second call is a no-op", async () => {
  const home = await makeHome();
  await syncRouterSkill({ home, magnific: false });
  const before = await fs.stat(skillFile(home));
  const result = await syncRouterSkill({ home, magnific: false });
  assert.equal(result.changed, false);
  // Untouched, not merely identical: a rewrite every start would churn mtimes.
  assert.equal((await fs.stat(skillFile(home))).mtimeMs, before.mtimeMs);
});

test("syncRouterSkill: a stale copy is brought up to the asset", async () => {
  const home = await makeHome();
  await fs.mkdir(path.dirname(skillFile(home)), { recursive: true });
  await fs.writeFile(skillFile(home), "устаревшая версия\n", "utf8");
  const result = await syncRouterSkill({ home, magnific: false });
  assert.equal(result.changed, true);
  assert.match(await fs.readFile(skillFile(home), "utf8"), /name: mcp-super-app/);
});

test("syncRouterSkill: the magnific gate decides which variant lands", async () => {
  const home = await makeHome();
  await syncRouterSkill({ home, magnific: true });
  assert.match(await fs.readFile(skillFile(home), "utf8"), /Magnific/);
  // Losing the key rewrites the installed copy, it does not leave the old one.
  assert.equal((await syncRouterSkill({ home, magnific: false })).changed, true);
  assert.equal(/Magnific/.test(await fs.readFile(skillFile(home), "utf8")), false);
});

test("syncRouterSkill: fails open when the target cannot be written", async () => {
  const home = await makeHome();
  // `~/.claude` is a file, so mkdir of the skills path cannot succeed.
  await fs.writeFile(path.join(home, ".claude"), "not a directory", "utf8");
  const result = await syncRouterSkill({ home, magnific: false });
  assert.equal(result.changed, false);
  assert.equal(typeof result.error, "string");
});

test("syncRouterSkill: a missing asset is reported, not thrown", async () => {
  const home = await makeHome();
  const result = await syncRouterSkill({
    home,
    magnific: false,
    source: path.join(home, "nope", "SKILL.md"),
  });
  assert.equal(result.changed, false);
  assert.match(result.error ?? "", /ENOENT/);
});
