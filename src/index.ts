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

/**
 * Server instructions — the client puts this in the agent's system context.
 *
 * The entry-point menu used to live only in the owner's personal `~/.claude/
 * CLAUDE.md`, so anyone else running this server got eight bare tool names and
 * no idea a menu was meant to exist. Shipping it here means the rule travels
 * with the server itself. In Russian on purpose: the trigger phrases are
 * Russian and the tools' own reports already are.
 *
 * Keep it short — it is paid for in every session.
 */
const INSTRUCTIONS = `mcp-super-app — личный сервер: каркас проектов, скиллы, сайты, картинки, иконки.

## Точки входа
Пользователь сказал «запусти mcp-super-app» (или похожее, без названия конкретного тула) —
НЕ перечисляй все инструменты. Задай один AskUserQuestion с тремя опциями:
- bootstrap_project — каркас нового проекта (спроси бриф в чате: название, стек, что строим,
  профиль S/M/L, путь);
- create_website — среда сайта; дальше kind: landing (лендинг из библиотеки секций) или
  multipage (переделка существующего сайта-донора);
- create_image — генерация картинок через OpenRouter (Seedream 4.5, Gemini 3).

Остальные тулы вспомогательные, их зовут по ходу дела, в меню не выносить:
install_skill, install_guard, search_icons, get_icon, optimize_images.

## Скиллы
Каталог из девяти скиллов с назначением каждого — в описании параметра \`skill\` у
install_skill; читай его, а не гадай. Ориентиры: диаграммы и схемы → diagram-design
(несёт свои слэш-команды); чистка текста от невидимого юникода и следов AI →
clean-user-facing-text; снятие C2PA/EXIF/метаданных с файлов → remove-ai-marks (нужен
внешний сервис, см. описание); дизайн, анимации, русский копирайт, промпты картинок →
по каталогу.

## Всегда помнить
- Скиллы, команды и хуки грузятся ТОЛЬКО при старте сессии. После install_skill,
  bootstrap_project и create_website остановись и попроси перезапустить сессию.
- create_image требует промпт, написанный скиллом \`image\` (аргумент prompt_source).
  Без него тул откажет и денег не потратит.
- Тулы идемпотентны: существующие файлы не затираются, а репортятся как пропущенные.`;

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { instructions: INSTRUCTIONS },
);

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
