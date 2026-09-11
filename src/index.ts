#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerBootstrapProject } from "./tools/bootstrap-project.js";
import { registerInstallSkill } from "./tools/install-skill.js";
import { registerCreateWebsite } from "./tools/create-website.js";
import { registerInstallGuard } from "./tools/install-guard.js";
import { registerCreateImage } from "./tools/create-image.js";
import { registerOptimizeImages } from "./tools/optimize-images.js";
import { registerSearchIcons } from "./tools/search-icons.js";
import { registerGetIcon } from "./tools/get-icon.js";
import { registerUpdateServer } from "./tools/update-server.js";
import { checkEnv } from "./lib/env-check.js";
import {
  checkForUpdate,
  hasLegacyClaudeMdBlock,
  isBuildStale,
  renderSelfCheckBanner,
} from "./lib/self-check.js";
import { syncRouterSkill } from "./lib/router-skill.js";

// Load OPENROUTER_API_KEY from the package-root .env (best-effort; create_image
// surfaces an actionable error if the key is missing). dist/index.js → ../.env.
try {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  process.loadEnvFile(envPath);
} catch {
  // no .env / unsupported Node — leave process.env as-is
}

const SERVER_NAME = "mcp-super-app";

/**
 * Read from package.json rather than hardcoded: a literal here silently rots —
 * `release.mjs` bumps the manifest, and the number the client sees in the MCP
 * handshake would keep claiming whatever version the file was born with.
 */
const SERVER_VERSION: string = (() => {
  try {
    const manifest = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const { version } = JSON.parse(fs.readFileSync(manifest, "utf8"));
    return typeof version === "string" ? version : "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

/**
 * Server instructions — the client puts this in the agent's system context of
 * every session in every project, whether this server is wanted there or not.
 *
 * So it is a pointer, not the menu. The menu itself lives in the global skill
 * `mcp-super-app` (`assets/router/SKILL.md`), which the server installs and
 * refreshes itself — a skill costs its `name` + `description` until it is used,
 * where this text costs its full length every time. See `SRV-13`; the ceiling is
 * 200 tokens and `scripts/context-cost.mjs` enforces it.
 *
 * The fallback is not optional. Between installing the skill and the next
 * session start Claude Code cannot see it yet, and without those three lines the
 * server is mute in that window — back to the eight bare tool names `SRV-1` was
 * written to end. In Russian on purpose: the trigger phrases are Russian and the
 * tools' own reports already are.
 */
const INSTRUCTIONS = `mcp-super-app — личный сервер: каркас проектов, скиллы, сайты, картинки, иконки.

Пользователь просит запустить сервер, новый проект, сайт или картинку — вызови скилл
\`mcp-super-app\`: в нём точки входа, правила выбора и вспомогательные тулы.

Скилла нет — предложи через AskUserQuestion три точки входа: bootstrap_project (каркас
проекта), create_website (сайт), create_image (картинки). Не перечисляй все инструменты.`;

/**
 * Self-checks run before `connect` because their findings ride along in
 * `instructions`, which the client reads exactly once, at initialize. All of
 * them are cheap (the network one is cached for a day, the skill sync writes
 * only when the content moved) and all of them fail open, so a slow, offline or
 * read-only check costs a start-up moment at worst.
 */
async function buildInstructions(): Promise<string> {
  const [staleBuild, update, env, legacyClaudeMd] = await Promise.all([
    isBuildStale(import.meta.url),
    checkForUpdate(),
    checkEnv(),
    hasLegacyClaudeMdBlock(),
    // Not awaited for a value: the skill either lands or it doesn't, and the
    // fallback in INSTRUCTIONS covers the gap either way.
    syncRouterSkill(),
  ]);
  const banner = renderSelfCheckBanner({ staleBuild, update, env, legacyClaudeMd });
  return banner ? `${banner}\n\n${INSTRUCTIONS}` : INSTRUCTIONS;
}

async function main(): Promise<void> {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: await buildInstructions() },
  );

  // Three entry points: bootstrap_project (new project), create_website (landing
  // or donor redesign), create_image (OpenRouter). The scaffolders and the image
  // engine behind the routers are not registered on purpose — routing through
  // one tool per area keeps the mode choice a question to the user, keeps both
  // site flows behind the same one-task-per-session tracker protocol, and keeps
  // image generation behind the prompt-skill gate.
  registerBootstrapProject(server);
  registerInstallSkill(server);
  registerCreateWebsite(server);
  registerInstallGuard(server);
  registerCreateImage(server);
  registerOptimizeImages(server);
  registerSearchIcons(server);
  registerGetIcon(server);
  registerUpdateServer(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the JSON-RPC channel; log to stderr only.
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error starting mcp-super-app:", error);
  process.exit(1);
});
