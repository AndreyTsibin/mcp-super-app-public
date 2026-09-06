/**
 * The entry-point menu ships as a global skill the server installs itself.
 *
 * It used to live in the server's MCP `instructions`, which the client puts in
 * the system context of EVERY session in EVERY project — 681 tokens paid whether
 * the server was wanted or not, plus a hand-written copy of the same rule in the
 * user's `~/.claude/CLAUDE.md`. A skill costs only its `name` + `description`
 * until it is actually needed, and it is one file instead of two copies that
 * drift apart. See `SRV-13`.
 *
 * Installing it from code is the point: nobody — not the owner, not a colleague —
 * has to remember a manual step. The server runs this at every start (so a
 * deleted or stale copy heals itself) and right after `update_server` rebuilds
 * (so the new menu does not wait one more session).
 *
 * Fail open, like every other start-up check: a diagnostic that cannot break a
 * start is worth more than one that guarantees delivery.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assetPath } from "./scaffold.js";
import { hasMagnificKey } from "./magnific.js";

/**
 * The asset carries both variants of the `create_image` line, each in a marked
 * block, and the installed copy keeps exactly one. Same gate as the tool's own
 * schema (`SRV-4`): an install without MAGNIFIC_API_KEY is never told about a
 * provider it cannot run.
 */
export function renderRouterSkill(template: string, magnific: boolean): string {
  const keep = magnific ? "magnific" : "no-magnific";
  const drop = magnific ? "no-magnific" : "magnific";
  return template
    .replace(new RegExp(`<!-- ${drop}:start -->\\n[\\s\\S]*?<!-- ${drop}:end -->\\n`, "g"), "")
    .replace(new RegExp(`<!-- ${keep}:(?:start|end) -->\\n`, "g"), "");
}

export type RouterSyncResult = {
  /** Where the skill lives, or would have lived. */
  path: string;
  /** True when the file was created or rewritten. */
  changed: boolean;
  /** Set when the sync could not run at all; the server starts regardless. */
  error?: string;
};

/**
 * Install or refresh `~/.claude/skills/mcp-super-app/SKILL.md`. Idempotent:
 * identical content is left untouched, so mtimes stay stable and repeated
 * starts write nothing.
 *
 * The home directory comes from `os.homedir()`, not `$HOME` — on Windows the
 * shell's `$HOME` can point at a network drive while the client reads
 * `C:\Users\<Имя>` (see `DLV-14`).
 */
export async function syncRouterSkill({
  home = os.homedir(),
  magnific = hasMagnificKey(),
  source = assetPath("router", "SKILL.md"),
}: { home?: string; magnific?: boolean; source?: string } = {}): Promise<RouterSyncResult> {
  const target = path.join(home, ".claude", "skills", "mcp-super-app", "SKILL.md");
  try {
    const wanted = renderRouterSkill(await fs.readFile(source, "utf8"), magnific);
    const current = await fs.readFile(target, "utf8").catch(() => null);
    if (current === wanted) return { path: target, changed: false };
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, wanted, "utf8");
    return { path: target, changed: true };
  } catch (error) {
    return { path: target, changed: false, error: (error as Error).message };
  }
}
