/**
 * Two start-up self-checks whose result is prepended to the server's MCP
 * instructions, so the agent reads them in its system context and tells the
 * user before anything else happens:
 *
 *  - **stale build** — `src/` is newer than the running `dist/`. The server is
 *    a long-lived process started from `dist/index.js`: editing `src/` without
 *    `npm run build` + a restart changes nothing, and the symptom (a fix that
 *    "didn't apply") costs far more to debug than this check costs to run.
 *  - **update available** — the checkout is behind its remote. Colleagues update
 *    by hand; nothing told them there was anything to pull.
 *
 * The remote check asks `git ls-remote`, not a hosting API: it reuses whatever
 * credentials the checkout already has (the private copy 404s on GitHub's API
 * without a token), spends no rate limit, and works with any remote. Its answer
 * is cached for a day.
 *
 * Both fail open: no git, no network, no remote, unreadable cache — the server
 * starts silently. A diagnostic must never be able to break a start.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PKG_ROOT } from "./scaffold.js";

const execFileP = promisify(execFile);

/**
 * The cache lives in the OS temp dir, not in the checkout: a state file inside
 * the repo shows up as untracked, and `update_server` refuses to run on a dirty
 * tree — the server would have blocked its own update. Keyed by checkout path
 * so the private and public copies don't share an answer.
 */
const CACHE_FILE = path.join(
  os.tmpdir(),
  `mcp-super-app-update-${crypto.createHash("sha1").update(PKG_ROOT).digest("hex").slice(0, 12)}.json`,
);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_TIMEOUT_MS = 3_000;
const REMOTE_TIMEOUT_MS = 5_000;

/**
 * Git with prompting disabled — an ls-remote that stops to ask for a password
 * would hang the server's start-up instead of failing open.
 */
async function git(args: string[], timeout = LOCAL_TIMEOUT_MS): Promise<string> {
  const { stdout } = await execFileP("git", ["-C", PKG_ROOT, ...args], {
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "echo" },
  });
  return stdout.trim();
}

/** Directories inside `src/` are shallow; this is a few dozen stat calls. */
async function newestMtime(dir: string): Promise<number> {
  let newest = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, await newestMtime(full));
    } else if (entry.isFile()) {
      const st = await fs.stat(full);
      newest = Math.max(newest, st.mtimeMs);
    }
  }
  return newest;
}

/** Files under `dir`, relative and sorted — must match scripts/build-stamp.mjs. */
async function listFiles(dir: string, base = dir, acc: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(full, base, acc);
    else if (entry.isFile()) acc.push(path.relative(base, full));
  }
  return acc.sort();
}

/** sha1 over «path + contents» of every source file, as written at build time. */
async function stampOf(srcDir: string): Promise<string> {
  const hash = crypto.createHash("sha1");
  for (const rel of await listFiles(srcDir)) {
    hash.update(rel);
    hash.update(await fs.readFile(path.join(srcDir, rel)));
  }
  return hash.digest("hex");
}

/**
 * True when `dist/` was built from sources that have since changed.
 *
 * Compares content, not timestamps: `git checkout` rewrites files and makes them
 * "newer" than `dist/` without changing a byte, so an mtime check cried wolf after
 * every branch switch — and a banner that lies is a banner nobody reads. The stamp
 * is written by `npm run build` (scripts/build-stamp.mjs); an install predating it
 * has no stamp, so we fall back to the old mtime comparison rather than stay silent.
 *
 * Skipped when this module itself runs from `src/` (npm run dev / tsx), where
 * `dist/` plays no part.
 */
export async function isBuildStale(moduleUrl: string): Promise<boolean> {
  if (!moduleUrl.includes("/dist/")) return false;
  const src = path.join(PKG_ROOT, "src");
  try {
    const stamp = await fs.readFile(path.join(PKG_ROOT, "dist", ".build-stamp"), "utf8");
    return stamp.trim() !== (await stampOf(src));
  } catch {
    // no stamp — fall through to the timestamp heuristic
  }
  try {
    const [dist, newest] = await Promise.all([
      fs.stat(path.join(PKG_ROOT, "dist", "index.js")),
      newestMtime(src),
    ]);
    return newest > dist.mtimeMs;
  } catch {
    return false; // no src/ (installed as a package) or no dist/ — nothing to compare
  }
}

export type UpdateStatus = {
  branch: string;
  /** Short sha the remote branch points at. */
  remote: string;
  /** Commits we're behind, or null when the remote history isn't fetched yet. */
  behind_by: number | null;
  /** Newest released version on the remote, or null when it publishes no tags. */
  version: string | null;
  /** Version this checkout was built from. */
  current: string;
};

type Cache = { checked_at: number; head: string; status: UpdateStatus | null };

async function readCache(head: string): Promise<Cache | null> {
  try {
    const cache = JSON.parse(await fs.readFile(CACHE_FILE, "utf8")) as Cache;
    const fresh = Date.now() - cache.checked_at < CACHE_TTL_MS;
    return fresh && cache.head === head ? cache : null;
  } catch {
    return null;
  }
}

