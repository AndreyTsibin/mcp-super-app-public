import os from "node:os";
import path from "node:path";

import { ToolError } from "./errors.js";
import { Scaffold, assetPath, assertProjectDir } from "./scaffold.js";
import { mergeHook, type MergeHookStatus } from "./settings-merge.js";

const SCRIPT_NAME = "destructive-guard.mjs";
/** The shell script this hook used to be — installs before v0.6.2 still run it. */
const LEGACY_SCRIPT_NAME = "destructive-guard.sh";
const HOOK_EVENT = "PreToolUse";
const HOOK_MATCHER = "Bash";

/** What the guard blocks — kept in sync with destructive-guard.mjs. */
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
  hook_status: MergeHookStatus;
  protects: string[];
  warnings: string[];
};

/**
 * Hook in exec form: Claude Code runs `node <script>` itself, without a shell,
 * so nothing depends on bash being present or on how a shell would quote the
 * path. A global install pins the absolute path (that settings.json never
 * travels); a project one keeps ${CLAUDE_PROJECT_DIR} so the repo stays portable.
 * Forward slashes throughout — Node accepts them on Windows too.
 */
function hookArgs(target: "user" | "project", claudeDir: string): string[] {
  const base =
    target === "user" ? claudeDir.replace(/\\/g, "/") : "${CLAUDE_PROJECT_DIR}/.claude";
  return [`${base}/hooks/${SCRIPT_NAME}`];
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

  // 1. Materialize the guard script (idempotent skip-existing).
  const s = new Scaffold();
  const scriptDest = path.join(claudeDir, "hooks", SCRIPT_NAME);
  await s.copyFile(assetPath("guard", SCRIPT_NAME), scriptDest);
  const scriptStatus = s.entries[0]?.status === "created" ? "created" : "skipped";

  // 2. Merge the PreToolUse/Bash hook into settings.json (safe, idempotent).
  const settingsPath = path.join(claudeDir, "settings.json");
  const merge = await mergeHook(settingsPath, {
    event: HOOK_EVENT,
    matcher: HOOK_MATCHER,
    command: "node",
    args: hookArgs(target, claudeDir),
    marker: SCRIPT_NAME,
    replaces: [LEGACY_SCRIPT_NAME],
  });

  // 3. The migrated case leaves the old shell script behind — harmless, but say so.
  const warnings: string[] = [];
  if (merge.status === "migrated") {
    warnings.push(
      `Старый хук ${LEGACY_SCRIPT_NAME} заменён на ${SCRIPT_NAME} в settings.json. Сам файл ${path.join(claudeDir, "hooks", LEGACY_SCRIPT_NAME)} остался лежать и больше не вызывается — можно удалить вручную.`,
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
