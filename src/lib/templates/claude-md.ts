import type { BootstrapContext } from "./context.js";
import { topLevelDocsDirs } from "./docs.js";

/** Generate `.claude/CLAUDE.md` — agent instructions (English, concise). */
export function renderClaudeMd(ctx: BootstrapContext): string {
  const dirs = topLevelDocsDirs(ctx.profile)
    .map((d) => `\`docs/${d}/\``)
    .join(", ");

  return `# ${ctx.name}

${ctx.vision}

## Commands
<!-- fill in once tooling exists; drop lines that don't apply -->
- Install: \`<cmd>\`
- Dev / serve: \`<cmd>\`
- Test: \`<cmd>\`
- Lint / format: \`<cmd>\`

## Architecture
- Stack: ${ctx.stack}
- Detailed specs live under \`docs/\` — read on demand: ${dirs}.

## Conventions
- Code, identifiers, comments, commit messages: English.
- Discussion and \`docs/\`: Russian.
- Modular files, no monoliths. Keep code clean and safe; don't over-engineer.

## Git workflow
- Commit to \`develop\`; \`main\` is release-only.
- Conventional Commits (\`feat:\` / \`fix:\` / \`docs:\` / …). Push only with explicit approval.

## Working method
Architect–implementer: the user designs and specifies, Claude Code implements.
One session = one atomic task.
`;
}

/** Empty-state HANDOFF so the SessionStart hook has something to read. */
export function renderHandoffStub(): string {
  return `# HANDOFF

Первая сессия — handoff появится после «Завершаем сессию».
`;
}
