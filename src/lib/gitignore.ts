import fs from "node:fs/promises";
import path from "node:path";

const SECTION_HEADER = "# Skills (installed tooling — restore via install_skill)";

/**
 * Idempotently ensure `patterns` are present in the project's `.gitignore`,
 * appending only the missing ones under a labelled section. Creates the file if
 * absent. Skills are tooling, not project code (heavy, often third-party,
 * restorable in one command), so we keep them out of git regardless of whether
 * the project was scaffolded by bootstrap_project.
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
  const missing = patterns.filter((p) => !present.has(p));
  if (missing.length === 0) return [];

  const chunks: string[] = [];
  const base = content.replace(/\n+$/, "");
  if (base) chunks.push(base, "");
  if (!present.has(SECTION_HEADER)) chunks.push(SECTION_HEADER);
  chunks.push(...missing, "");

  await fs.writeFile(file, chunks.join("\n"), "utf8");
  return missing;
}
