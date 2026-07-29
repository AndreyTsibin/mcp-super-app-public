/**
 * Skill registry — the single source of truth for `install_skill` and the
 * default-skill installs in `bootstrap_project` / `scaffold_landing`. Two kinds:
 *
 * - `bundled`: our own static `.skill` payloads, unpacked under `assets/skills/`
 *   and copied into `<project>/.claude/skills/<id>/`. They don't evolve, so we
 *   vendor them verbatim (git-diffable, zero runtime deps).
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
      "Writes model-specific image prompts for Seedream 4.5 and Gemini 3, plus the sizing args to pass — feed the result to generate_image. Prompt syntax follows each vendor's official guide. Parts derive from smixs/visual-skills (MIT).",
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
