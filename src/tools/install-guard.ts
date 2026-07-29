import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { runInstallGuard, type InstallGuardResult } from "../lib/guard-install.js";

export const installGuardInputSchema = {
  target: z
    .enum(["user", "project"])
    .optional()
    .describe(
      "Where to install: 'user' → ~/.claude (global, default), 'project' → <project_path>/.claude.",
    ),
  project_path: z
    .string()
    .min(1)
    .optional()
    .describe("Absolute project path. Required when target='project'."),
};

export const installGuardOutputSchema = {
  target: z.enum(["user", "project"]),
  script_path: z.string().describe("Where the guard script was installed."),
  script_status: z
    .enum(["created", "skipped"])
    .describe("Whether the script was newly written or already present."),
  settings_path: z.string(),
  hook_status: z
    .enum(["created", "added", "already-present"])
    .describe("Result of merging the hook into settings.json."),
  protects: z.array(z.string()).describe("What the guard blocks."),
  warnings: z.array(z.string()).describe("Non-fatal issues (e.g. jq missing)."),
};

function formatReport(r: InstallGuardResult): string {
  const lines: string[] = [];
  const scope = r.target === "user" ? "глобально (~/.claude)" : "в проект (.claude)";
  lines.push(`Guard установлен ${scope}.`);
  lines.push(
    `Скрипт: ${r.script_path} (${
      r.script_status === "created" ? "создан" : "уже был — не тронут"
    }).`,
  );
  const hookMsg: Record<InstallGuardResult["hook_status"], string> = {
    created: "settings.json создан с хуком",
    added: "хук добавлен в существующий settings.json (остальное не тронуто)",
    "already-present": "хук уже стоял — пропущено (идемпотентно)",
  };
  lines.push(`Хук PreToolUse/Bash: ${hookMsg[r.hook_status]} (${r.settings_path}).`);
  lines.push("", "Защищает от:", ...r.protects.map((p) => `  • ${p}`));
  if (r.warnings.length) {
    lines.push("", "⚠ Предупреждения:", ...r.warnings.map((w) => `  ! ${w}`));
  }
  lines.push(
    "",
    `⚠️ Активация: хук подхватится только при старте новой сессии — ОСТАНОВИСЬ и попроси пользователя перезапустить приложение/сессию Claude Code.`,
    `Исключения: правила захардкожены в скрипте (каждое = отдельный match-блок). Правь ${r.script_path} — скрипт читается на каждый вызов, применяется сразу.`,
  );
  return lines.join("\n");
}

export function registerInstallGuard(server: McpServer): void {
  server.registerTool(
    "install_guard",
    {
      title: "Install guard",
      description:
        "Install the destructive-command guard (a PreToolUse/Bash hook) globally into ~/.claude (target=user, default) or into a project's .claude (target=project). Copies destructive-guard.sh into .claude/hooks/ and merges the hook into settings.json WITHOUT clobbering existing keys or hooks (idempotent — safe to re-run). The guard blocks irreversible commands (rm, find -delete, truncate/shred, git reset --hard / clean -f / push --force) while allowing safe variants (git rm, --force-with-lease). Requires jq. Restart the Claude Code session to activate. Note: bootstrap_project already checks for the global (target=user) guard and installs it if missing — you normally only need this tool directly for target='project' or to re-check after a manual jq install.",
      inputSchema: installGuardInputSchema,
      outputSchema: installGuardOutputSchema,
    },
    async (args: { target?: "user" | "project"; project_path?: string }) => {
      try {
        const result = await runInstallGuard(args.target ?? "user", args.project_path);
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
