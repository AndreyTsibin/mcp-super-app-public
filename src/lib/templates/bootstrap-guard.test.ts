import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assetPath } from "../scaffold.js";

/**
 * Страж каркаса уезжает в чужие проекты, где его никто не чинит. Плейбук требует
 * проверять стража поломкой, а не наличием: «страж, который никогда не падал, обычно
 * не работает». Поэтому тесты ниже подсовывают ему реальные находки во временном
 * проекте и смотрят на код возврата, а не на исходник скрипта.
 */

const GUARD = assetPath("bootstrap", "claude", "scripts", "check-docs.mjs");

async function makeProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "guard-"));
  await fs.mkdir(path.join(root, ".claude", "scripts"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "_dev"), { recursive: true });
  await fs.copyFile(GUARD, path.join(root, ".claude", "scripts", "check-docs.mjs"));
  await fs.writeFile(path.join(root, ".claude", "CLAUDE.md"), "# CLAUDE\n\nЧисто.\n");
  await fs.writeFile(path.join(root, ".claude", "HANDOFF.md"), "# HANDOFF\n\nПусто.\n");
  return root;
}

function runGuard(root: string) {
  const r = spawnSync(process.execPath, [".claude/scripts/check-docs.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  return { status: r.status, out: r.stdout + r.stderr };
}

function git(root: string, ...args: string[]) {
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" },
  });
}

test("страж молчит на чистом проекте", async () => {
  const root = await makeProject();
  try {
    const { status, out } = runGuard(root);
    assert.equal(status, 0, out);
    assert.match(out, /чисто/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("страж падает на битой ссылке и протухшем пути", async () => {
  const root = await makeProject();
  try {
    await fs.writeFile(
      path.join(root, "docs", "_dev", "tracker.md"),
      "# tracker\n\n[в никуда](../nope.md), путь `src/lib/ghost.ts`\n",
    );
    const { status, out } = runGuard(root);
    assert.equal(status, 1, out);
    assert.match(out, /БИТЫЕ ССЫЛКИ/);
    assert.match(out, /ПРОТУХШИЕ ПУТИ К КОДУ/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("страж меряет раздувание в символах", async () => {
  const root = await makeProject();
  try {
    // 3 500 символов кириллицы — это ~1.3k токенов: строчный или токенный лимит такой
    // handoff пропустит, а «один экран» он уже давно не один экран.
    await fs.writeFile(path.join(root, ".claude", "HANDOFF.md"), `# HANDOFF\n\n${"х".repeat(3500)}`);
    const { status, out } = runGuard(root);
    assert.match(out, /РАЗДУВАНИЕ/);
    assert.match(out, /HANDOFF\.md\s+\d+ символов, бюджет 3000/);
    assert.equal(status, 0, "раздувание — предупреждение, не ошибка");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("страж замечает отставший handoff", async () => {
  const root = await makeProject();
  try {
    git(root, "init", "-q");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "init");
    for (const n of [1, 2, 3]) {
      await fs.writeFile(path.join(root, "docs", "_dev", `n${n}.md`), `# ${n}\n`);
      git(root, "add", "-A");
      git(root, "commit", "-qm", `work ${n}`);
    }
    const { status, out } = runGuard(root);
    assert.match(out, /HANDOFF ОТСТАЁТ: 3 коммитов/);
    assert.equal(status, 0, "отставание — предупреждение, не ошибка");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("вне git-репозитория страж про handoff молчит", async () => {
  const root = await makeProject();
  try {
    const { out } = runGuard(root);
    assert.doesNotMatch(out, /HANDOFF ОТСТАЁТ/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
