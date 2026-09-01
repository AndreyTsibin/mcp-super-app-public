import os from "node:os";
import path from "node:path";

/**
 * Absolute project path → Claude Code memory folder slug.
 * Claude Code replaces every non-alphanumeric character of the absolute path
 * with "-": "/Users/a/Dev/app" → "-Users-a-Dev-app",
 * "D:\\Kefir\\app" → "D--Kefir-app". Separators, drive colons, dots and
 * underscores all collapse to "-", so the slug is always a safe folder name.
 */
export function projectSlug(projectPath: string): string {
  return path.resolve(projectPath).replace(/[^a-zA-Z0-9]/g, "-");
}

/** Absolute path to the project's Auto-memory directory. */
export function memoryDir(projectPath: string): string {
  return path.join(
    os.homedir(),
    ".claude",
    "projects",
    projectSlug(projectPath),
    "memory",
  );
}
