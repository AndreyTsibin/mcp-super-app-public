import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const SECTION_HEADER = "# Skills (installed tooling — restore via install_skill)";

/** Fictional file used to ask git whether a directory pattern is already covered. */
const PROBE_FILE = "__ensure_ignored_probe__";

/**
 * Turn an ignore pattern into a path git can be asked about.
 *
 * Directory patterns (`.claude/skills/`, `.claude/skills/*`) match nothing by
 * themselves, so we probe with a file inside them; file patterns are their own
 * probe. A leading slash is stripped — git would read it as an absolute path
 * outside the repository and bail out with exit 128.
 */
function probeFor(pattern: string): string {
  const relative = pattern.replace(/^\/+/, "");
  const withoutGlob = relative.replace(/\*+$/, "");
  return withoutGlob.endsWith("/") ? `${withoutGlob}${PROBE_FILE}` : relative;
}

/**
 * Ask git whether `probe` is ignored inside `projectPath`.
 *
 * @returns git's exit code (0 = ignored, 1 = not ignored, 128 = not a repo),
 *   or `null` when git could not be run at all.
 */
function checkIgnore(projectPath: string, probe: string): Promise<number | null> {
  return new Promise((resolve) => {
    const child = spawn("git", ["-C", projectPath, "check-ignore", "-q", "--", probe], {
      stdio: "ignore",
    });
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code));
  });
}

/**
 * Idempotently ensure `patterns` are present in the project's `.gitignore`,
 * appending only the missing ones under a labelled section. Creates the file if
 * absent. Skills are tooling, not project code (heavy, often third-party,
 * restorable in one command), so we keep them out of git regardless of whether
 * the project was scaffolded by bootstrap_project.
 *
 * Coverage is decided by git itself rather than by matching literal lines: a
 * project may already ignore skills through a different but equivalent pattern
 * (`.claude/skills/*` plus `!` negations that keep a few core skills versioned).
 * Appending the directory form `.claude/skills/` on top of that excludes the
 * whole folder, git stops descending into it, and every negation silently dies.
 *
 * Falls back to literal comparison when git is unavailable or the project is
 * not a repository — there is nothing to ask, and the file still needs writing.
 *
 * @returns the patterns that were actually added (empty if already covered).
 */
export async function ensureIgnored(
  projectPath: string,
  patterns: readonly string[],
): Promise<string[]> {
  const file = path.join(projectPath, ".gitignore");
  let content = "";
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    // no .gitignore yet — we'll create one
  }

  const present = new Set(content.split(/\r?\n/).map((l) => l.trim()));
  const covered = await Promise.all(
    patterns.map(async (p) => {
      const code = await checkIgnore(projectPath, probeFor(p));
      if (code === 0) return true;
      if (code === 1) return false;
      return present.has(p);
    }),
  );
  const missing = patterns.filter((_, i) => !covered[i]);
  if (missing.length === 0) return [];

  const chunks: string[] = [];
  const base = content.replace(/\n+$/, "");
  if (base) chunks.push(base, "");
  if (!present.has(SECTION_HEADER)) chunks.push(SECTION_HEADER);
  chunks.push(...missing, "");

  await fs.writeFile(file, chunks.join("\n"), "utf8");
  return missing;
}
