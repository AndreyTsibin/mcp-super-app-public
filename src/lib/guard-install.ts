import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ToolError } from "./errors.js";
import { Scaffold, assetPath, assertProjectDir } from "./scaffold.js";
import { mergeHook } from "./settings-merge.js";

const execFileP = promisify(execFile);

const SCRIPT_NAME = "destructive-guard.sh";
const HOOK_EVENT = "PreToolUse";
const HOOK_MATCHER = "Bash";

/** What the guard blocks — kept in sync with destructive-guard.sh. */
export const GUARD_PROTECTS = [
  "rm (кроме git rm) — удаляй через trash",
  "find … -delete",
  "truncate / shred",
  "git reset --hard",
  "git clean -f",
  "git push --force (кроме --force-with-lease)",
];

export type InstallGuardResult = {
  target: "user" | "project";
  script_path: string;
  script_status: "created" | "skipped";
  settings_path: string;
  hook_status: "created" | "added" | "already-present";
  protects: string[];
  warnings: string[];
};

/** Hook command: $HOME for a global install, ${CLAUDE_PROJECT_DIR} for project. */
function hookCommand(target: "user" | "project"): string {
  const base = target === "user" ? "$HOME" : "${CLAUDE_PROJECT_DIR}";
  return `bash "${base}/.claude/hooks/${SCRIPT_NAME}"`;
}

/** The guard fail-opens without jq, so a missing jq means no protection. */
async function jqMissing(): Promise<boolean> {
  try {
    await execFileP("jq", ["--version"]);
    return false;
  } catch {
    return true;
  }
}

/**
 * Install (or confirm already-installed) the destructive-command guard.
 * Fully idempotent: an existing script is left untouched and an existing hook
 * is detected via marker substring and skipped — safe to call unconditionally
 * as a presence check. Shared by `install_guard` and `bootstrap_project`.
 */
export async function runInstallGuard(
  target: "user" | "project",
  projectPath?: string,
): Promise<InstallGuardResult> {
  let claudeDir: string;
  if (target === "project") {
    if (!projectPath) {
      throw new ToolError(
        "project_path is required when target='project'.",
        "Pass the absolute project root, or use target='user' for a global install.",
      );
    }
    await assertProjectDir(projectPath);
    claudeDir = path.join(path.resolve(projectPath), ".claude");
  } else {
    claudeDir = path.join(os.homedir(), ".claude");
  }

  // 1. Materialize the guard script (idempotent skip-existing, executable).
  const s = new Scaffold();
  const scriptDest = path.join(claudeDir, "hooks", SCRIPT_NAME);
  await s.copyFile(assetPath("guard", SCRIPT_NAME), scriptDest, { mode: 0o755 });
  const scriptStatus = s.entries[0]?.status === "created" ? "created" : "skipped";

  // 2. Merge the PreToolUse/Bash hook into settings.json (safe, idempotent).
  const settingsPath = path.join(claudeDir, "settings.json");
  const merge = await mergeHook(settingsPath, {
    event: HOOK_EVENT,
    matcher: HOOK_MATCHER,
    command: hookCommand(target),
    marker: SCRIPT_NAME,
  });

  // 3. Warn if jq is missing — the script fail-opens without it (no protection).
  const warnings: string[] = [];
  if (await jqMissing()) {
    warnings.push(
      "jq не найден в PATH — скрипт без него fail-open'ит (пропускает всё, защиты нет). Установи: brew install jq.",
    );
  }

  return {
    target,
    script_path: scriptDest,
    script_status: scriptStatus,
    settings_path: settingsPath,
    hook_status: merge.status,
    protects: GUARD_PROTECTS,
    warnings,
  };
}
