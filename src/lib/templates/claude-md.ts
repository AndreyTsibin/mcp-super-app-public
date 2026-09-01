import type { BootstrapContext } from "./context.js";
import { topLevelDocsDirs } from "./docs.js";

/** Generate `.claude/CLAUDE.md` — agent instructions (English, concise). */
export function renderClaudeMd(ctx: BootstrapContext): string {
  const topDirs = topLevelDocsDirs(ctx.profile);
  const dirs = topDirs.map((d) => `\`docs/${d}/\``).join(", ");
  // The playbook ships with `architecture/`, which profile S doesn't create — no dead
  // row in the map for it.
  const playbookRow = topDirs.includes("architecture")
    ? "\n| `docs/architecture/context-playbook.md` | rules for docs, memory and context budgets |"
    : "";

  return `# ${ctx.name}

${ctx.vision}

## Commands
<!-- fill in once tooling exists; drop lines that don't apply -->
- Install: \`<cmd>\`
- Dev / serve: \`<cmd>\`
- Test: \`<cmd>\`
- Lint / format: \`<cmd>\`
- Docs guard: \`node .claude/scripts/check-docs.mjs\` — broken links, stale code paths, bloat

## Architecture
- Stack: ${ctx.stack}
- Detailed specs live under \`docs/\` — read on demand: ${dirs}.

## Documentation map
Read by file, never a whole folder:

| File | When to read |
|---|---|
| \`docs/_dev/tracker.md\` | what we are doing now and in what order |
| \`docs/decisions/\` | **before touching a subsystem** — see below |${playbookRow}

## Decision log — read it before you dig
\`docs/decisions/\` holds what was learned the hard way: why a thing is built this way, the
trap already hit, the price already measured. Git does not have this. **Before working on a
subsystem, grep it:**

\`\`\`bash
grep -rn "^### " docs/decisions/
\`\`\`

Learned something durable this session? Add an entry (format is in the folder's README).
Operational log — what was done, how many tests, which commit — goes nowhere: git has it.

## Context budgets
Documentation grows with the project, context does not. Anything read "just in case" costs
the task real room. Budgets, in tokens: \`CLAUDE.md\` ≤4k · HANDOFF ≤5k · tracker ≤4k
(a plan, not an archive) · any doc ≤8k. The docs guard warns on bloat; \`/context\` in an
interactive terminal gives the exact figure.

## Conventions
- Code, identifiers, comments, commit messages: English.
- Discussion and \`docs/\`: Russian.
- Modular files, no monoliths. Keep code clean and safe; don't over-engineer.

## Git workflow
- Commit to \`develop\`; \`main\` is release-only.
- Conventional Commits (\`feat:\` / \`fix:\` / \`docs:\` / …). Push right after a commit.

## Working method
Architect–implementer: the user designs and specifies, Claude Code implements.
One session = one atomic task. Full session protocol: memory \`work-protocol\`.

### Closing a session
1. Tests, if code changed. 2. Durable findings → \`docs/decisions/\`. 3. Tracker: status
line, not a retelling. 4. Rewrite \`.claude/HANDOFF.md\` — one screen. 5. Commit and push.

### Closing a phase
Its own pass: collapse the phase to one status row, move durable to \`docs/decisions/\`,
then run the docs guard.
`;
}

/** Empty-state HANDOFF so the SessionStart hook has something to read. */
export function renderHandoffStub(): string {
  return `# HANDOFF

Первая сессия — handoff появится после «Завершаем сессию».
`;
}
