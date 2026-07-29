/**
 * The one-task-per-session rule, appended to a site project's
 * `.claude/CLAUDE.md`.
 *
 * It lives in the project file rather than in a tool's `next_steps` on purpose:
 * a tool result is read once and forgotten with the session, while CLAUDE.md is
 * loaded into every session. Without it the agent picks up the flow doc and
 * runs the whole build in one endless pass — no commits along the way, nothing
 * to roll back to, quality dropping long before the context does.
 */

export const SESSION_PROTOCOL_MARKER = "<!-- mcp-super-app:session-protocol -->";

const HEADER = `# Project rules

`;

/**
 * @param flowDoc entry point of the build flow, e.g. `docs/landing-flow.md`
 */
export function renderSessionProtocol(flowDoc: string): string {
  return `${SESSION_PROTOCOL_MARKER}
## Session protocol — one task per session

The build order lives in \`docs/_dev/tracker.md\`. Take the **first unfinished
task**, do that one only, then stop:

1. read the doc that tracker row points at — that one, not all of \`docs/\`;
2. implement the task;
3. \`npm run build\` green + the result checked in the preview browser;
4. commit;
5. mark the row done in the tracker, rewrite \`.claude/HANDOFF.md\`;
6. **STOP** and tell the user which task is next.

Never start a second task because context is still available. That is what turns
a session into an endless run: nothing committed along the way, nothing to roll
back to, and quality falling long before the context runs out.

Stop points (user's answer required, no default invented for them) are marked in
the tracker — pause there even mid-task.

Flow entry point: \`${flowDoc}\`.
<!-- /mcp-super-app:session-protocol -->
`;
}

export function renderSessionProtocolHeader(): string {
  return HEADER;
}
