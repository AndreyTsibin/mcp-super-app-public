import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ToolError, toolError } from "../lib/errors.js";
import { PROMPT_SOURCE_DESCRIPTION, assertPromptSkill } from "../lib/image-skill.js";
import {
  DEFAULT_IMAGE_MODEL,
  generateImage,
  type GeneratedImage,
} from "../lib/openrouter.js";

/** Default output dir (relative to the server's cwd = the project). */
const DEFAULT_SAVE_DIR = "./generated";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** Reference-image file extensions we can inline as data URLs. */
const EXT_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Resolve reference images to what the API accepts: http(s) URLs pass through,
 * local paths (absolute or relative to cwd) are inlined as base64 data URLs.
 */
async function resolveReferences(refs: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const ref of refs) {
    if (/^https?:\/\//i.test(ref) || ref.startsWith("data:")) {
      out.push(ref);
      continue;
    }
    const abs = path.isAbsolute(ref) ? ref : path.resolve(process.cwd(), ref);
    const mime = EXT_MIME[path.extname(abs).toLowerCase()];
    if (!mime) {
      throw new ToolError(
        `Unsupported reference image type: ${ref}`,
        `Use png/jpg/jpeg/webp files, an http(s) URL, or a data URL.`,
      );
    }
    let data: Buffer;
    try {
      data = await fs.readFile(abs);
    } catch {
      throw new ToolError(
        `Reference image not found: ${abs}`,
        "Pass an existing file path (absolute or relative to the project cwd) or an http(s) URL.",
      );
    }
    out.push(`data:${mime};base64,${data.toString("base64")}`);
  }
  return out;
}

