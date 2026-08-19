/**
 * Skill registry — the single source of truth for `install_skill` and the
 * default-skill installs in `bootstrap_project` / `scaffold_landing`. Two kinds:
 *
 * - `bundled`: static payloads under `assets/skills/`, copied into
 *   `<project>/.claude/skills/<id>/`. Either ours, or a third-party skill
 *   vendored verbatim because it has no installer CLI to call (its `LICENSE`
 *   file records the upstream commit — bump it by re-copying that tree).
 *   Git-diffable, zero runtime deps, installs offline.
 * - `proxied`: third-party skills that keep shipping releases. We don't freeze
 *   them — we shell out to their official installer CLI (via `npx`) in the
 *   target project, so the user always gets the current version.
 */

interface SkillBase {
  id: string;
  title: string;
  description: string;
  /**
   * Paths this skill writes into the project, relative to its root. install_skill
   * ensures they're gitignored — skills are restorable tooling, not project code.
   * Verified against real installs (bundled/uipro land in .claude/skills/; the
   * `skills` CLI also uses .agents/skills/ + a lockfile).
   */
  ignore: readonly string[];
}

export interface BundledSkill extends SkillBase {
  type: "bundled";
  /**
   * Slash commands shipped alongside the skill, stored as
   * `assets/commands/<skill id>/<name>.md` and copied into
   * `<project>/.claude/commands/`. Values are the command names (= file stems,
   * = how the user types them). Only vendored plugins carry these: upstream
   * ships them next to the skill and their bodies link back into it with
   * `../skills/<id>/…`, which resolves under `.claude/` exactly as it does in a
   * plugin root. Gitignore entries are derived per file, so a project's own
   * commands stay tracked.
   */
  commands?: readonly string[];
}

export interface ProxiedSkill extends SkillBase {
  type: "proxied";
  /** npm package (with dist-tag) that provides the installer CLI. */
  pkg: string;
  /** Argv passed to the CLI after the package name; cwd = project root. */
  args: string[];
  /** How the skill is invoked once installed (shown to the agent). */
  invoke: string;
}

export type SkillDef = BundledSkill | ProxiedSkill;

/** Every skill lands here; keep it out of git. */
const CLAUDE_SKILLS = ".claude/skills/";

export const SKILLS: readonly SkillDef[] = [
  {
    id: "clean-user-facing-text",
    type: "bundled",
    title: "Clean User-Facing Text",
    description:
      "Final hygiene pass over prose: audits and strips invisible/bidi Unicode and exotic spaces with its own Python scripts, then rewrites the text without touching facts, code, paths or quotes. Language-agnostic and self-contained (needs python3 on PATH). Pairs with humanizer-ru, which fixes Russian style rather than characters. Vendored from guillaumemeyer/watermarks-remover (MIT).",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "diagram-design",
    type: "bundled",
    title: "Diagram Design",
    description:
      "Editorial diagrams as self-contained HTML with inline SVG: architecture, flowchart, sequence, state machine, ER, timeline, swimlane, quadrant, org chart, Venn, funnel, bar/line/Gantt/scatter and more. Redraws .drawio and Mermaid sources, exports SVG/PNG (needs Playwright for PNG), can pull brand tokens off a site. Adds four slash commands. Vendored from cathrynlavery/diagram-design v2.4 (MIT); its scripts are Python 3 stdlib only.",
    ignore: [CLAUDE_SKILLS],
    commands: ["export-diagram", "import-drawio", "import-mermaid", "profile"],
  },
  {
    id: "frontend-design",
    type: "bundled",
    title: "Frontend Design",
    description:
      "Distinctive, production-grade frontend UI that avoids generic AI aesthetics.",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "fullstack-architect",
    type: "bundled",
    title: "Full-Stack Architect",
    description:
      "Turn ideas into production docs: PRD → ARCHITECTURE → PLANNING → TASKS. Wizard/Expert modes.",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "humanizer-ru",
    type: "bundled",
    title: "Humanizer (RU)",
    description:
      "Strip AI-writing tells from Russian copy — канцелярит, genitive chains, «является», calques, dash-as-connector. Hybrid of blader/humanizer + humanizer-ru (MIT). Russian only: the id is language-scoped so it can't collide with an English `humanizer` installed globally.",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "image",
    type: "bundled",
    title: "Image Prompting",
    description:
      "Writes model-specific image prompts for GPT-5.4 Image 2, Seedream 5.0 Lite and Gemini 3, plus the sizing args to pass — feed the result to create_image. Prompt syntax follows each vendor's official guide. Parts derive from smixs/visual-skills (MIT).",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "remove-ai-marks",
    type: "bundled",
    title: "Remove AI Marks",
    description:
      "Strips AI provenance from content you own: invisible Unicode, statistical text watermarks (via rewrite), and C2PA/EXIF/XMP metadata on PNG/JPEG/WebP/SVG/PDF/DOCX/ODT/EPUB. REQUIRES the cleaning service from guillaumemeyer/watermarks-remover running separately (docker compose up -d, or make serve on 127.0.0.1:8765) — the skill is a thin HTTP client and stops with an error when the service is unreachable. For text-only work without that service, install clean-user-facing-text instead. Intended use and honesty rules: references/ethics.md. Vendored from guillaumemeyer/watermarks-remover (MIT).",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "ui-ux-pro-max",
    type: "proxied",
    title: "UI/UX Pro Max",
    description:
      "Macro-design intelligence: styles, palettes, font pairings, stacks. Installs via its own CLI.",
    pkg: "ui-ux-pro-max-cli@latest",
    args: ["init", "--ai", "claude"],
    invoke: "Design intelligence for UI work; the CLI wires it into .claude/.",
    ignore: [CLAUDE_SKILLS],
  },
  {
    id: "emil-design-skills",
    type: "proxied",
    title: "Emil Design Skills",
    description:
      "Micro-design: animation timing, motion physics, Apple principles. Complements ui-ux-pro-max.",
    pkg: "skills@latest",
    args: ["add", "emilkowalski/skills"],
    invoke: "Emil Kowalski's animation/design skills, added under .claude/skills/.",
    ignore: [CLAUDE_SKILLS, ".agents/skills/", "skills-lock.json"],
  },
] as const;

export const SKILL_IDS = SKILLS.map((s) => s.id) as [string, ...string[]];

export function findSkill(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

/** Full shell-ish command for a proxied skill (display only — we spawn argv). */
export function proxiedCommand(skill: ProxiedSkill): string {
  return `npx --yes ${skill.pkg} ${skill.args.join(" ")}`;
}
