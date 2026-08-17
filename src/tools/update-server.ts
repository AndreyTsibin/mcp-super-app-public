/**
 * Self-update: pull the server's own checkout, reinstall if the manifest moved,
 * rebuild, and tell the user to restart.
 *
 * It exists because the intended audience never opens a terminal — the install
 * doc is written at the agent, not at a human. Without it "there is an update"
 * (see `self-check.ts`) is a dead end for exactly the people who need it most.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ToolError, toolError } from "../lib/errors.js";
import { PKG_ROOT } from "../lib/scaffold.js";
import { clearUpdateCache } from "../lib/self-check.js";

const execFileP = promisify(execFile);

/** Windows resolves `npm` only through the shim; execFile does no PATHEXT lookup. */
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

const GIT_TIMEOUT_MS = 60_000;
const INSTALL_TIMEOUT_MS = 300_000;
const BUILD_TIMEOUT_MS = 180_000;

async function run(
  cmd: string,
  args: string[],
  timeout: number,
): Promise<string> {
  const { stdout, stderr } = await execFileP(cmd, args, {
    cwd: PKG_ROOT,
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });
  return `${stdout}${stderr}`.trim();
}

function tail(s: string, max = 600): string {
  const t = s.trim();
  return t.length > max ? `…${t.slice(-max)}` : t;
}

async function git(...args: string[]): Promise<string> {
  return run("git", ["-C", PKG_ROOT, ...args], GIT_TIMEOUT_MS);
}

export const updateServerOutputSchema = {
  updated: z.boolean().describe("False when the checkout was already current."),
  changelog: z
    .array(z.string())
    .describe("CHANGELOG sections that are new since the previous version, newest first."),
  from: z.string().describe("Short sha before the pull."),
  to: z.string().describe("Short sha after the pull."),
  commits: z.array(z.string()).describe("Commits pulled in, newest first."),
  reinstalled: z.boolean().describe("Whether npm install ran (manifest changed)."),
  rebuilt: z.boolean(),
};

type Result = {
  updated: boolean;
  changelog: string[];
  from: string;
  to: string;
  commits: string[];
  reinstalled: boolean;
  rebuilt: boolean;
};

