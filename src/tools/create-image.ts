import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { PROMPT_SOURCE_DESCRIPTION, assertPromptSkill } from "../lib/image-skill.js";
import {
  formatOpenrouterReport,
  openrouterInputShape,
  runGenerateImage,
  type OpenrouterArgs,
} from "./generate-image.js";

/**
 * Single entry point for "make me an image". The OpenRouter engine
 * (generate-image.ts) is not registered on its own — this tool owns the
 * prompt-skill gate and the save_dir/filename resolution.
 */

/** Default output dir (relative to the server's cwd = the project). */
const DEFAULT_SAVE_DIR = "./generated";

const inputSchema = {
  prompt: z
    .string()
    .min(1)
    .describe(
      "What to generate. ОБЯЗАТЕЛЬНО собери его скиллом 'image' — у каждой модели свой синтаксис промпта. Тул откажет, если скилла нет в проекте или не заполнен prompt_source.",
    ),
  prompt_source: z.string().min(1).describe(PROMPT_SOURCE_DESCRIPTION),
  ...openrouterInputShape,
  save_dir: z
    .string()
    .optional()
    .describe(
      `Where to save (absolute, or relative to the project cwd). Default: ${DEFAULT_SAVE_DIR}.`,
    ),
  filename: z
    .string()
    .optional()
    .describe(
      "Base filename (extension added automatically). Default: slug of the prompt + timestamp.",
    ),
  project_path: z
    .string()
    .optional()
    .describe(
      "Project root where the 'image' prompt skill is checked/installed. Default: the server cwd.",
    ),
};

const outputSchema = {
  model: z.string().describe("The model that ran."),
  paths: z.array(z.string()).describe("Absolute paths of the saved image files."),
  count: z.number(),
  cost: z.number().optional().describe("Total cost in USD, when reported."),
  save_dir: z.string(),
};

type Args = OpenrouterArgs & {
  prompt_source: string;
  save_dir?: string;
  filename?: string;
  project_path?: string;
};

/** Derive a base filename (no extension) from an explicit name or the prompt. */
function baseName(filename: string | undefined, prompt: string): string {
  if (filename?.trim()) return filename.trim().replace(/\.[a-z0-9]+$/i, "");
  const slug =
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
  return `${slug}-${Date.now()}`;
}

export function registerCreateImage(server: McpServer): void {
  server.registerTool(
    "create_image",
    {
      title: "Create image",
      description:
        "Generate or edit image(s) via OpenRouter and save them into the project, returning the image inline in chat plus the saved paths and the measured cost. MANDATORY FIRST STEP: the prompt must be written with the bundled 'image' skill — each model needs its own prompt syntax, and Seedream in particular treats comma-separated tags as an anti-pattern. The tool refuses to generate when the skill is missing from the project (it installs it and tells you to read .claude/skills/image/SKILL.md from disk, then call again) or when `prompt_source` is empty. Default model is Seedream 4.5: $0.04 flat, up to 7.5MP, best prompt adherence — control framing with `aspect_ratio` and do NOT pass `size` (that only lowers the resolution for the same price). Seedream covers essentially every task; read the `model` description before picking anything else, it carries a measured decision table. EDITING: pass the source image via `reference_images` (local paths or URLs) plus an instruction in the prompt ('remove the sign', 'make the background lighter'); every image model here accepts image input. Name what must stay unchanged explicitly ('keeping its pose unchanged') — that is the vendor-documented way to avoid drift. Mask-based inpainting is NOT supported by this endpoint. Sizing is model-specific: Seedream takes `aspect_ratio` alone; Gemini needs `aspect_ratio` + `resolution:'2K'`. Files land in save_dir (default ./generated, relative to the project). AFTER GENERATING: raw output here is full-resolution and the wrong format for production — run `optimize_images` on save_dir before shipping (resize/webp/srcset). In a landing build (create_website kind='landing') this is the mandatory last step of the image stage: generate the whole series first (hero → reference_images for the rest, same 'photoshoot'), then one `optimize_images` call on assets/img at the end — never optimize between individual generations. Requires OPENROUTER_API_KEY in the server .env.",
      inputSchema,
      outputSchema,
    },
    async (args: Args) => {
      try {
        // Gate first: no frame is generated until the prompt went through the skill.
        await assertPromptSkill(args.project_path?.trim() || process.cwd(), args.prompt_source);

        const saveDir = args.save_dir?.trim() || DEFAULT_SAVE_DIR;
        const base = baseName(args.filename, args.prompt);

        const { result, images } = await runGenerateImage(args, saveDir, base);
        return {
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              data: img.b64,
              mimeType: img.mediaType,
            })),
            { type: "text" as const, text: formatOpenrouterReport(result) },
          ],
          structuredContent: { ...result, save_dir: saveDir },
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
