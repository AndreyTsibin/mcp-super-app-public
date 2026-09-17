import type { BootstrapContext } from "./context.js";
import { topLevelDocsDirs } from "./docs.js";

/** Generate `.claude/CLAUDE.md` — agent instructions (English, concise). */
export function renderClaudeMd(ctx: BootstrapContext): string {
  const topDirs = topLevelDocsDirs(ctx.profile);
  const dirs = topDirs.map((d) => `\`docs/${d}/\``).join(", ");

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
| \`docs/decisions/\` | **before touching a subsystem** — see below |
| \`docs/context-playbook.md\` | how docs, memory, rules and context budgets work here |

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
the task real room. Budgets are in CHARACTERS — line counts lie, density varies several-fold:
\`CLAUDE.md\` ≤12 000 (≈4k tokens) · HANDOFF ≤3 000, one screen · tracker ≤12 000, a plan and
not an archive · \`.claude/rules/*\` ≤4 000 · any other doc ≤24 000. The docs guard counts
characters; the only exact token figure is \`/context\` in an interactive terminal. Mechanics,
probes and the reasoning: the playbook.

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

### Starting a session
The hook injects \`.claude/HANDOFF.md\` — follow it and read only the entry points it names.
No fan-out reading of \`docs/\` or memory: not in the handoff → Grep or the Explore subagent,
in fragments rather than whole files.

### During a session
Noticed one of these → one line at the end of the answer, fact plus suggestion; fix once
agreed. A file over budget · the same truth in two places (a status in both memory and the
tracker) · a stale path or link in a doc you just read · a doc nothing links to · a durable
finding worth an entry in \`docs/decisions/\` — offer it right away, not "at the end" · being
switched to another feature mid-session → propose closing the session and opening a new one.
\`.claude/HANDOFF.md\` is the exception: it is yours, rewrite it without asking.

### Closing a session
1. Tests, if code changed. 2. Durable findings → \`docs/decisions/\`. 3. Tracker: status
line, not a retelling. 4. Rewrite \`.claude/HANDOFF.md\` — one screen. 5. Commit and push.

### Closing a phase
Its own pass: collapse the phase to one status row, move durable to \`docs/decisions/\`,
run the docs guard, then re-measure cold start and the second wave with \`/context\` — a
rebuild nobody measured cannot be shown to have helped.
`;
}

/** Empty-state HANDOFF so the SessionStart hook has something to read. */
export function renderHandoffStub(): string {
  return `# HANDOFF

Первая сессия — handoff появится после «Завершаем сессию».
`;
}
