import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { SKILL_IDS } from "../lib/skills.js";
import { runInstall, type InstallResult } from "../lib/skills-install.js";

export const installSkillInputSchema = {
  skill: z
    .enum(SKILL_IDS)
    .describe("Skill id (bundled or proxied) — valid ids are the enum values."),
  project_path: z
    .string()
    .min(1)
    .describe("Absolute path to the target project directory."),
  manual_only: z
    .boolean()
    .optional()
    .describe(
      "Bundled only: install as manual-only (/name), 0 tokens at rest. Default false.",
    ),
};

export const installSkillOutputSchema = {
  skill: z.string(),
  type: z.enum(["bundled", "proxied"]),
  invoke: z.string().describe("How to trigger the skill once installed."),
  install_path: z
    .string()
    .optional()
    .describe("Bundled: where the skill was copied (relative to project)."),
  created: z.array(z.string()).optional(),
  skipped: z.array(z.string()).optional(),
  manual_only: z.boolean().optional(),
  command: z.string().optional().describe("Proxied: the CLI command that ran."),
  output: z.string().optional().describe("Proxied: tail of the installer output."),
  gitignored: z
    .array(z.string())
    .describe("Patterns newly added to .gitignore (empty if already covered)."),
};

function formatReport(r: InstallResult): string {
  const lines: string[] = [];
  if (r.type === "bundled") {
    const c = r.created?.length ?? 0;
    const sk = r.skipped?.length ?? 0;
    lines.push(
      `Скилл '${r.skill}' (bundled) → ${r.install_path}. Создано: ${c}, пропущено: ${sk}.`,
    );
    if (r.manual_only) lines.push("Режим: manual-only (disable-model-invocation).");
    lines.push(`Вызов: ${r.invoke}`);
  } else {
    lines.push(`Скилл '${r.skill}' (proxied) поставлен через CLI.`);
    lines.push(`Команда: ${r.command}`);
    lines.push(r.invoke);
    if (r.output) lines.push("", "Вывод установщика:", r.output);
  }
  if (r.gitignored.length) {
    lines.push("", `В .gitignore добавлено: ${r.gitignored.join(", ")}`);
  }
  lines.push(
    "",
    "⚠️ ВАЖНО: скиллы подхватываются только при старте сессии. ОСТАНОВИСЬ и попроси",
    "пользователя перезапустить приложение/сессию Claude Code — до перезапуска скилл",
    "вызвать не получится.",
  );
  return lines.join("\n");
}

export function registerInstallSkill(server: McpServer): void {
  server.registerTool(
    "install_skill",
    {
      title: "Install skill",
      description:
        "Install a personal skill into a project. Bundled skills are copied into .claude/skills/<id>/ (idempotent, existing files kept); proxied skills are installed by running their official CLI in the project. IMPORTANT: skills load only at session start — after installing, STOP and ask the user to restart the Claude Code app/session before invoking the skill. Note: .claude/skills/ is gitignored by bootstrap_project — skills are tooling, not project code. manual_only applies to bundled skills only.",
      inputSchema: installSkillInputSchema,
      outputSchema: installSkillOutputSchema,
    },
    async (args: {
      skill: string;
      project_path: string;
      manual_only?: boolean;
    }) => {
      try {
        const result = await runInstall(
          args.skill,
          args.project_path,
          args.manual_only ?? false,
        );
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
