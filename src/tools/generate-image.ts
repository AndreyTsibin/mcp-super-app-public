import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { ToolError } from "../lib/errors.js";
import {
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODELS,
  generateImage,
  type GeneratedImage,
  type ImageModel,
} from "../lib/openrouter.js";

/**
 * OpenRouter engine behind the `create_image` router. Not registered as a tool
 * on its own — the router owns the prompt-skill gate and the save_dir/filename
 * resolution.
 */

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

/** Engine half of the router's input schema. */
export const openrouterInputShape = {
  model: z
    .enum(IMAGE_MODELS)
    .optional()
    .describe(
      `OpenRouter image model — the same five the landing-page generator draws with, one list kept true in both apps; any other slug is refused by the schema. Prices are MEASURED usage.cost per frame at 16:9, not estimates.

ASK FIRST: is this frame going into production — a landing page, a client site, a deck, anything a real audience will see? That answer picks the model.

PRODUCTION → ${DEFAULT_IMAGE_MODEL} (the schema default) with resolution:'2K' ($0.101, 2752x1536 = 4.2MP). Best skin and material fidelity of the set, the only model with banner-strip ratios (1:4, 4:1, 1:8, 8:1), and enough pixels for a first screen. Cost is not an argument against it: a whole landing is 3-5 frames = $0.30-0.51 for the entire site. Keep the WHOLE series on it — hero first, then the rest with the hero in reference_images; mixing models inside one series breaks the shared style.

DRAFTS (references, mood tests, 'just draw me something') → google/gemini-3.1-flash-lite-image with resolution:'1K' ($0.034, the fastest frame here). It has NO 2K tier — asking for one returns an error, not a frame. Fine detail is weaker than flash (fingers, nails, small hardware went wrong in a July 2026 comparison): enough to judge a composition, not enough to ship.

EDITING and SERIES → bytedance-seed/seedream-5-0-lite ($0.035 FLAT at any size, 3642x2048 = 7.5MP at 16:9, ~$0.0047/MP, best editor of the set). Take it when the user disliked a draft frame, or when the job is generate-then-edit or a series off one reference. Slowest of the set, and its people and hardware go wrong more often in one shot (limbs through glass, parts in impossible places) — for production the answer is flash, not seedream.

Also available:
• Hardest scenes only (many interacting subjects, tricky physics) → google/gemini-3-pro-image with resolution:'2K' ($0.137). ~7x seedream per pixel — not a general 'better' button; measured against flash on an identical prompt it came out cleaner but more sterile.
• bytedance-seed/seedream-5-0-pro — only when the user names it. Unlike lite its price follows pixels (~$0.019/MP; $0.045 for 2.4MP when 'size' is omitted) and its ceiling is 4,624,220 px, less than lite returns by default. Quality was not compared frame by frame.

ALWAYS pass resolution:'2K' on flash and pro. Omitting it silently defaults to '1K' (1376x768 = 1.1MP for $0.069 on flash) — the worst $/MP of any option here. On gemini-3-pro-image '1K' and '2K' cost the SAME ($0.135 vs $0.137, both 1120 image tokens), so asking pro for '1K' is a pure loss.

'4K' exists on flash and pro (5504x3072 = 16.9MP) but costs 50-75% more ($0.153 flash / $0.242 pro). 16.9MP is print territory — do NOT use it for web work.`,
    ),
  aspect_ratio: z
    .string()
    .optional()
    .describe(
      "Aspect ratio, e.g. '16:9', '1:1', '9:16'. Works on every listed model and is the PREFERRED way to control framing. On Gemini the ratio does not move the price — the resolution tier does. On Seedream Lite the price is flat, so a wider ratio buys pixels for free (16:9 -> 7.5MP vs 4.2MP for 1:1, same $0.035); on Seedream Pro the price follows the pixels.",
    ),
  resolution: z
    .string()
    .optional()
    .describe(
      "Resolution tier, Gemini only — do not pass it with Seedream, which has no tiers. '2K' on flash and pro (use this); '1K' is the ONLY tier on flash-lite (it has no 2K — asking returns an error); '4K' is print only (50-75% dearer for pixels web can't use). MANDATORY on flash and pro — omitting it defaults to '1K', the worst $/MP on both (flash: 1.1MP for $0.069; pro: '1K' costs the same as '2K' for a quarter of the pixels).",
    ),
  size: z
    .string()
    .regex(/^\d+x\d+$/, "Use '<width>x<height>', e.g. '2560x1440'.")
    .optional()
    .describe(
      "Explicit pixel size, '<width>x<height>'. Seedream only — Gemini is sized with aspect_ratio + resolution. On Seedream Lite the price is flat ($0.035) whatever you ask for, so 'size' either LOWERS what you get (e.g. '2560x1440' = 3.7MP vs 7.5MP with aspect_ratio alone) or, for print work, RAISES it up to the 16,777,216 px ceiling ('5456x3072' = 16.8MP); accepted range 3686400 to 16777216 px, anything outside is rejected. On Seedream Pro the price follows the pixels and the ceiling is 4,624,220 px. For web work prefer aspect_ratio alone.",
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
};

export type OpenrouterArgs = {
  prompt: string;
  model?: ImageModel;
  aspect_ratio?: string;
  resolution?: string;
  size?: string;
  n?: number;
  seed?: number;
  reference_images?: string[];
  output_format?: "png" | "jpeg" | "webp";
};

export type GenerateImageResult = {
  model: string;
  paths: string[];
  count: number;
  cost?: number;
};

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

export function formatOpenrouterReport(r: GenerateImageResult): string {
  const lines: string[] = [];
  lines.push(`Сгенерировано: ${r.count} (модель ${r.model}).`);
  lines.push("Сохранено:", ...r.paths.map((p) => `  ${p}`));
  if (r.cost !== undefined) lines.push(`Стоимость: $${r.cost.toFixed(4)}`);
  return lines.join("\n");
}

/**
 * Generate via OpenRouter and save the frames. The prompt-skill gate lives in
 * the router, which is the only caller — args arriving here are already checked.
 */
export async function runGenerateImage(
  args: OpenrouterArgs,
  saveDir: string,
  base: string,
): Promise<{ result: GenerateImageResult; images: GeneratedImage[] }> {
  const generated = await generateImage({
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

  const paths = await saveImages(generated.images, saveDir, base);

  return {
    result: {
      model: generated.model,
      paths,
      count: generated.images.length,
      cost: generated.cost,
    },
    images: generated.images,
  };
}
