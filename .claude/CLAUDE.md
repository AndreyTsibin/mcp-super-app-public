# mcp-super-app

A personal MCP server that unifies scattered tools, folders and skills into one
entry point, and adds in-chat image generation via the OpenRouter API.

## Commands
<!-- fill in once tooling exists -->
- Install: `npm install`
- Build: `npm run build`
- Dev / serve: `npm run dev`
- Inspect (MCP Inspector): `npx @modelcontextprotocol/inspector`

## Architecture
- Stack: TypeScript + `@modelcontextprotocol/sdk`, stdio transport (local server).
- Tools exposed to the MCP client live under `src/tools/`; shared infra (API client,
  errors, formatting) under `src/lib/`.
- Detailed specs live under `docs/` — read on demand:
  `docs/architecture/`, `docs/api/` (OpenRouter integration).

## Conventions
- Code, identifiers, comments, commit messages: English.
- Discussion and `docs/`: Russian.
- Modular files, no monoliths. One tool = one module. Keep code clean and safe;
  don't over-engineer.
- Tool input schemas: Zod. Output: prefer `outputSchema` + `structuredContent`.
- Actionable error messages that guide the agent toward a fix.
- Never hardcode secrets — OpenRouter key comes from `.env` (`OPENROUTER_API_KEY`).

## Git workflow
- Commit to `develop`; `main` is release-only.
- Conventional Commits (`feat:` / `fix:` / `docs:` / …). Push only with explicit approval.

## Working method
Architect–implementer: the user designs and specifies, Claude Code implements.
One session = one atomic task.
