#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerBootstrapProject } from "./tools/bootstrap-project.js";
import { registerInstallSkill } from "./tools/install-skill.js";
import { registerScaffoldLanding } from "./tools/scaffold-landing.js";
import { registerInstallGuard } from "./tools/install-guard.js";
import { registerGenerateImage } from "./tools/generate-image.js";
import { registerOptimizeImages } from "./tools/optimize-images.js";
import { registerSearchIcons } from "./tools/search-icons.js";
import { registerGetIcon } from "./tools/get-icon.js";

// Load OPENROUTER_API_KEY from the package-root .env (best-effort; generate_image
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

registerBootstrapProject(server);
registerInstallSkill(server);
registerScaffoldLanding(server);
registerInstallGuard(server);
registerGenerateImage(server);
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
