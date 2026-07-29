import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { Scaffold, assetPath, assertProjectDir } from "../lib/scaffold.js";
import { runInstall } from "../lib/skills-install.js";

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
 * - image: model-specific prompts for generate_image (landing imagery step)
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

export const scaffoldLandingInputSchema = {
  project_path: z
    .string()
    .min(1)
    .describe("Absolute path to the target landing project directory (must exist)."),
  name: z
    .string()
    .optional()
    .describe("Landing name — used in the previewer config label and the report. Optional."),
  install_deps: z
    .boolean()
    .optional()
    .describe("Run `npm install` after scaffolding (default true). Astro won't start without it."),
};

export const scaffoldLandingOutputSchema = {
  created: z.array(z.string()).describe("Paths that were created (relative to project)."),
  skipped: z
    .array(z.string())
    .describe("Paths left untouched because they already existed."),
  flow: z.string().describe("Entry point for the build flow to read first."),
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
  next_steps: z.array(z.string()).describe("The landing build flow, in order."),
};

type ScaffoldLandingResult = {
  created: string[];
  skipped: string[];
  flow: string;
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

function buildNextSteps(): string[] {
  return [
    "СТОП: скиллы поставлены, но подхватятся только при старте новой сессии. Попроси пользователя перезапустить приложение/сессию Claude Code и продолжай уже в новой сессии.",
    `В новой сессии: прочитай ${FLOW_DOC} — это флоу сборки сайта (стандарты в docs/ читаешь по шагам).`,
    "Скиллы /ui-ux-pro-max, /frontend-design, /humanizer-ru и /image поставлены в проект — используй их по флоу.",
    "Собери минимум брифа одним блоком: город, телефон, компания/мастер, домен (опц. полный URL вебхука CRM, политика, реальные фото).",
    "Определи профиль ниши (urgency/trust) и набери секции из каталога — docs/landing-spec.md. Полигон всех секций и вариантов: /kit.",
    "Тема по docs/design-standard.md: перепиши src/data/themes.ts под нишу (3 контрастные) → покажи /themes в превью → пользователь выбирает (СТОП-точка) → перенеси токены в src/styles/theme.css.",
    "Контент: заведи src/data/<проект>.ts вместо demo.ts, тексты по docs/landing-spec.md (Hook→…→Action, язык 5–7 класса) + финальный проход /humanizer-ru как чек-лист редактуры. Именно /humanizer-ru, не глобальный /humanizer.",
    "Собери страницы из секций: src/pages/index.astro (главная) + внутренние по маршрутам. Образцы уже лежат в проекте — перепиши под нишу, чужую не оставляй.",
    "Картинки по docs/image-standard.md: промпты скиллом /image со стилем выбранной темы, generate_image в public/assets/img (hero первым → reference_images для остальных), AI-людей «под реальных» не делать; в конце optimize_images.",
    "Заявки: public/send.php и public/assets/lead-form.js уже развёрнуты — подставь WEBHOOK_URL и политику по docs/ЗАЯВКИ-инструкция-для-Claude.md, контракт полей не меняй. В astro.config.mjs подставь боевой домен (site) — иначе canonical и OG соберутся на example.com.",
    `Критика-луп по docs/critique-standard.md: previewer (порт ${PREVIEW_PORT}), скриншоты 375/768/1440, рубрика с баллами, gate «все оси ≥7, средняя ≥8», max 2 итерации правок.`,
    "Финальная проверка: npm run build → node .claude/check-landing.mjs (❌ чини до чистого прогона) + живой тест формы; затем zip из dist/ + отчёт — в docs/landing-flow.md.",
  ];
}

async function runScaffoldLanding(
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

  // Standards + flow guide + maps → docs/
  await s.copyDir(assetPath("landing", "docs"), path.join(root, "docs"));

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
    skipped: s.skipped.map((e) => rel(e.path)),
    flow: FLOW_DOC,
    preview_port: PREVIEW_PORT,
    deps_installed,
    ...(deps_error ? { deps_error } : {}),
    skills_installed,
    skills_failed,
    next_steps: buildNextSteps(),
  };
}

function formatReport(r: ScaffoldLandingResult): string {
  const lines: string[] = [];
  lines.push(
    `Astro-среда генератора развёрнута. Создано: ${r.created.length}, пропущено: ${r.skipped.length}.`,
  );
  if (r.created.length) {
    lines.push("", "Создано:", ...r.created.map((p) => `  + ${p}`));
  }
  if (r.skipped.length) {
    lines.push("", "Пропущено (уже существовало):", ...r.skipped.map((p) => `  · ${p}`));
  }
  lines.push("", `Точка входа: ${r.flow}`, `Превью: порт ${r.preview_port} (.claude/launch.json)`);
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
  lines.push("", "Флоу сборки:", ...r.next_steps.map((s) => `  → ${s}`));
  return lines.join("\n");
}

export function registerScaffoldLanding(server: McpServer): void {
  server.registerTool(
    "scaffold_landing",
    {
      title: "Scaffold landing",
      description:
        "Materialize the landing-generator environment into a project (one project = one site): an Astro project with a 21-section library (Hero, Problems, Steps, Benefits, Cases, Prices, Reviews, FAQ, Contacts… each with layout variants), a token contract (styles/tokens.css) split from project values (styles/theme.css), a theme-picker page (/themes) and a section playground (/kit), sample pages incl. a multi-page route and a privacy page, the lead-capture templates (public/send.php + public/assets/lead-form.js), docs/ standards (flow guide, section catalog with niche profiles, theme standard, Astro tech standard, image standard, critique rubric, lead-capture contract, TZ template, maps), a previewer config (.claude/launch.json) and a machine validator (.claude/check-landing.mjs). Runs `npm install` (Astro won't start without it) and installs the skills the build flow needs (ui-ux-pro-max, frontend-design, humanizer-ru, image). Idempotent: existing files are never overwritten. IMPORTANT: installed skills load only at session start — after scaffolding, STOP and ask the user to restart the Claude Code app/session; the site is then built in the new session starting from docs/landing-flow.md.",
      inputSchema: scaffoldLandingInputSchema,
      outputSchema: scaffoldLandingOutputSchema,
    },
    async (args: { project_path: string; name?: string; install_deps?: boolean }) => {
      try {
        const result = await runScaffoldLanding(
          args.project_path,
          args.name,
          args.install_deps ?? true,
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