export const generateImageInputSchema = {
  prompt: z
    .string()
    .min(1)
    .describe(
      "What to generate. ОБЯЗАТЕЛЬНО собери его скиллом 'image' — у каждой модели свой синтаксис промпта. Тул откажет, если скилла нет в проекте или не заполнен prompt_source.",
    ),
  prompt_source: z.string().min(1).describe(PROMPT_SOURCE_DESCRIPTION),
  model: z
    .string()
    .optional()
    .describe(
      `OpenRouter image model. All numbers below are MEASURED usage.cost and measured pixels, not estimates.

DEFAULT — ${DEFAULT_IMAGE_MODEL}: use it unless a rule below says otherwise. $0.04 flat at ANY size, best prompt adherence, best editing consistency, best $/MP. Sizing: pass aspect_ratio and DO NOT pass 'size' — without 'size' it returns its maximum (3642x2048 = 7.5MP at 16:9; 2048x2048 = 4.2MP at 1:1) for the same $0.04. That is ~$0.005/MP. Passing 'size' only ever LOWERS the resolution for the same price.

This list is cost guidance, not a capability map: every model here handles any subject competently, and seedream's 7.5MP already exceeds any web/screen need. Each rule below names the one edge where that model beats seedream by enough to justify costing 2.5-3.4x more per frame — no edge in the frame, no reason to pay the premium. An explicit user request for a specific model overrides these rules.

• Close-up skin texture where pores/hairs genuinely carry the shot → google/gemini-3.1-flash-image with resolution:'2K' ($0.101, 2752x1536 = 4.2MP). Best skin fidelity of any model here; seedream is cleaner but its skin reads slightly 'rendered'. Also the ONLY model with banner-strip ratios (1:4, 4:1, 1:8, 8:1).
• Hardest scenes only (many interacting subjects, tricky physics) → google/gemini-3-pro-image with resolution:'2K' ($0.137). ~6x seedream per pixel — not a general 'better' button.

ALWAYS pass resolution:'2K' on either Gemini. Omitting it silently defaults to '1K' (1376x768 = 1.1MP for $0.069 on flash) — the worst $/MP of any option here. On gemini-3-pro-image '1K' and '2K' cost the SAME ($0.135 vs $0.137, both 1120 image tokens), so asking pro for '1K' is a pure loss.

'4K' exists on both Gemini models (5504x3072 = 16.9MP) but costs 50-75% more ($0.153 flash / $0.242 pro). 16.9MP is print territory — do NOT use it for web work.

Deliberately not listed: OpenAI image models and google/gemini-3.1-flash-lite-image — both failed our quality tests.`,
    ),
  aspect_ratio: z
    .string()
    .optional()
    .describe(
      "Aspect ratio, e.g. '16:9', '1:1', '9:16'. Works on every listed model, including Seedream. This is the PREFERRED way to control framing — on Seedream it also maximises resolution for free (16:9 -> 7.5MP vs 4.2MP for 1:1, same $0.04).",
    ),
  resolution: z
    .string()
    .optional()
    .describe(
      "Resolution tier: '2K' (use this) or '4K' (print only — 50-75% dearer for pixels web can't use). Gemini only; do not pass it with Seedream, which has no tiers and always returns its max. MANDATORY on Gemini — omitting it defaults to '1K', which is the worst $/MP on every model that offers it (flash: 1.1MP for $0.069; and on gemini-3-pro-image '1K' costs the same as '2K' for a quarter of the pixels).",
    ),
  size: z
    .string()
    .regex(/^\d+x\d+$/, "Use '<width>x<height>', e.g. '2560x1440'.")
    .optional()
    .describe(
      "Explicit pixel size, '<width>x<height>'. Seedream only, and ONLY when an exact pixel size is genuinely required — it costs $0.04 either way, so passing 'size' just LOWERS what you get (e.g. '2560x1440' = 3.7MP vs 7.5MP with aspect_ratio alone). Prefer aspect_ratio. Minimum 3686400 px; the model rejects anything smaller.",
    ),
  n: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of images (default 1). Not every model supports n>1."),
  seed: z.number().int().optional().describe("Seed for reproducible output (provider-dependent)."),
  reference_images: z
    .array(z.string())
    .max(16)
    .optional()
    .describe(
      "Reference images for image-to-image / style anchoring: local file paths (png/jpg/webp; absolute or relative to the project) or http(s) URLs. E.g. pass an approved hero image to keep a series stylistically consistent. Max 16 (provider-dependent).",
    ),
  output_format: z
    .enum(["png", "jpeg", "webp"])
    .optional()
    .describe("Output format. Provider-dependent; default is the model's own."),
  save_dir: z
    .string()
    .optional()
    .describe(
      `Where to save (absolute, or relative to the project cwd). Default: ${DEFAULT_SAVE_DIR}.`,
    ),
  filename: z
    .string()
    .optional()
    .describe("Base filename (extension added by MIME). Default: slug of the prompt + timestamp."),
  project_path: z
    .string()
    .optional()
    .describe(
      "Project root where the 'image' prompt skill is checked/installed. Default: the server cwd.",
    ),
};

export const generateImageOutputSchema = {
  model: z.string(),
  paths: z.array(z.string()).describe("Absolute paths of the saved image files."),
  count: z.number(),
  cost: z.number().optional().describe("Total cost in USD, when reported."),
  save_dir: z.string(),
};

