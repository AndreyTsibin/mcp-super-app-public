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
 * Single entry point for "make me an image". The engine (`generate-image.ts`,
 * OpenRouter: Gemini 3.1 Flash / Flash Lite / 3 Pro, Seedream 5.0 Lite / Pro, paid per frame) is not
 * registered on its own — routing through one tool keeps the prompt-skill gate
 * in one place: `prompt` and `prompt_source` are checked here, once, and the
 * engine may not spend money before that check has passed.
 *
 * The OpenRouter knobs sit at the top level because the 'image' skill's pattern
 * files quote those argument names verbatim.
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
  provider: z.literal("openrouter").describe("Engine the frames came from."),
  paths: z.array(z.string()).describe("Absolute paths of the saved image files."),
  count: z.number(),
  save_dir: z.string(),
  model: z.string().optional().describe("The model that ran."),
  cost: z.number().optional().describe("Total cost in USD, when reported."),
};

const DESCRIPTION =
  "Generate or edit image(s) and save them into the project. Gemini 3.1 Flash / Flash Lite / 3 Pro and Seedream 5.0 Lite / Pro via OpenRouter — the same five models as the landing-page generator, nothing else is accepted. Returns the image inline in chat plus the saved paths and the measured cost. Model choice starts with one question: is the frame going into production (a landing, a client site, anything shipped)? If yes — the schema default google/gemini-3.1-flash-image with `resolution:'2K'` ($0.101, 2752x1536), the whole series on it. If no (drafts, references, experiments) — google/gemini-3.1-flash-lite-image with `resolution:'1K'` ($0.034, fastest; it has no 2K tier). A draft the user disliked, or a job that will be edited or extended into a series, goes to bytedance-seed/seedream-5-0-lite ($0.035 flat, 7.5MP, best editor). Read the `model` description before overriding — it carries the measured decision table. EDITING: pass the source image via `reference_images` (local paths or URLs) plus an instruction in the prompt ('remove the sign', 'make the background lighter'); every model here accepts image input. When editing is part of the plan, run the whole job on seedream from the start — its edit is flat $0.035 and it is the best editor of the set. Name what must stay unchanged explicitly ('keeping its pose unchanged') — the vendor-documented way to avoid drift. Mask-based inpainting is NOT supported. Sizing is model-specific: Seedream takes `aspect_ratio` alone; Gemini needs `aspect_ratio` + `resolution` ('2K' on flash and pro, '1K' on flash-lite). Requires OPENROUTER_API_KEY in the server .env.\n\n" +
  "MANDATORY FIRST STEP: the prompt must be written with the bundled 'image' skill — each model needs its own prompt syntax, and Seedream in particular treats comma-separated tags as an anti-pattern. The tool refuses to generate when the skill is missing from the project (it installs it and tells you to read .claude/skills/image/SKILL.md from disk, then call again) or when `prompt_source` is empty.\n\n" +
  "Files land in save_dir (default ./generated, relative to the project). AFTER GENERATING: raw output is full-resolution and the wrong format for production — run `optimize_images` on save_dir before shipping (resize/webp/srcset). In a landing build (create_website kind='landing') this is the mandatory last step of the image stage: generate the whole series first (hero → reference_images for the rest, same 'photoshoot'), then one `optimize_images` call on assets/img at the end — never optimize between individual generations.";

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
      description: DESCRIPTION,
      inputSchema,
      outputSchema,
    },
    async (args: Args) => {
      try {
        // Gate first: no money is spent until the prompt went through the skill.
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
          structuredContent: { provider: "openrouter" as const, ...result, save_dir: saveDir },
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
