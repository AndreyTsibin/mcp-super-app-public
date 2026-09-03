import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { formatLandingReport, runScaffoldLanding } from "./scaffold-landing.js";
import { formatMultipageReport, runScaffoldMultipage } from "./scaffold-multipage.js";

/**
 * Single entry point for "make me a site". The two modes share a flow shape —
 * scaffold an environment, seed a task tracker, stop — but differ in what can
 * be shipped up front: the landing mode has a section library to materialize,
 * the redesign mode has an unknown donor and ships the method instead.
 *
 * Registering one router rather than two scaffolders is deliberate: it puts the
 * landing/multipage decision in front of the user as a question instead of
 * leaving the agent to guess a tool name, and it keeps both flows behind the
 * same tracker protocol.
 */

const inputSchema = {
  kind: z
    .enum(["landing", "multipage"])
    .describe(
      "Which flow to set up. 'landing' — a site built from the bundled 21-section Astro library (one page or a few, no reference site). " +
        "'multipage' — port an existing site (the donor: the user's own Tilda/Wix/WordPress site, a Figma mockup, or a third-party reference) onto Astro: research first, no template. The user picks the mode in session 1 — an exact 1:1 copy, or a redesign. " +
        "Ask the user which one when they haven't said; don't guess.",
    ),
  project_path: z
    .string()
    .min(1)
    .describe("Absolute path to the target project directory (must exist)."),
  name: z
    .string()
    .optional()
    .describe("Site name — used in the previewer config label and the report. Optional."),
  install_deps: z
    .boolean()
    .optional()
    .describe(
      "landing only: run `npm install` after scaffolding (default true). Ignored for 'multipage' — there is no Astro project yet.",
    ),
};

const outputSchema = {
  kind: z.enum(["landing", "multipage"]).describe("Flow that was set up."),
  created: z.array(z.string()).describe("Paths that were created (relative to project)."),
  updated: z
    .array(z.string())
    .describe("Existing files a block was appended to (.claude/CLAUDE.md)."),
  skipped: z.array(z.string()).describe("Paths left untouched because they already existed."),
  flow: z.string().describe("Entry point of the method — the flow guide or the playbook."),
  tracker: z.string().describe("Task tracker: one row = one session."),
  preview_port: z.number().describe("Port the Astro dev server (launch.json) serves on."),
  deps_installed: z
    .boolean()
    .optional()
    .describe("landing only: whether `npm install` completed successfully."),
  deps_error: z.string().optional().describe("Why `npm install` failed, when it did."),
  skills_installed: z.array(z.string()).describe("Flow skills installed into the project."),
  skills_failed: z
    .array(z.object({ skill: z.string(), error: z.string() }))
    .describe("Skills that failed to install — install by hand later."),
  next_steps: z.array(z.string()).describe("What happens in the next session — task 1 only."),
};

type Args = {
  kind: "landing" | "multipage";
  project_path: string;
  name?: string;
  install_deps?: boolean;
};

export function registerCreateWebsite(server: McpServer): void {
  server.registerTool(
    "create_website",
    {
      title: "Create website",
      description:
        "Set up a website project and hand back a task tracker. One entry point, two flows — pick with `kind`:\n\n" +
        "• kind='landing' — build from the bundled generator: an Astro project with a 21-section library (Hero, Problems, Steps, Benefits, Cases, Prices, Reviews, FAQ, Contacts… each with layout variants), a token contract (styles/tokens.css) split from project values (styles/theme.css), a theme picker (/themes) and a section playground (/kit), niche-free page skeletons whose copy is `[[…]]` markers telling the agent what to write, a privacy page, lead-capture templates (public/send.php + public/assets/lead-form.js), docs/ standards and a machine validator (.claude/check-landing.mjs). Runs `npm install`. Use for a new site with no reference — one page or several.\n\n" +
        "• kind='multipage' — port an existing site (the donor) onto Astro. The donor may be the user's OWN site on a builder (Tilda, Wix, WordPress), their own Figma mockup, or a third-party site used as a reference. Session 1 asks which mode applies: mode A — an exact copy (same palette, type scale, spacing, block order, copy, images, logo, prices; components are written to match the donor, never the donor simplified to fit existing components), mode B — a redesign off a third-party donor, where the redesign delta keeps the result out of duplicate-content filters. Ships the playbook (donor research, single-source-of-truth data, design tokens, routing, acceptance), battle-tested lead-capture code (send.php + lead-form.js, honeypot, consent, server-side IP, rate limit) plus a tracker seeded with the two research sessions. Deliberately ships NO Astro skeleton and NO template: the donor's structure and stack are unknown until session 1 has looked at it, so the skeleton is raised in session 3. Use when the user points at a site to copy or redo.\n\n" +
        "Both flows install the same five skills the design work leans on (ui-ux-pro-max, frontend-design, humanizer-ru, image, emil-design-skills), write docs/_dev/tracker.md and append a one-task-per-session protocol to the project's .claude/CLAUDE.md. Skill installs are best-effort — a proxied installer with no network lands in skills_failed while the scaffold still succeeds, so read that field: when it is non-empty, next_steps opens with a fix-it-first step and you install those by hand before starting task 1. Idempotent: existing files are never overwritten; the CLAUDE.md block is appended once.\n\n" +
        "IMPORTANT — `kind` is the user's decision. If they only said «сделай сайт» without naming a reference site, ask via AskUserQuestion («лендинг с нуля» / «переделать существующий сайт») before calling.\n\n" +
        "IMPORTANT — after the call, STOP. Installed skills load only at session start: ask the user to restart the Claude Code app/session, and start work from tracker task 1 in the new session. Do not begin building the site in the same session, and do not run the tracker end to end — one task per session is the point.",
      inputSchema,
      outputSchema,
    },
    async (args: Args) => {
      try {
        if (args.kind === "multipage") {
          const result = await runScaffoldMultipage(args.project_path, args.name);
          return {
            content: [{ type: "text" as const, text: formatMultipageReport(result) }],
            structuredContent: { kind: "multipage" as const, ...result },
          };
        }
        const result = await runScaffoldLanding(
          args.project_path,
          args.name,
          args.install_deps ?? true,
        );
        return {
          content: [{ type: "text" as const, text: formatLandingReport(result) }],
          structuredContent: { kind: "landing" as const, ...result },
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