type GenerateImageToolResult = {
  model: string;
  paths: string[];
  count: number;
  cost?: number;
  save_dir: string;
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

async function saveImages(
  images: GeneratedImage[],
  saveDir: string,
  base: string,
): Promise<string[]> {
  const dirAbs = path.isAbsolute(saveDir) ? saveDir : path.resolve(process.cwd(), saveDir);
  await fs.mkdir(dirAbs, { recursive: true });

  const paths: string[] = [];
  for (let i = 0; i < images.length; i++) {
    const ext = MIME_EXT[images[i].mediaType] ?? "png";
    const name = images.length > 1 ? `${base}-${i + 1}.${ext}` : `${base}.${ext}`;
    const filePath = path.join(dirAbs, name);
    await fs.writeFile(filePath, Buffer.from(images[i].b64, "base64"));
    paths.push(filePath);
  }
  return paths;
}

function formatReport(r: GenerateImageToolResult): string {
  const lines: string[] = [];
  lines.push(`Сгенерировано: ${r.count} (модель ${r.model}).`);
  lines.push("Сохранено:", ...r.paths.map((p) => `  ${p}`));
  if (r.cost !== undefined) lines.push(`Стоимость: $${r.cost.toFixed(4)}`);
  return lines.join("\n");
}

export function registerGenerateImage(server: McpServer): void {
  server.registerTool(
    "generate_image",
    {
      title: "Generate image",
      description:
        "Generate or edit image(s) via OpenRouter and save them into the project, returning the image inline in chat plus the saved paths and cost. MANDATORY FIRST STEP: the prompt must be written with the bundled 'image' skill — each model needs its own prompt syntax, and Seedream in particular treats comma-separated tags as an anti-pattern. The tool refuses to generate when the skill is missing from the project (it installs it and tells you to read .claude/skills/image/SKILL.md from disk, then call again) or when `prompt_source` is empty. Default model is Seedream 4.5: $0.04 flat, up to 7.5MP, best prompt adherence — control framing with `aspect_ratio` and do NOT pass `size` (that only lowers the resolution for the same price). Seedream covers essentially every task; read the `model` description before picking anything else, it carries a measured decision table. EDITING: pass the source image via `reference_images` (local paths or URLs) plus an instruction in the prompt ('remove the sign', 'make the background lighter'); every image model here accepts image input. Name what must stay unchanged explicitly ('keeping its pose unchanged') — that is the vendor-documented way to avoid drift. Mask-based inpainting is NOT supported by this endpoint. Sizing is model-specific: Seedream takes `aspect_ratio` alone; Gemini needs `aspect_ratio` + `resolution:'2K'`. Files land in save_dir (default ./generated, relative to the project). AFTER GENERATING: raw output here is full-resolution and the wrong format for production — run `optimize_images` on save_dir before shipping (resize/webp/srcset). For a landing build (scaffold_landing) this is the mandatory last step of the image stage: generate the whole series first (hero → reference_images for the rest, same 'photoshoot'), then one `optimize_images` call on assets/img at the end — never optimize between individual generations. Requires OPENROUTER_API_KEY in the server .env.",
      inputSchema: generateImageInputSchema,
      outputSchema: generateImageOutputSchema,
    },
    async (args: {
      prompt: string;
      prompt_source: string;
      model?: string;
      aspect_ratio?: string;
      resolution?: string;
      size?: string;
      n?: number;
      seed?: number;
      reference_images?: string[];
      output_format?: "png" | "jpeg" | "webp";
      save_dir?: string;
      filename?: string;
      project_path?: string;
    }) => {
      try {
        // Gate first: no frame is generated until the prompt went through the skill.
        await assertPromptSkill(
          args.project_path?.trim() || process.cwd(),
          args.prompt_source,
        );

        const result = await generateImage({
          prompt: args.prompt,
          model: args.model,
          aspect_ratio: args.aspect_ratio,
          resolution: args.resolution,
          size: args.size,
          n: args.n,
          seed: args.seed,
          output_format: args.output_format,
          reference_images: args.reference_images?.length
            ? await resolveReferences(args.reference_images)
            : undefined,
        });

        const saveDir = args.save_dir?.trim() || DEFAULT_SAVE_DIR;
        const paths = await saveImages(
          result.images,
          saveDir,
          baseName(args.filename, args.prompt),
        );

        const structured: GenerateImageToolResult = {
          model: result.model,
          paths,
          count: result.images.length,
          cost: result.cost,
          save_dir: saveDir,
        };

        return {
          content: [
            ...result.images.map((img) => ({
              type: "image" as const,
              data: img.b64,
              mimeType: img.mediaType,
            })),
            { type: "text" as const, text: formatReport(structured) },
          ],
          structuredContent: structured,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