/** Split a CHANGELOG into `## …` sections, keyed by heading. */
function sectionsOf(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of text.split(/\n(?=## )/)) {
    const heading = block.match(/^## .*/)?.[0];
    if (heading) out.set(heading.trim(), block.trim());
  }
  return out;
}

/**
 * Version sections added between `from` and now — the human-readable half of the
 * report. Commit subjects are English conventional commits; the audience for this
 * server reads Russian and does not care which file moved.
 */
async function changelogSince(from: string): Promise<string[]> {
  let current: string;
  try {
    current = await fs.readFile(path.join(PKG_ROOT, "CHANGELOG.md"), "utf8");
  } catch {
    return []; // нет файла — просто нечего показывать
  }
  let previous = "";
  try {
    previous = await git("show", `${from}:CHANGELOG.md`);
  } catch {
    // до этой версии файла не было — покажем всё, что есть сейчас
  }
  const seen = new Set(sectionsOf(previous).keys());
  return [...sectionsOf(current).entries()]
    .filter(([heading, body]) => !seen.has(heading) && !/Не выпущено/.test(heading) && body.length > heading.length)
    .map(([, body]) => body);
}

async function runUpdate(): Promise<Result> {
  try {
    await git("rev-parse", "--git-dir");
  } catch {
    throw new ToolError(
      `Каталог сервера не является git-репозиторием: ${PKG_ROOT}`,
      "Обновиться можно только у клона репозитория. Переустанови сервер клонированием.",
    );
  }

  // Tracked files only: a stray untracked file is not a reason to refuse an
  // update, and `pull --ff-only` reports the one case that does collide itself.
  const dirty = await git("status", "--porcelain", "--untracked-files=no");
  if (dirty) {
    throw new ToolError(
      "В каталоге сервера есть незакоммиченные изменения — обновление отменено.",
      `Файлы:\n${tail(dirty, 400)}\nСохрани или откати их, потом вызови update_server снова. ` +
        "Тул намеренно не трогает чужую работу.",
    );
  }

  const from = await git("rev-parse", "--short", "HEAD");
  try {
    await git("pull", "--ff-only");
  } catch (error) {
    const detail = (error as { stderr?: string }).stderr || String(error);
    throw new ToolError(
      "git pull не прошёл.",
      `${tail(detail)}\nЧастые причины: ветка разошлась с origin (нужен ручной разбор), ` +
        "нет доступа к репозиторию или нет сети.",
    );
  }
  const to = await git("rev-parse", "--short", "HEAD");

  if (from === to) {
    return { updated: false, from, to, commits: [], changelog: [], reinstalled: false, rebuilt: false };
  }

  const commits = (await git("log", "--oneline", `${from}..${to}`))
    .split("\n")
    .filter(Boolean)
    .slice(0, 20);

  // npm install is the slow step; run it only when the manifest actually moved.
  const changed = await git("diff", "--name-only", from, to);
  const reinstalled = /(^|\n)package(-lock)?\.json/.test(changed);
  if (reinstalled) await run(NPM, ["install"], INSTALL_TIMEOUT_MS);

  try {
    await run(NPM, ["run", "build"], BUILD_TIMEOUT_MS);
  } catch (error) {
    const detail =
      (error as { stdout?: string; stderr?: string }).stdout ||
      (error as { stderr?: string }).stderr ||
      String(error);
    throw new ToolError(
      `Обновление скачано (${from} → ${to}), но сборка упала — сервер остался на старом dist/.`,
      `${tail(detail, 800)}\nПочини ошибку сборки или откатись: git -C ${PKG_ROOT} reset --keep ${from}`,
    );
  }

  await clearUpdateCache();
  return { updated: true, from, to, commits, changelog: await changelogSince(from), reinstalled, rebuilt: true };
}

function formatReport(r: Result): string {
  if (!r.updated) {
    return `Сервер уже на свежей версии (${r.to}). Ничего не делал.`;
  }
  const lines = [
    `Сервер обновлён: ${r.from} → ${r.to} (${r.commits.length} коммит(ов)).`,
    r.reinstalled ? "Зависимости переустановлены (менялся манифест)." : "Зависимости не менялись.",
    "Сборка прошла.",
    "",
    // CHANGELOG написан для пользователя, коммиты — для разработчика. Есть первое —
    // показываем его, второе уходит в structuredContent и в отчёт не лезет.
    ...(r.changelog.length
      ? ["Что нового:", "", ...r.changelog, ""]
      : ["Что приехало:", ...r.commits.map((c) => `  • ${c}`), ""]),
    "⚠️ ВАЖНО: сервер — запущенный процесс, новый код подхватится только после рестарта.",
    "ОСТАНОВИСЬ и попроси пользователя перезапустить приложение/сессию Claude Code.",
  ];
  return lines.join("\n");
}

export function registerUpdateServer(server: McpServer): void {
  server.registerTool(
    "update_server",
    {
      title: "Update MCP server",
      description:
        `Update this MCP server itself: git pull --ff-only in its own checkout (${path.basename(PKG_ROOT)}), ` +
        "npm install when the manifest changed, then npm run build. Call it when the server " +
        "instructions report an available update, or when the user asks to update the server / " +
        "get the latest version. Refuses when the checkout has uncommitted changes — it never " +
        "touches work in progress. IMPORTANT: the running process keeps the old code, so after a " +
        "successful update STOP and ask the user to restart the Claude Code app/session.",
      outputSchema: updateServerOutputSchema,
    },
    async () => {
      try {
        const result = await runUpdate();
        return {
          content: [{ type: "text" as const, text: formatReport(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
