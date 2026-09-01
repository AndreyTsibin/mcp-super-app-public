import { detectStack } from "../stack.js";

/** Base permissions granted to every project. Stack extras merge on top. */
const BASE_ALLOW = [
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git branch:*)",
  "Bash(git checkout:*)",
  "Bash(git push:*)",
  "Bash(git pull:*)",
  "Bash(git tag:*)",
  "Bash(npm run:*)",
  "Bash(npx:*)",
  "Bash(ls:*)",
  "Bash(cat:*)",
];

/** Generate `.claude/settings.json` (project-scoped, committed to the repo). */
export function renderSettings(stack: string): string {
  const { permissions } = detectStack(stack);
  const allow = [...new Set([...BASE_ALLOW, ...permissions])];

  const settings = {
    $schema: "https://json.schemastore.org/claude-code-settings.json",
    permissions: {
      allow,
      deny: ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)"],
      ask: [],
    },
    env: { ENABLE_TOOL_SEARCH: "true" },
    showThinkingSummaries: false,
    hooks: {
      SessionStart: [
        {
          matcher: "startup",
          hooks: [
            {
              // Exec form: Claude Code runs node directly, no shell in between,
              // so this works the same on macOS and on Windows.
              type: "command",
              command: "node",
              args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/load-handoff.mjs"],
            },
          ],
        },
      ],
    },
  };

  return JSON.stringify(settings, null, 2) + "\n";
}
