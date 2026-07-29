import path from "node:path";
import { z } from "zod";

import { Scaffold, assetPath, assertProjectDir } from "../lib/scaffold.js";
import { runInstall } from "../lib/skills-install.js";
import { renderHandoffStub } from "../lib/templates/claude-md.js";
import {
  SESSION_PROTOCOL_MARKER,
  renderSessionProtocol,
  renderSessionProtocolHeader,
} from "../lib/templates/session-protocol.js";

/**
 * Model: rebuild a working third-party site (the donor) as an original Astro
 * project. Unlike the landing generator there is no section library to ship —
 * the donor is unknown up front, so its structure, stack and page types are
 * discovered, not predicted. What this tool materializes is the *method*:
 * the playbook, a tracker seeded with the two research sessions, and the
 * one-task-per-session rule. The Astro skeleton itself is raised in session 3,
 * once we know what we are rebuilding.
 */

/** Skills the redesign flow leans on — same rationale as the landing flow:
 *  palette/typography raw material, production UI, Russian copy cleanup,
 *  model-specific image prompts. */
const REDESIGN_SKILLS = ["ui-ux-pro-max", "frontend-design", "humanizer-ru", "image"] as const;

/** Astro dev port. Fixed on purpose: Astro hops to a free port when one is
 *  busy, and the previewer then points at the wrong server. */
const PREVIEW_PORT = 4390;

const PLAYBOOK_DOC = "docs/redesign-playbook.md";
const TRACKER_DOC = "docs/_dev/tracker.md";

export type ScaffoldMultipageResult = {
  created: string[];
  updated: string[];
  skipped: string[];
  flow: string;
  tracker: string;
  preview_port: number;
  skills_installed: string[];
  skills_failed: { skill: string; error: string }[];
  next_steps: string[];
};

export const scaffoldMultipageOutputShape = {
  created: z.array(z.string()).describe("Paths that were created (relative to project)."),
  updated: z
    .array(z.string())
    .describe("Existing files a block was appended to (.claude/CLAUDE.md)."),
  skipped: z.array(z.string()).describe("Paths left untouched because they already existed."),
  flow: z.string().describe("The redesign playbook — read by section, never whole."),
  tracker: z.string().describe("Task tracker: one row = one session."),
  preview_port: z.number().describe("Port the Astro dev server (launch.json) will serve on."),
  skills_installed: z.array(z.string()).describe("Flow skills installed into the project."),
  skills_failed: z
    .array(z.object({ skill: z.string(), error: z.string() }))
    .describe("Skills that failed to install (e.g. proxied CLI offline) — install by hand later."),
  next_steps: z.array(z.string()).describe("What happens in the next session — task 1 only."),
};

/** Previewer config. Written up front even though there's no Astro project yet:
 *  it costs nothing and is in place by the time session 3 raises the skeleton. */