/** Current branch, or null on a detached HEAD (nothing meaningful to compare). */
async function currentBranch(): Promise<string | null> {
  const branch = await git(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  return branch || null;
}

/** Version in the checkout's own package.json ("0.0.0" if unreadable). */
async function localVersion(): Promise<string> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(PKG_ROOT, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const asTuple = (v: string): number[] => v.split(".").map((n) => Number.parseInt(n, 10) || 0);

/** a > b, comparing X.Y.Z numerically. */
function isNewer(a: string, b: string): boolean {
  const [x, y] = [asTuple(a), asTuple(b)];
  for (let i = 0; i < 3; i += 1) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

/**
 * Newest `vX.Y.Z` tag on the remote, when it is ahead of ours. Tags are what a
 * release actually publishes, so this turns "ушла вперёд на 21 коммит" — true but
 * meaningless to the audience — into "доступна v0.2.0, у тебя v0.1.0".
 */
async function remoteVersion(current: string): Promise<string | null> {
  const out = await git(["ls-remote", "--tags", "origin"], REMOTE_TIMEOUT_MS).catch(() => "");
  const versions = [...out.matchAll(/refs\/tags\/v(\d+\.\d+\.\d+)(?:\^\{\})?$/gm)].map((m) => m[1]);
  if (versions.length === 0) return null;
  const newest = versions.reduce((a, b) => (isNewer(b, a) ? b : a));
  return isNewer(newest, current) ? newest : null;
}

async function compare(branch: string, head: string): Promise<UpdateStatus | null> {
  const line = await git(
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    REMOTE_TIMEOUT_MS,
  );
  const remote = line.split(/\s+/)[0];
  if (!remote || remote === head) return null;

  // The remote sha may or may not be in our object store. If it is, we can say
  // how far behind we are — and rule out the opposite case, a local commit that
  // simply hasn't been pushed yet (the maintainer mid-work; stay quiet there).
  const known = await git(["cat-file", "-e", `${remote}^{commit}`])
    .then(() => true)
    .catch(() => false);
  if (known) {
    const ancestor = await git(["merge-base", "--is-ancestor", remote, head])
      .then(() => true)
      .catch(() => false);
    if (ancestor) return null; // we're ahead of the remote, not behind
    const count = await git(["rev-list", "--count", `${head}..${remote}`]).catch(
      () => "",
    );
    const behind = Number.parseInt(count, 10);
    const current = await localVersion();
    return {
      branch,
      remote: remote.slice(0, 7),
      behind_by: Number.isFinite(behind) && behind > 0 ? behind : null,
      version: await remoteVersion(current),
      current,
    };
  }
  const current = await localVersion();
  return {
    branch,
    remote: remote.slice(0, 7),
    behind_by: null,
    version: await remoteVersion(current),
    current,
  };
}

/** Cached (24h) "is this checkout behind its remote" check. Null = up to date. */
export async function checkForUpdate(): Promise<UpdateStatus | null> {
  try {
    const [branch, head] = await Promise.all([
      currentBranch(),
      git(["rev-parse", "HEAD"]),
    ]);
    if (!branch || !head) return null;

    const cached = await readCache(head);
    if (cached) return cached.status;

    const status = await compare(branch, head);
    const cache: Cache = { checked_at: Date.now(), head, status };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache), "utf8").catch(() => {});
    return status;
  } catch {
    return null;
  }
}

/** Drop the cache so the next start re-checks (called after a successful update). */
export async function clearUpdateCache(): Promise<void> {
  await fs.rm(CACHE_FILE, { force: true }).catch(() => {});
}

/**
 * The banner prepended to the server instructions. Written at the agent, in the
 * imperative: a warning the agent reads and does not pass on is a warning that
 * did not happen.
 */
export function renderSelfCheckBanner(
  staleBuild: boolean,
  update: UpdateStatus | null,
): string {
  const lines: string[] = [];
  if (staleBuild) {
    lines.push(
      "⚠️ СБОРКА УСТАРЕЛА: файлы в `src/` новее запущенного `dist/`. Сервер работает по " +
        "старому коду, правки не применились. СРАЗУ скажи это пользователю и предложи " +
        "`npm run build` в каталоге сервера + перезапуск сессии.",
    );
  }
  if (update) {
    // Версия понятна любому; «отстаёшь на N коммитов» — только тому, кто читает git log.
    const what = update.version
      ? `версия v${update.version} (у тебя v${update.current})`
      : update.behind_by === null
        ? `ветка \`${update.branch}\` в origin ушла вперёд (там ${update.remote})`
        : `ветка \`${update.branch}\` в origin ушла вперёд на ${update.behind_by} коммит(ов) ` +
          `(там ${update.remote})`;
    lines.push(
      `⚠️ ДОСТУПНО ОБНОВЛЕНИЕ: ${what}. СРАЗУ скажи это пользователю и предложи вызвать ` +
        "`update_server` — он подтянет обновление сам. После этого нужен перезапуск сессии. " +
        "Если пользователь просит «запусти mcp-super-app» — добавь обновление отдельным " +
        "пунктом в то же меню AskUserQuestion (см. «Точки входа»).",
    );
  }
  return lines.join("\n\n");
}
