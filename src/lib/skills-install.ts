import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ToolError } from "./errors.js";
import { ensureIgnored } from "./gitignore.js";
import { Scaffold, assetPath, assertProjectDir } from "./scaffold.js";
import {
  findSkill,
  proxiedCommand,
  SKILLS,
  type BundledSkill,
  type ProxiedSkill,
} from "./skills.js";

const execFileP = promisify(execFile);

const MANUAL_KEY = "disable-model-invocation";
const PROXIED_TIMEOUT_MS = 180_000;

export type InstallResult = {
  skill: string;
  type: "bundled" | "proxied";
  invoke: string;
  install_path?: string;
  created?: string[];
  skipped?: string[];
  manual_only?: boolean;
  command?: string;
  output?: string;
  gitignored: string[];
};

/**
 * Set `disable-model-invocation: true` in a SKILL.md YAML frontmatter, making
 * the skill manual-only (`/name`) and 0-token at rest. Idempotent: no-op if the
 * key is already present. Inserts right after the opening `---`.
 */
async function setManualOnly(skillMdPath: string): Promise<void> {
  const raw = await fs.readFile(skillMdPath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new ToolError(
      `SKILL.md has no YAML frontmatter: ${skillMdPath}`,
      "Expected a file starting with '---'. The bundled skill may be malformed.",
    );
  }
  if (new RegExp(`^${MANUAL_KEY}:`, "m").test(match[1])) return; // already manual-only
  const patched = raw.replace(/^---\r?\n/, `---\n${MANUAL_KEY}: true\n`);
  await fs.writeFile(skillMdPath, patched, "utf8");
}

type PartialResult = Omit<InstallResult, "gitignored">;

async function installBundled(
  skill: BundledSkill,
  projectPath: string,
  manualOnly: boolean,
): Promise<PartialResult> {
  const s = new Scaffold();
  const destDir = path.join(projectPath, ".claude", "skills", skill.id);
  await s.copyDir(assetPath("skills", skill.id), destDir);
  if (manualOnly) await setManualOnly(path.join(destDir, "SKILL.md"));

  const rel = (p: string) => path.relative(projectPath, p);
  return {
    skill: skill.id,
    type: "bundled",
    invoke: `/${skill.id}`,
    install_path: rel(destDir),
    created: s.created.map((e) => rel(e.path)),
    skipped: s.skipped.map((e) => rel(e.path)),
    manual_only: manualOnly,
  };
}

function tail(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `…${t.slice(-max)}` : t;
}

async function installProxied(
  skill: ProxiedSkill,
  projectPath: string,
): Promise<PartialResult> {
  const command = proxiedCommand(skill);
  try {
    const { stdout, stderr } = await execFileP(
      "npx",
      ["--yes", skill.pkg, ...skill.args],
      { cwd: projectPath, timeout: PROXIED_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
    );
    return {
      skill: skill.id,
      type: "proxied",
      invoke: skill.invoke,
      command,
      output: tail(`${stdout}\n${stderr}`, 1200),
    };
  } catch (error) {
    const detail =
      (error as { stderr?: string; message?: string }).stderr ||
      (error as Error).message ||
      String(error);
    throw new ToolError(
      `Proxied installer failed: ${command}`,
      `${tail(detail, 800)}\nCheck network access and that the CLI package is still published under this name.`,
    );
  }
}

/**
 * Install a single skill into a project (bundled: copy `.claude/skills/<id>/`;
 * proxied: run its official CLI). Ensures the skill's paths are gitignored.
 * Shared by `install_skill` and `scaffold_landing`.
 */
export async function runInstall(
  skillId: string,
  projectPath: string,
  manualOnly: boolean,
): Promise<InstallResult> {
  const skill = findSkill(skillId);
  if (!skill) {
    throw new ToolError(
      `Unknown skill: ${skillId}`,
      `Valid ids: ${SKILLS.map((s) => s.id).join(", ")}.`,
    );
  }
  await assertProjectDir(projectPath);
  const base =
    skill.type === "bundled"
      ? await installBundled(skill, projectPath, manualOnly)
      : await installProxied(skill, projectPath);
  const gitignored = await ensureIgnored(projectPath, skill.ignore);
  return { ...base, gitignored };
}

/**
 * Lead line for a scaffolder's next_steps when some skills did not install.
 *
 * Installs are best-effort on purpose — a proxied installer that could not
 * reach the network must not sink a finished scaffold. The cost is that the
 * tool reports success anyway, so without this the agent reads "Создано: 56"
 * and walks into the first tracker task missing the skills that task leans on.
 * Returns an empty array when everything installed, so callers can spread it.
 */
export function failedSkillsSteps(failed: { skill: string; error: string }[]): string[] {
  if (failed.length === 0) return [];
  const ids = failed.map((f) => f.skill).join(", ");
  return [
    `СНАЧАЛА ПОЧИНИ: не установились скиллы — ${ids}. Флоу на них опирается (палитра ` +
      "и типографика темы, продакшен-UI, чистка русского текста, промпты картинок, " +
      "анимация), без них задачи трекера поедут вслепую. Поставь каждый вручную: " +
      "install_skill (skill: <id>, project_path: корень проекта). Не вышло и вручную — " +
      "скажи пользователю, какой скилл и почему, и не начинай задачу 1.",
  ];
}
