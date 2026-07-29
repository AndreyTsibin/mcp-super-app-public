import fs from "node:fs/promises";
import path from "node:path";

import { ToolError } from "./errors.js";

/** A single command hook entry inside a matcher group. */
export interface CommandHook {
  type: "command";
  command: string;
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
  /**
   * Stable substring identifying our hook among possibly many. If any existing
   * command in the target event contains it, the hook is treated as already
   * installed and nothing is written (idempotent).
   */
  marker: string;
}

export type MergeHookStatus = "created" | "added" | "already-present";

export interface MergeHookResult {
  status: MergeHookStatus;
  path: string;
}

function asObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Idempotently merge one command hook into a Claude Code settings.json without
 * disturbing unrelated keys. Safe on foreign, hand-written files:
 *  - missing/empty file → create a minimal settings.json with just this hook;
 *  - unparseable JSON    → refuse (never clobber hand-written config);
 *  - hook already there  → no-op (detected via `marker` substring).
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

  // Already installed anywhere in this event? (marker substring match)
  const present = groups.some(
    (g) =>
      Array.isArray(g?.hooks) &&
      g.hooks.some(
        (h) => typeof h?.command === "string" && h.command.includes(opts.marker),
      ),
  );
  if (present) return { status: "already-present", path: settingsPath };

  // Find the matcher group, or create it.
  let group = groups.find((g) => g?.matcher === opts.matcher);
  if (!group) {
    group = { matcher: opts.matcher, hooks: [] };
    groups.push(group);
  }
  if (!Array.isArray(group.hooks)) group.hooks = [];
  group.hooks.push({ type: "command", command: opts.command });

  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");

  return { status: created ? "created" : "added", path: settingsPath };
}
