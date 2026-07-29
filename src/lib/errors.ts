/**
 * Single error format for all tools. Messages are actionable — they tell the
 * agent what went wrong AND how to fix it (via the optional `hint`).
 */
export class ToolError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

/** Render any thrown value into a human-readable, agent-actionable string. */
export function formatError(error: unknown): string {
  if (error instanceof ToolError) {
    return error.hint ? `${error.message}\n→ ${error.hint}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Wrap an error into an MCP tool result with `isError: true`. */
export function toolError(error: unknown) {
  return {
    content: [{ type: "text" as const, text: formatError(error) }],
    isError: true,
  };
}
