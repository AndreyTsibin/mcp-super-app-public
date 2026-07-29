import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

import { Scaffold, assetPath, assertProjectDir } from "../lib/scaffold.js";
import { runInstall } from "../lib/skills-install.js";
import { renderHandoffStub } from "../lib/templates/claude-md.js";
import {
  SESSION_PROTOCOL_MARKER,
  renderSessionProtocol,
  renderSessionProtocolHeader,
} from "../lib/templates/session-protocol.js";

const execFileP = promisify(execFile);

/**
 * Skills the landing build flow (docs/landing-flow.md) relies on, installed up
 * front so its `/skill` calls resolve without a detour:
 * - ui-ux-pro-max: palette/typography raw material for the theme candidates
 * - frontend-design: production UI, for when a section gets edited or a new one added
 * - humanizer-ru: strip AI tells from Russian copy (канцелярит, «является»,
 *   calques, dash-as-connector); apply as an editing checklist, never as blind
 *   autoreplace. Russian only — landings are RU by design; an English landing
 *   would reach for the upstream blader/humanizer instead.
 * - image: model-specific prompts for create_image (landing imagery step)
 * Motion (emil-design-skills) is intentionally left out — install on demand for
 * landings that actually need animation.
 */
const LANDING_SKILLS = ["ui-ux-pro-max", "frontend-design", "humanizer-ru", "image"] as const;

/**
 * Model: one project = one site. We materialize an Astro project (section
 * library + theme contract + pages) straight into the project root, then the
 * agent assembles pages from the library instead of writing markup from
 * scratch. Multi-page is a first-class case: every file under `src/pages/`
 * becomes a route.
 */

/** Astro dev port. Fixed on purpose: Astro hops to a free port when one is busy,
 *  and the previewer then points at the wrong server. */
const PREVIEW_PORT = 4390;

/** Build artifacts of the bundled template — never copied into a user project. */
const TEMPLATE_SKIP = ["node_modules", "dist", ".astro"] as const;

const NPM_INSTALL_TIMEOUT_MS = 300_000;

export const scaffoldLandingOutputShape = {
  created: z.array(z.string()).describe("Paths that were created (relative to project)."),
  updated: z
    .array(z.string())
    .describe("Existing files a block was appended to (.claude/CLAUDE.md)."),
  skipped: z
    .array(z.string())
    .describe("Paths left untouched because they already existed."),
  flow: z.string().describe("Entry point for the build flow to read first."),
  tracker: z.string().describe("Task tracker: one row = one session."),
  preview_port: z.number().describe("Port the Astro dev server (launch.json) serves on."),
  deps_installed: z.boolean().describe("Whether `npm install` completed successfully."),
  deps_error: z
    .string()
    .optional()
    .describe("Why `npm install` failed, when it did — run it by hand."),
  skills_installed: z
    .array(z.string())
    .describe("Landing-flow skills installed into the project."),
  skills_failed: z
    .array(z.object({ skill: z.string(), error: z.string() }))
    .describe("Skills that failed to install (e.g. proxied CLI offline) — install by hand later."),
  next_steps: z.array(z.string()).describe("What happens in the next session — task 1 only."),
};

export type ScaffoldLandingResult = {
  created: string[];
  updated: string[];
  skipped: string[];
  flow: string;
  tracker: string;
  preview_port: number;
  deps_installed: boolean;
  deps_error?: string;
  skills_installed: string[];
  skills_failed: { skill: string; error: string }[];
  next_steps: string[];
};

