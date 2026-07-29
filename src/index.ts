#!/usr/bin/env node
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

// Load OPENROUTER_API_KEY from the package-root .env (best-effort; create_image
// surfaces an actionable error if the key is missing). dist/index.js → ../.env.
try {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  process.loadEnvFile(envPath);
} catch {
  // no .env / unsupported Node — leave process.env as-is
}

const SERVER_NAME = "mcp-super-app";
const SERVER_VERSION = "0.1.0";

const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

// Three entry points: bootstrap_project (new project), create_website (landing
// or donor redesign), create_image (image generation). The scaffolders behind
// create_website and the OpenRouter engine behind create_image are not
// registered on purpose — routing through one tool per area keeps the mode
// choice a question to the user, keeps both site flows behind the same
// one-task-per-session tracker protocol, and keeps generation behind the
// prompt-skill gate.
registerBootstrapProject(server);
registerInstallSkill(server);
registerCreateWebsite(server);
registerInstallGuard(server);
registerCreateImage(server);
registerOptimizeImages(server);
registerSearchIcons(server);
registerGetIcon(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the JSON-RPC channel; log to stderr only.
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error starting mcp-super-app:", error);
  process.exit(1);
});