function renderLaunchJson(name?: string): string {
  const config = {
    version: "0.0.1",
    configurations: [
      {
        name: name?.trim() || "site",
        runtimeExecutable: "npm",
        runtimeArgs: ["run", "dev", "--", "--port", String(PREVIEW_PORT)],
        port: PREVIEW_PORT,
      },
    ],
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function buildNextSteps(): string[] {
  return [
    "СТОП: скиллы подхватятся только при старте новой сессии. Попроси пользователя перезапустить приложение/сессию Claude Code — работу над сайтом начинай уже в новой сессии.",
    `В новой сессии открой ${TRACKER_DOC} и возьми задачу 1 — разведку донора. Только её.`,
    `Метод — ${PLAYBOOK_DOC}: под задачу 1 читаются разделы §0–§2 и §13, остальное не грузи.`,
    "Донора разбирай внутренним браузером (preview_start / read_page / get_page_text / javascript_tool). Зеркало wget — опция, и только с разрешения пользователя.",
    "Результат задачи 1 — docs/design/donor-analysis.md. Дальше: коммит → отметка в трекере → .claude/HANDOFF.md → СТОП.",
    "Код начинается с задачи 3 (каркас Astro). Задача 2 — сверка ТЗ с донором и нарезка остальных задач трекера.",
  ];
}

export async function runScaffoldMultipage(
  projectPath: string,
  name?: string,
): Promise<ScaffoldMultipageResult> {
  await assertProjectDir(projectPath);
  const root = path.resolve(projectPath);
  const s = new Scaffold();

  // Playbook + tracker seed → docs/
  await s.copyDir(assetPath("multipage", "docs"), path.join(root, "docs"));

  // The one-task-per-session rule. Appended, not written: bootstrap_project
  // already leaves a CLAUDE.md in most projects and it must survive.
  await s.ensureBlock(
    path.join(root, ".claude", "CLAUDE.md"),
    SESSION_PROTOCOL_MARKER,
    renderSessionProtocol(PLAYBOOK_DOC),
    renderSessionProtocolHeader(),
  );
  await s.writeFile(path.join(root, ".claude", "HANDOFF.md"), renderHandoffStub());
  await s.writeFile(path.join(root, ".claude", "launch.json"), renderLaunchJson(name));

  // Best-effort: a failed proxied installer (offline npx) must not sink the
  // scaffold — the method is already in place.
  const skills_installed: string[] = [];
  const skills_failed: { skill: string; error: string }[] = [];
  for (const skill of REDESIGN_SKILLS) {
    try {
      await runInstall(skill, root, false);
      skills_installed.push(skill);
    } catch (error) {
      skills_failed.push({ skill, error: (error as Error).message ?? String(error) });
    }
  }

  const rel = (p: string) => path.relative(root, p);
  return {
    created: s.created.map((e) => rel(e.path)),
    updated: s.updated.map((e) => rel(e.path)),
    skipped: s.skipped.map((e) => rel(e.path)),
    flow: PLAYBOOK_DOC,
    tracker: TRACKER_DOC,
    preview_port: PREVIEW_PORT,
    skills_installed,
    skills_failed,
    next_steps: buildNextSteps(),
  };
}

export function formatMultipageReport(r: ScaffoldMultipageResult): string {
  const lines: string[] = [];
  lines.push(
    `Среда редизайна по донору развёрнута. Создано: ${r.created.length}, дополнено: ${r.updated.length}, пропущено: ${r.skipped.length}.`,
  );
  if (r.created.length) {
    lines.push("", "Создано:", ...r.created.map((p) => `  + ${p}`));
  }
  if (r.updated.length) {
    lines.push("", "Дополнено (блок протокола сессии):", ...r.updated.map((p) => `  ~ ${p}`));
  }
  if (r.skipped.length) {
    lines.push("", "Пропущено (уже существовало):", ...r.skipped.map((p) => `  · ${p}`));
  }
  lines.push(
    "",
    `Трекер: ${r.tracker} — одна строка = одна сессия.`,
    `Метод: ${r.flow} — читается по разделам под текущую задачу.`,
    `Превью: порт ${r.preview_port} (.claude/launch.json), заработает после каркаса Astro (задача 3).`,
    "Astro-проект тулом НЕ создан намеренно: стек и структура зависят от донора, каркас поднимается в задаче 3.",
    "Заявки: обкатанные send.php + lead-form.js лежат в docs/lead-capture/ — на задаче заявок копируй их в public/, а не пиши заново (docs/ЗАЯВКИ-инструкция-для-Claude.md).",
  );
  if (r.skills_installed.length) {
    lines.push("", `Скиллы установлены: ${r.skills_installed.join(", ")}`);
    lines.push(
      "⚠️ ВАЖНО: скиллы подхватываются только при старте сессии — ОСТАНОВИСЬ и попроси",
      "пользователя перезапустить приложение/сессию Claude Code, работу начинай в новой сессии.",
    );
  }
  if (r.skills_failed.length) {
    lines.push(
      "",
      "Скиллы НЕ установились (поставь вручную через install_skill):",
      ...r.skills_failed.map((f) => `  ! ${f.skill}: ${f.error}`),
    );
  }
  lines.push("", "Дальше:", ...r.next_steps.map((s) => `  → ${s}`));
  return lines.join("\n");
}