/** Previewer config for the `run`/preview tooling: Astro dev on a fixed port. */
function renderLaunchJson(name?: string): string {
  const config = {
    version: "0.0.1",
    configurations: [
      {
        name: name?.trim() || "landing",
        runtimeExecutable: "npm",
        runtimeArgs: ["run", "dev", "--", "--port", String(PREVIEW_PORT)],
        port: PREVIEW_PORT,
      },
    ],
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

const FLOW_DOC = "docs/landing-flow.md";
const TRACKER_DOC = "docs/_dev/tracker.md";

function buildNextSteps(): string[] {
  return [
    "СТОП: скиллы поставлены, но подхватятся только при старте новой сессии. Попроси пользователя перезапустить приложение/сессию Claude Code и продолжай уже в новой сессии.",
    `В новой сессии открой ${TRACKER_DOC} и возьми задачу 1 — бриф и план сайта. Только её.`,
    `Общая картина флоу — ${FLOW_DOC}; стандарт под текущую задачу указан в её строке трекера, остальные не грузи.`,
    "Задача 1: собери бриф одним блоком (город, телефон, компания/мастер, домен) и определи профиль ниши, карту страниц и набор секций — запиши план в трекер.",
    "Дальше: коммит → отметка в трекере → .claude/HANDOFF.md → СТОП. Задача 2 (тема) — следующая сессия.",
  ];
}

export async function runScaffoldLanding(
  projectPath: string,
  name?: string,
  installDeps = true,
): Promise<ScaffoldLandingResult> {
  await assertProjectDir(projectPath);
  const root = path.resolve(projectPath);
  const s = new Scaffold();

  // Astro project: section library, layout, theme contract, sample pages,
  // lead-capture templates (public/send.php + public/assets/lead-form.js).
  await s.copyDir(assetPath("landing", "site"), root, { skip: TEMPLATE_SKIP });

  // Standards + flow guide + maps + task tracker → docs/
  await s.copyDir(assetPath("landing", "docs"), path.join(root, "docs"));

  // The one-task-per-session rule. Appended, not written: bootstrap_project
  // already leaves a CLAUDE.md in most projects and it must survive.
  await s.ensureBlock(
    path.join(root, ".claude", "CLAUDE.md"),
    SESSION_PROTOCOL_MARKER,
    renderSessionProtocol(FLOW_DOC),
    renderSessionProtocolHeader(),
  );

  // The protocol tells the agent to rewrite the handoff at the end of every
  // session — so the file has to exist even when the project didn't come from
  // bootstrap_project.
  await s.writeFile(path.join(root, ".claude", "HANDOFF.md"), renderHandoffStub());

  // Previewer config (Astro dev server)
  await s.writeFile(path.join(root, ".claude", "launch.json"), renderLaunchJson(name));

  // Machine validator for the final check step
  await s.copyFile(
    assetPath("landing", "env", "check-landing.mjs"),
    path.join(root, ".claude", "check-landing.mjs"),
  );

  // Astro needs its dependencies before `npm run dev` does anything. Best-effort:
  // offline npm must not sink the scaffold — the files are already in place.
  let deps_installed = false;
  let deps_error: string | undefined;
  if (installDeps) {
    try {
      await execFileP("npm", ["install"], {
        cwd: root,
        timeout: NPM_INSTALL_TIMEOUT_MS,
        maxBuffer: 16 * 1024 * 1024,
      });
      deps_installed = true;
    } catch (error) {
      const detail =
        (error as { stderr?: string; message?: string }).stderr ||
        (error as Error).message ||
        String(error);
      deps_error = detail.trim().slice(-600);
    }
  }

  // Install the skills the build flow relies on. Best-effort: a failed proxied
  // installer (offline npx) must not sink the whole scaffold — the env is done.
  const skills_installed: string[] = [];
  const skills_failed: { skill: string; error: string }[] = [];
  for (const skill of LANDING_SKILLS) {
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
    flow: FLOW_DOC,
    tracker: TRACKER_DOC,
    preview_port: PREVIEW_PORT,
    deps_installed,
    ...(deps_error ? { deps_error } : {}),
    skills_installed,
    skills_failed,
    next_steps: buildNextSteps(),
  };
}

export function formatLandingReport(r: ScaffoldLandingResult): string {
  const lines: string[] = [];
  lines.push(
    `Astro-среда генератора развёрнута. Создано: ${r.created.length}, дополнено: ${r.updated.length}, пропущено: ${r.skipped.length}.`,
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
    `Флоу целиком: ${r.flow}`,
    `Превью: порт ${r.preview_port} (.claude/launch.json)`,
  );
  lines.push(
    r.deps_installed
      ? "Зависимости: npm install прошёл, `npm run dev` готов к запуску."
      : `⚠️ Зависимости НЕ поставлены${r.deps_error ? `: ${r.deps_error}` : ""}\n   Запусти вручную: npm install (без этого Astro не стартует).`,
  );
  if (r.skills_installed.length) {
    lines.push("", `Скиллы установлены: ${r.skills_installed.join(", ")}`);
    lines.push(
      "⚠️ ВАЖНО: скиллы подхватываются только при старте сессии — ОСТАНОВИСЬ и попроси",
      "пользователя перезапустить приложение/сессию Claude Code, сайт собирай в новой сессии.",
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
