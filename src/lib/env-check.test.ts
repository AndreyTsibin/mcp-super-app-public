import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { checkEnv, parseEnvExample, parseEnvValues } from "./env-check.js";

const made: string[] = [];

after(async () => {
  await Promise.all(made.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

/** A temp checkout with the given `.env.example` and, optionally, a `.env`. */
async function makeRoot(example: string | null, env?: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "env-check-test-"));
  made.push(dir);
  if (example !== null) await fs.writeFile(path.join(dir, ".env.example"), example, "utf8");
  if (env !== undefined) await fs.writeFile(path.join(dir, ".env"), env, "utf8");
  return dir;
}

const EXAMPLE = `# Заголовок файла, к ключу не относится.

# Обязателен для create_image.
OPENROUTER_API_KEY=

# Второй движок, нужен платный план.
# optional
MAGNIFIC_API_KEY=
`;

test("parseEnvExample: required by default, opt out with the optional tag", () => {
  const keys = parseEnvExample(EXAMPLE);
  assert.deepEqual([...keys.keys()], ["OPENROUTER_API_KEY", "MAGNIFIC_API_KEY"]);
  assert.equal(keys.get("OPENROUTER_API_KEY")?.optional, false);
  assert.equal(keys.get("MAGNIFIC_API_KEY")?.optional, true);
});

test("parseEnvExample: a blank line ends the comment block", () => {
  // Without the reset the tag would leak onto the next key down the file.
  const keys = parseEnvExample("# optional\nA=\n\nB=\n");
  assert.equal(keys.get("A")?.optional, true);
  assert.equal(keys.get("B")?.optional, false);
});

test("parseEnvValues: only non-empty values count as set", () => {
  const set = parseEnvValues("A=1\nB=\nC=   \n# D=commented\nexport E=5\n");
  assert.deepEqual([...set], ["A", "E"]);
});

test("checkEnv: silent when every required key is filled in", async () => {
  const root = await makeRoot(EXAMPLE, "OPENROUTER_API_KEY=sk-test\n");
  assert.equal(await checkEnv(root, {}), null);
});

test("checkEnv: reports a required key the user has not set", async () => {
  const root = await makeRoot(EXAMPLE, "OPENROUTER_API_KEY=\n");
  assert.deepEqual(await checkEnv(root, {}), {
    missing: ["OPENROUTER_API_KEY"],
    hasEnvFile: true,
  });
});

test("checkEnv: an optional key stays silent when missing", async () => {
  const root = await makeRoot(EXAMPLE, "OPENROUTER_API_KEY=sk-test\n");
  const status = await checkEnv(root, {});
  assert.equal(status, null, "MAGNIFIC_API_KEY is tagged optional");
});

test("checkEnv: a key added by an update is caught", async () => {
  // The user's .env predates the update, so it has no line for the new key.
  const root = await makeRoot(`${EXAMPLE}\n# Новая интеграция.\nNEW_API_KEY=\n`, "OPENROUTER_API_KEY=sk-test\n");
  assert.deepEqual((await checkEnv(root, {}))?.missing, ["NEW_API_KEY"]);
});

test("checkEnv: no .env at all is a distinct state", async () => {
  const root = await makeRoot(EXAMPLE);
  assert.deepEqual(await checkEnv(root, {}), {
    missing: ["OPENROUTER_API_KEY"],
    hasEnvFile: false,
  });
});

test("checkEnv: a key exported in the environment counts as set", async () => {
  const root = await makeRoot(EXAMPLE);
  assert.equal(await checkEnv(root, { OPENROUTER_API_KEY: "sk-from-shell" }), null);
  assert.deepEqual(
    (await checkEnv(root, { OPENROUTER_API_KEY: "  " }))?.missing,
    ["OPENROUTER_API_KEY"],
    "whitespace is not a key",
  );
});

test("checkEnv: no .env.example — nothing to compare against", async () => {
  const root = await makeRoot(null, "OPENROUTER_API_KEY=sk-test\n");
  assert.equal(await checkEnv(root, {}), null);
});
