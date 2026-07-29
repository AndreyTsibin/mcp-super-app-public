import { detectStack } from "../stack.js";

/** Universal core — applies to every project regardless of stack. */
const CORE = `# Secrets
.env
.env.*
!.env.example

# OS junk
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/

# Claude Code personal
.claude/settings.local.json
CLAUDE.local.md
.claude/skills/

# Tools
.codegraph/`;

export function renderGitignore(stack: string): string {
  const { gitignore } = detectStack(stack);
  let out = CORE;
  if (gitignore.length > 0) {
    out += `\n\n# Stack\n${gitignore.join("\n")}`;
  }
  return out + "\n";
}
