import fs from "node:fs/promises";
import path from "node:path";

import { ToolError } from "./errors.js";

/**
 * A single command hook entry inside a matcher group. With `args` this is the
 * exec form — Claude Code runs the command directly, no shell, so paths need
 * no quoting and survive Windows (PowerShell or Git Bash, doesn't matter).
 */
export interface CommandHook {
  type: "command";
  command: string;
  args?: string[];
}

/** A matcher group inside a hook event array. */
export interface HookGroup {
  matcher?: string;
  hooks: CommandHook[];
}

export interface MergeHookOptions {
  /** Hook event name, e.g. "PreToolUse". */
  event: string;
  /** Tool matcher, e.g. "Bash". */
  matcher: string;
  /** The command the hook runs. */
  command: string;
  /** Arguments for the exec form; omit for a plain shell command. */
  args?: string[];
  /**
   * Stable substring identifying our hook among possibly many. If any existing
   * command in the target event contains it, the hook is treated as already
   * installed and nothing is written (idempotent).
   */
  marker: string;
  /**
   * Substrings identifying older revisions of this same hook (e.g. the shell
   * script it used to be). A matching entry is rewritten in place instead of
   * gaining a second copy alongside it.
   */
  replaces?: string[];
}

export type MergeHookStatus =
  | "created"
  | "added"
  | "already-present"
  | "migrated";

export interface MergeHookResult {
  status: MergeHookStatus;
  path: string;
}

function asObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Everything a hook entry runs, flattened — command plus exec-form args. */
function hookText(hook: CommandHook): string {
  return [hook?.command, ...(Array.isArray(hook?.args) ? hook.args : [])]
    .filter((part) => typeof part === "string")
    .join(" ");
}

/**
 * Idempotently merge one command hook into a Claude Code settings.json without
 * disturbing unrelated keys. Safe on foreign, hand-written files:
 *  - missing/empty file → create a minimal settings.json with just this hook;
 *  - unparseable JSON    → refuse (never clobber hand-written config);
 *  - hook already there  → no-op (detected via `marker` substring);
 *  - older revision there → rewritten in place (detected via `replaces`).
 * Only the `hooks.<event>` branch is touched; permissions, env and everything
 * else survive the parse/serialize round-trip untouched.
 */
export async function mergeHook(
  settingsPath: string,
  opts: MergeHookOptions,
): Promise<MergeHookResult> {
  let raw: string | null = null;
  try {
    raw = await fs.readFile(settingsPath, "utf8");
  } catch {
    raw = null; // no settings.json yet — we'll create one
  }

  let settings: Record<string, unknown>;
  const created = raw === null || raw.trim() === "";
  if (created) {
    settings = {};
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw as string);
    } catch (error) {
      throw new ToolError(
        `Cannot parse ${settingsPath} as JSON: ${(error as Error).message}`,
        "Invalid JSON (comments/JSON5 aren't allowed here). Fix it by hand, then re-run — refusing to overwrite hand-written config.",
      );
    }
    if (!asObject(parsed)) {
      throw new ToolError(
        `Unexpected settings.json shape in ${settingsPath}`,
        "Expected a JSON object at the top level. Fix it by hand, then re-run.",
      );
    }
    settings = parsed;
  }

  // hooks: object keyed by event name
  if (settings.hooks === undefined) settings.hooks = {};
  if (!asObject(settings.hooks)) {
    throw new ToolError(
      `'hooks' in ${settingsPath} is not an object`,
      "Expected hooks to be an object keyed by event name. Fix it by hand, then re-run.",
    );
  }
  const hooksObj = settings.hooks;

  // hooks.<event>: array of matcher groups
  if (hooksObj[opts.event] === undefined) hooksObj[opts.event] = [];
  if (!Array.isArray(hooksObj[opts.event])) {
    throw new ToolError(
      `'hooks.${opts.event}' in ${settingsPath} is not an array`,
      "Expected an array of matcher groups. Fix it by hand, then re-run.",
    );
  }
  const groups = hooksObj[opts.event] as HookGroup[];

  const entry: CommandHook = { type: "command", command: opts.command };
  if (opts.args) entry.args = [...opts.args];

  const allHooks = groups.flatMap((g) =>
    Array.isArray(g?.hooks)
      ? g.hooks.filter((h) => typeof h === "object" && h !== null)
      : [],
  );

  // Already installed anywhere in this event? (marker substring match)
  if (allHooks.some((h) => hookText(h).includes(opts.marker))) {
    return { status: "already-present", path: settingsPath };
  }

  // An older revision of the same hook? Rewrite it where it stands, so the
  // user never ends up running both the old and the new one.
  const replaces = opts.replaces ?? [];
  const legacy = allHooks.filter((h) =>
    replaces.some((old) => hookText(h).includes(old)),
  );
  if (legacy.length > 0) {
    Object.assign(legacy[0], entry);
    if (!entry.args) delete legacy[0].args;
    // Any further copies were duplicates — drop them.
    for (const group of groups) {
      if (Array.isArray(group?.hooks)) {
        group.hooks = group.hooks.filter((h) => h === legacy[0] || !legacy.includes(h));
      }
    }
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
    return { status: "migrated", path: settingsPath };
  }

  // Find the matcher group, or create it.
  let group = groups.find((g) => g?.matcher === opts.matcher);
  if (!group) {
    group = { matcher: opts.matcher, hooks: [] };
    groups.push(group);
  }
  if (!Array.isArray(group.hooks)) group.hooks = [];
  group.hooks.push(entry);

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");

  return { status: created ? "created" : "added", path: settingsPath };
}
