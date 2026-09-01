import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ToolError, toolError } from "../lib/errors.js";
import { runInstallGuard } from "../lib/guard-install.js";
import { memoryDir } from "../lib/project-slug.js";
import { Scaffold, assetPath } from "../lib/scaffold.js";
import { runInstall } from "../lib/skills-install.js";
import { SKILLS } from "../lib/skills.js";
import type { BootstrapContext } from "../lib/templates/context.js";
import { renderGitignore } from "../lib/templates/gitignore.js";
import { renderSettings } from "../lib/templates/settings.js";
import {
  renderClaudeMd,
  renderHandoffStub,
} from "../lib/templates/claude-md.js";
import { docsPlan, topLevelDocsDirs } from "../lib/templates/docs.js";
import {
  renderDocsProtocol,
  renderMemoryIndex,
  renderProductVision,
} from "../lib/templates/memory.js";

export const bootstrapInputSchema = {
  project_path: z
    .string()
    .min(1)
    .describe("Absolute path to the target project directory."),
  name: z.string().min(1).describe("Project name (used in titles and memory)."),
  profile: z
    .enum(["S", "M", "L"])
    .describe(
      "Skeleton depth: S = simple landing/script, M = app, L = full product.",
    ),
  stack: z
    .string()
    .min(1)
    .describe(
      "Free-text stack, e.g. 'Next.js fullstack' or 'static HTML/CSS/JS'. Drives .gitignore and permissions.",
    ),
  vision: z
    .string()
    .min(1)
    .describe("1–2 sentences: what we're building and for whom."),
};

export const bootstrapOutputSchema = {
  created: z.array(z.string()).describe("Paths that were created."),
  skipped: z
    .array(z.string())
    .describe("Paths left untouched because they already existed."),
  memory_dir: z.string().describe("Auto-memory directory for this project."),
  skills_installed: z
    .array(z.string())
    .describe("Skills installed by default for this profile (fullstack-architect on M/L)."),
  skills_failed: z
    .array(z.object({ skill: z.string(), error: z.string() }))
    .describe("Skills that failed to install (e.g. proxied CLI offline) — install by hand later."),
  guard: z
    .object({
      status: z.enum(["already-present", "installed", "failed"]),
      detail: z.string(),
    })
    .describe(
      "Global destructive-command guard (~/.claude, install_guard target=user): checked first, only installed if missing.",
    ),
  next_steps: z
    .array(z.string())
    .describe("Manual follow-ups left to the agent/user."),
};

/**
 * Remaining catalog for the agent to pick from via AskUserQuestion after
 * scaffolding — fullstack-architect is excluded, it's handled by the
 * profile-gated auto-install above, not offered as a manual pick.
 */
function optionalSkillsCatalog(): string {
  return SKILLS.filter((s) => s.id !== "fullstack-architect")
    .map((s) => `${s.id} (${s.description})`)
    .join(", ");
}

