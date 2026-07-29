import os from "node:os";
import path from "node:path";

/**
 * Absolute project path → Claude Code memory folder slug.
 * Claude Code derives the slug by replacing every "/" in the absolute path
 * with "-", e.g. "/Users/a/Dev/app" → "-Users-a-Dev-app".
 */
export function projectSlug(projectPath: string): string {
  return path.resolve(projectPath).replace(/\//g, "-");
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
