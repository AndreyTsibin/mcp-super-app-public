import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ToolError } from "./errors.js";

/** Package root — resolved from this module: <root>/{src,dist}/lib/scaffold → <root>. */
export const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** Absolute path into the bundled `assets/` directory. */
export function assetPath(...segments: string[]): string {
  return path.join(PKG_ROOT, "assets", ...segments);
}

/**
 * Validate that `projectPath` is an absolute path pointing at an existing
 * directory. Shared by tools that materialize into an existing project
 * (install_skill, scaffold_landing) — the project is expected to exist already
 * (via bootstrap_project or by hand), so we don't create it here.
 *
 * Also refuses global config locations: the home directory itself, `~/.claude`,
 * and any parent of `~/.claude` (e.g. `/`, `/Users`). Otherwise passing `$HOME`
 * as the project would silently scaffold skills/guards into `~/.claude/…`
 * instead of a real project. The `install_guard target='user'` path writes to
 * `$HOME/.claude` deliberately and never calls this — it's unaffected.
 */
export async function assertProjectDir(projectPath: string): Promise<void> {
  if (!path.isAbsolute(projectPath)) {
    throw new ToolError(
      "project_path must be an absolute path.",
      `Got '${projectPath}'. Pass a fully-qualified path like /Users/you/Development/my-app.`,
    );
  }
  const resolved = path.resolve(projectPath);
  const home = path.resolve(os.homedir());
  const claudeDir = path.join(home, ".claude");
  // True when `ancestor` is `target` itself or any directory above it.
  // (path.relative avoids the `/` + sep === `//` edge case of string prefixes.)
  const isAncestorOrSelf = (ancestor: string, target: string): boolean => {
    const rel = path.relative(ancestor, target);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  };
  // Reject the home dir itself, ~/.claude, and any ancestor of ~/.claude.
  if (resolved === home || isAncestorOrSelf(resolved, claudeDir)) {
    throw new ToolError(
      `Refusing to scaffold into a global config location: ${resolved}`,
      "project_path must be a real project directory, not $HOME or ~/.claude (nor a parent of it). " +
        "Pass a path like /Users/you/Development/my-app. For a machine-wide guard install, use install_guard target='user'.",
    );
  }
  let stat;
  try {
    stat = await fs.stat(projectPath);
  } catch {
    throw new ToolError(
      `Project directory not found: ${projectPath}`,
      "Create the project first (bootstrap_project) or fix the path.",
    );
  }
  if (!stat.isDirectory()) {
    throw new ToolError(`Not a directory: ${projectPath}`, "Pass the project root folder.");
  }
}

export interface ScaffoldEntry {
  /** Absolute path of the target. */
  path: string;
  /** `updated` — the file existed and a block was appended to it (ensureBlock). */
  status: "created" | "skipped" | "updated";
  /** Why it was skipped, when applicable. */
  note?: string;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Idempotent materializer. Writes files only when absent; existing files are
 * never overwritten, just reported as skipped. Every action is recorded in
 * `entries` for a final report.
 */
export class Scaffold {
  readonly entries: ScaffoldEntry[] = [];

  /** Write `content` to `absPath` unless it already exists. */
  async writeFile(
    absPath: string,
    content: string,
    opts?: { mode?: number },
  ): Promise<void> {
    if (await exists(absPath)) {
      this.entries.push({ path: absPath, status: "skipped", note: "exists" });
      return;
    }
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf8");
    if (opts?.mode !== undefined) await fs.chmod(absPath, opts.mode);
    this.entries.push({ path: absPath, status: "created" });
  }

  /** Copy an asset from `srcAbs` to `destAbs` unless the destination exists. */
  async copyFile(
    srcAbs: string,
    destAbs: string,
    opts?: { mode?: number },
  ): Promise<void> {
    if (await exists(destAbs)) {
      this.entries.push({ path: destAbs, status: "skipped", note: "exists" });
      return;
    }
    await fs.mkdir(path.dirname(destAbs), { recursive: true });
    await fs.copyFile(srcAbs, destAbs);
    if (opts?.mode !== undefined) await fs.chmod(destAbs, opts.mode);
    this.entries.push({ path: destAbs, status: "created" });
  }

  /**
   * Recursively copy a directory tree, file by file, through the same
   * idempotent write-if-absent logic as `copyFile`. Existing files are left
   * untouched and reported as skipped; every file lands in `entries`.
   *
   * `opts.skip` drops entries by name at any depth — the landing template is a
   * real Astro project we also develop in place, so its `node_modules/`,
   * `dist/` and `.astro/` must never be copied into a user's project.
   */
  async copyDir(
    srcAbs: string,
    destAbs: string,
    opts?: { mode?: number; skip?: readonly string[] },
  ): Promise<void> {
    const dirents = await fs.readdir(srcAbs, { withFileTypes: true });
    for (const dirent of dirents) {
      if (opts?.skip?.includes(dirent.name)) continue;
      const src = path.join(srcAbs, dirent.name);
      const dest = path.join(destAbs, dirent.name);
      if (dirent.isDirectory()) {
        await this.copyDir(src, dest, opts);
      } else if (dirent.isFile()) {
        await this.copyFile(src, dest, opts);
      }
    }
  }

  /**
   * Make sure a marked block is present in a file, without clobbering what the
   * file already says. Three cases:
   *   - file absent  → created with `header` + the block;
   *   - marker found → left alone (skipped), so a hand-edited block survives;
   *   - otherwise    → the block is appended (updated).
   *
   * Needed because a project's `.claude/CLAUDE.md` usually exists already
   * (bootstrap_project writes one), and write-if-absent would silently drop
   * the rules the flow depends on.
   */
  async ensureBlock(
    absPath: string,
    marker: string,
    block: string,
    header = "",
  ): Promise<void> {
    const body = block.endsWith("\n") ? block : `${block}\n`;
    if (!(await exists(absPath))) {
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      await fs.writeFile(absPath, `${header}${body}`, "utf8");
      this.entries.push({ path: absPath, status: "created" });
      return;
    }
    const current = await fs.readFile(absPath, "utf8");
    if (current.includes(marker)) {
      this.entries.push({ path: absPath, status: "skipped", note: "block already present" });
      return;
    }
    const separator = current.endsWith("\n") ? "\n" : "\n\n";
    await fs.writeFile(absPath, `${current}${separator}${body}`, "utf8");
    this.entries.push({ path: absPath, status: "updated", note: "block appended" });
  }

  /** Create a directory (recursively). Reported only when newly created. */
  async ensureDir(absPath: string): Promise<void> {
    if (await exists(absPath)) return;
    await fs.mkdir(absPath, { recursive: true });
    this.entries.push({ path: absPath, status: "created", note: "dir" });
  }

  get created(): ScaffoldEntry[] {
    return this.entries.filter((e) => e.status === "created");
  }

  get skipped(): ScaffoldEntry[] {
    return this.entries.filter((e) => e.status === "skipped");
  }

  get updated(): ScaffoldEntry[] {
    return this.entries.filter((e) => e.status === "updated");
  }
}
