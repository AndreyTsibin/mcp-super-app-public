/**
 * Start-up check: does the user's `.env` still cover what the server needs?
 *
 * `update_server` pulls, installs and builds — all three succeed even when the
 * update introduced a new mandatory key. The failure surfaces later, inside a
 * tool, as a 401 or a "no key" error that reads like a bug in the tool rather
 * than a gap in the environment. Comparing `.env` against `.env.example` at
 * start-up turns that into a sentence the agent can say up front.
 *
 * Which keys are mandatory is declared in `.env.example` itself, next to the
 * human explanation, so adding a key means editing one file: a key is REQUIRED
 * unless its comment block carries a line reading exactly `# optional`. The
 * default errs toward noticing — a key added without a second thought is
 * treated as mandatory, and the check announces it instead of staying silent.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { PKG_ROOT } from "./scaffold.js";

/** `KEY=value`, with an optional `export` prefix, as dotenv writes it. */
const ASSIGNMENT = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;
const OPTIONAL_TAG = /^#\s*optional\s*$/i;

/**
 * Keys declared in a `.env`-shaped file, mapped to whether they are optional.
 *
 * A comment block belongs to the key directly below it, and a blank line ends
 * the block — otherwise the file header ("Скопируй этот файл в .env…") would
 * attach itself to the first key.
 */
export function parseEnvExample(text: string): Map<string, { optional: boolean }> {
  const keys = new Map<string, { optional: boolean }>();
  let optional = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") {
      optional = false;
      continue;
    }
    if (line.startsWith("#")) {
      if (OPTIONAL_TAG.test(line)) optional = true;
      continue;
    }
    const match = ASSIGNMENT.exec(line);
    if (match) keys.set(match[1], { optional });
    optional = false;
  }
  return keys;
}

/** Keys with a non-empty value. An empty `KEY=` is "not filled in", not "set". */
export function parseEnvValues(text: string): Set<string> {
  const set = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = ASSIGNMENT.exec(line);
    if (match && match[2].trim() !== "") set.add(match[1]);
  }
  return set;
}

export type EnvStatus = {
  /** Required keys the user has neither in `.env` nor in the process env. */
  missing: string[];
  /** False when there is no `.env` at all — a fresh install, not a stale one. */
  hasEnvFile: boolean;
};

/**
 * Null when everything required is set (or when there is no `.env.example` to
 * compare against — an installation that isn't a checkout of this repo).
 *
 * The process environment counts as a source: a key exported by the shell or
 * by the MCP client config works exactly as well as a line in `.env`, and
 * warning about it would be the banner crying wolf.
 */
export async function checkEnv(
  root: string = PKG_ROOT,
  processEnv: NodeJS.ProcessEnv = process.env,
): Promise<EnvStatus | null> {
  let example: string;
  try {
    example = await fs.readFile(path.join(root, ".env.example"), "utf8");
  } catch {
    return null;
  }

  let hasEnvFile = true;
  let actual = "";
  try {
    actual = await fs.readFile(path.join(root, ".env"), "utf8");
  } catch {
    hasEnvFile = false;
  }

  const set = parseEnvValues(actual);
  const missing = [...parseEnvExample(example)]
    .filter(([key, { optional }]) => {
      if (optional) return false;
      return !set.has(key) && !(processEnv[key] ?? "").trim();
    })
    .map(([key]) => key);

  return missing.length > 0 ? { missing, hasEnvFile } : null;
}