async function isNonEmptyDir(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export async function runBootstrap(ctx: BootstrapContext) {
  const root = path.resolve(ctx.projectPath);
  const mem = memoryDir(ctx.projectPath);
  const s = new Scaffold();

  const preexisting = await isNonEmptyDir(root);

  // --- root configs ---
  await s.copyFile(assetPath("bootstrap", ".editorconfig"), path.join(root, ".editorconfig"));
  await s.writeFile(path.join(root, ".gitignore"), renderGitignore(ctx.stack));

  // --- .claude/ ---
  const claude = path.join(root, ".claude");
  await s.writeFile(path.join(claude, "settings.json"), renderSettings(ctx.stack));
  await s.copyFile(
    assetPath("bootstrap", "claude", "settings.local.json"),
    path.join(claude, "settings.local.json"),
  );
  await s.copyFile(
    assetPath("bootstrap", "claude", "hooks", "load-handoff.mjs"),
    path.join(claude, "hooks", "load-handoff.mjs"),
  );
  await s.writeFile(path.join(claude, "CLAUDE.md"), renderClaudeMd(ctx));
  await s.writeFile(path.join(claude, "HANDOFF.md"), renderHandoffStub());

  // --- docs/ (per profile) ---
  for (const doc of docsPlan(ctx.profile)) {
    await s.writeFile(path.join(root, doc.relPath), doc.content);
  }
  // Bundle the bootstrap methodology as reference where architecture/ exists.
  if (topLevelDocsDirs(ctx.profile).includes("architecture")) {
    const arch = path.join(root, "docs", "architecture");
    for (const file of ["INSTALL.md", "PROJECT-BOOTSTRAP.md"]) {
      await s.copyFile(
        assetPath("bootstrap", "docs", "architecture", file),
        path.join(arch, file),
      );
    }
  }

  // --- Auto-memory ---
  await s.copyFile(
    assetPath("bootstrap", "memory", "work-protocol.md"),
    path.join(mem, "work-protocol.md"),
  );
  await s.writeFile(path.join(mem, "product-vision.md"), renderProductVision(ctx));
  if (ctx.profile !== "S") {
    await s.writeFile(path.join(mem, "docs-protocol.md"), renderDocsProtocol(ctx));
  }
  await s.writeFile(path.join(mem, "MEMORY.md"), renderMemoryIndex(ctx));

  // --- default skills (per profile) ---
  // M/L profiles run the brief through fullstack-architect before code; S skips
  // straight to code, so the skill would just be dead weight there.
  const skills_installed: string[] = [];
  const skills_failed: { skill: string; error: string }[] = [];
  if (ctx.profile !== "S") {
    try {
      await runInstall("fullstack-architect", root, false);
      skills_installed.push("fullstack-architect");
    } catch (error) {
      skills_failed.push({
        skill: "fullstack-architect",
        error: (error as Error).message ?? String(error),
      });
    }
  }

  // --- base protection (guard) ---
  // Global (~/.claude), not per-project: the point is a machine-wide baseline,
  // not something every project reinstalls. runInstallGuard is itself an
  // idempotent check-and-skip, so calling it unconditionally IS the presence
  // check — no separate detection logic to duplicate/drift.
  let guard: { status: "already-present" | "installed" | "failed"; detail: string };
  try {
    const g = await runInstallGuard("user");
    const alreadyHad = g.script_status === "skipped" && g.hook_status === "already-present";
    let detail = alreadyHad
      ? "Базовая защита от деструктивных команд уже стояла глобально (~/.claude) — не трогали."
      : "Базовой защиты не было — поставлена глобально (~/.claude/hooks), активируется при следующем рестарте сессии.";
    if (g.warnings.length) detail += ` ⚠ ${g.warnings.join(" ")}`;
    guard = { status: alreadyHad ? "already-present" : "installed", detail };
  } catch (error) {
    guard = {
      status: "failed",
      detail: `Не удалось проверить/поставить защиту: ${(error as Error).message ?? String(error)}. Поставь вручную через install_guard.`,
    };
  }

  // --- report ---
  const rel = (p: string) =>
    p.startsWith(mem) ? `~memory/${path.relative(mem, p)}` : path.relative(root, p);
  const created = s.created.map((e) => rel(e.path));
  const skipped = s.skipped.map((e) => rel(e.path));

  const nextSteps = [
    "git init + ветки main/develop (когда будешь готов).",
    "Наполнить бриф-зависимое: docs/_dev/scope + tracker, product-vision деталями.",
    ctx.profile === "S"
      ? "Профиль S: обычно сразу к коду, доку ведём по факту."
      : "Профиль M/L: прогнать бриф через fullstack-architect (уже поставлен) → PRD/ARCHITECTURE/PLANNING/TASKS.",
    `Если проект — лендинг: ПРОПУСТИ подбор скиллов и сразу вызывай scaffold_landing — ` +
      `он ставит свой набор сам (иначе выйдет два рестарта сессии вместо одного).`,
    `Иначе: оцени бриф (стек «${ctx.stack}», видение «${ctx.vision}») и определи, какие скиллы из ` +
      `оставшегося каталога реально понадобятся этому проекту. Предложи подборку через ` +
      `AskUserQuestion — свои рекомендации отметь явно (Recommended), остальное оставь как ` +
      `опции. Каталог: ${optionalSkillsCatalog()}. После выбора — install_skill по каждому.`,
    "⚠️ .claude/ (settings, хук) и установленные скиллы подхватываются только при старте сессии — после установки попроси пользователя перезапустить приложение/сессию Claude Code.",
  ];
  if (preexisting) {
    nextSteps.unshift(
      "⚠️ Папка была непустой — существующие файлы не тронуты (см. skipped). Проверь конфликты.",
    );
  }

  return {
    created,
    skipped,
    memory_dir: mem,
    skills_installed,
    skills_failed,
    guard,
    next_steps: nextSteps,
  };
}

function formatReport(result: Awaited<ReturnType<typeof runBootstrap>>): string {
  const lines: string[] = [];
  lines.push(`Готово. Создано: ${result.created.length}, пропущено: ${result.skipped.length}.`);
  if (result.created.length) {
    lines.push("", "Создано:", ...result.created.map((p) => `  + ${p}`));
  }
  if (result.skipped.length) {
    lines.push("", "Пропущено (уже существовало):", ...result.skipped.map((p) => `  · ${p}`));
  }
  lines.push("", `Память: ${result.memory_dir}`);
  if (result.skills_installed.length) {
    lines.push("", `Скиллы установлены: ${result.skills_installed.join(", ")}`);
  }
  if (result.skills_failed.length) {
    lines.push(
      "",
      "Скиллы НЕ установились (поставь вручную через install_skill):",
      ...result.skills_failed.map((f) => `  ! ${f.skill}: ${f.error}`),
    );
  }
  lines.push("", `Защита: ${result.guard.detail}`);
  lines.push("", "Следующие шаги:", ...result.next_steps.map((s) => `  → ${s}`));
  return lines.join("\n");
}

export function registerBootstrapProject(server: McpServer): void {
  server.registerTool(
    "bootstrap_project",
    {
      title: "Bootstrap project",
      description:
        "Materialize a new project skeleton in one call: .gitignore, .editorconfig, .claude/ (settings, hook, CLAUDE.md, HANDOFF), docs/ by profile (S/M/L), and Auto-memory (work-protocol, product-vision, docs-protocol, MEMORY.md). On M/L profiles also installs the fullstack-architect skill (idea → PRD/ARCHITECTURE/PLANNING/TASKS); S skips it and goes straight to code. The report's next_steps then hands you the remaining skill catalog (frontend-design, humanizer-ru, image, ui-ux-pro-max, emil-design-skills) with a one-line description each — judge from the brief's stack/vision which ones this project actually needs, and offer that pick via AskUserQuestion (mark your recommendations) rather than installing the whole catalog by default. Also checks for the global destructive-command guard (~/.claude, same as install_guard target=user) and installs it only if missing — idempotent, never calls install_guard again once it's there. Idempotent: existing files are never overwritten. Collect the brief (name/stack/profile/vision) in chat first, then call. Note: .claude/ settings/hooks and installed skills load only at session start — if working inside the new project right away, ask the user to restart the session.",
      inputSchema: bootstrapInputSchema,
      outputSchema: bootstrapOutputSchema,
    },
    async (args: {
      project_path: string;
      name: string;
      profile: "S" | "M" | "L";
      stack: string;
      vision: string;
    }) => {
      try {
        if (!path.isAbsolute(args.project_path)) {
          throw new ToolError(
            "project_path must be an absolute path.",
            `Got '${args.project_path}'. Pass a fully-qualified path like /Users/you/Development/my-app.`,
          );
        }
        const ctx: BootstrapContext = {
          projectPath: args.project_path,
          name: args.name,
          profile: args.profile,
          stack: args.stack,
          vision: args.vision,
        };
        const result = await runBootstrap(ctx);
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
