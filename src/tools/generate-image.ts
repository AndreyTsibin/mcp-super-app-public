import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { ToolError } from "../lib/errors.js";
import {
  DEFAULT_IMAGE_MODEL,
  generateImage,
  type GeneratedImage,
} from "../lib/openrouter.js";

/**
 * OpenRouter engine behind the `create_image` router. Not registered as a tool
 * on its own — the router owns the prompt-skill gate, the provider choice and
 * the save_dir/filename resolution.
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

/** Provider-specific half of the router's input schema (provider='openrouter'). */
export const openrouterInputShape = {
  model: z
    .string()
    .optional()
    .describe(
      `OpenRouter image model. All numbers below are MEASURED usage.cost and measured pixels, not estimates.

ASK FIRST: is this frame going into production — a landing page, a client site, a deck, anything a real audience will see? That answer picks the model.

PRODUCTION → google/gemini-3.1-flash-image with resolution:'2K' ($0.101, 2752x1536 = 4.2MP). Best skin and material fidelity of any model here, the only one with banner-strip ratios (1:4, 4:1, 1:8, 8:1), and enough pixels for a first screen. Cost is not an argument against it: a whole landing is 3-5 frames = $0.30-0.51 for the entire site. Keep the WHOLE series on it — hero first, then the rest with the hero in reference_images; mixing models inside one series breaks the shared style.

NOT PRODUCTION (drafts, references, mood tests, 'just draw me something') → ${DEFAULT_IMAGE_MODEL}, the schema default. $0.035 at 16:9 (1536x864 = 1.3MP), the cheapest frame here and the strongest single-shot realism of the cheap tier — lived-in interiors, working hands, believable clutter. Sizing: pass aspect_ratio alone, it has no resolution tiers and ignores 'size'. Price is NOT flat: it scales with pixels (1:1 = 1024x1024 for $0.024). Hard ceiling 1.3MP — the other reason production does not live here.

FALLBACK, and the editor → bytedance-seed/seedream-5-0-lite ($0.035 FLAT at any size, 3642x2048 = 7.5MP at 16:9, ~$0.0047/MP, best editor of the set). Take it when the user disliked a draft frame, or when editing/a series is planned. It wins on pixels and on editing, but its people and hardware go wrong more often in one shot (limbs through glass, parts in impossible places) — for production the answer is flash, not seedream.

EDITING IS PRICED SEPARATELY. Passing reference_images to ${DEFAULT_IMAGE_MODEL} costs ~$0.140 per call (MEASURED) — 4x a fresh frame on the same model and 4x an edit on seedream, because the source image is billed as input tokens. Its edit quality is excellent (Cyrillic text on clothing landed clean, face/pose/interior untouched), so it is worth it as a one-off rescue — but when a job is planned as generate-then-edit, or as a series off one reference, start it on seedream and stay there.

Also available:
• Hardest scenes only (many interacting subjects, tricky physics) → google/gemini-3-pro-image with resolution:'2K' ($0.137). ~7x seedream per pixel — not a general 'better' button; measured against flash on an identical prompt it came out cleaner but more sterile.
• openai/gpt-image-2 — same 1536x864 and same $0.034 as the default, kept only as a stand-in if gpt-5.4-image-2 is unavailable. The 5.4 frame is richer at the same price.

ALWAYS pass resolution:'2K' on either Gemini. Omitting it silently defaults to '1K' (1376x768 = 1.1MP for $0.069 on flash) — the worst $/MP of any option here. On gemini-3-pro-image '1K' and '2K' cost the SAME ($0.135 vs $0.137, both 1120 image tokens), so asking pro for '1K' is a pure loss.

'4K' exists on both Gemini models (5504x3072 = 16.9MP) but costs 50-75% more ($0.153 flash / $0.242 pro). 16.9MP is print territory — do NOT use it for web work.

Deliberately not listed: x-ai/grok-imagine-image-2.0 (1280x720 = 0.9MP for $0.060, the worst $/MP measured — and it silently ignores 'size') and google/gemini-3.1-flash-lite-image (failed quality testing).`,
    ),
  aspect_ratio: z
    .string()
    .optional()
    .describe(
      "Aspect ratio, e.g. '16:9', '1:1', '9:16'. Works on every listed model and is the PREFERRED way to control framing. It also moves the price on the default model, where cost scales with pixels: 16:9 = 1536x864 for $0.035, 1:1 = 1024x1024 for $0.024. On Seedream the price is flat instead, so a wider ratio buys pixels for free (16:9 -> 7.5MP vs 4.2MP for 1:1, same $0.035).",
    ),
  resolution: z
    .string()
    .optional()
    .describe(
      "Resolution tier: '2K' (use this) or '4K' (print only — 50-75% dearer for pixels web can't use). Gemini only; do not pass it with Seedream or with the default GPT model, neither of which has tiers. MANDATORY on Gemini — omitting it defaults to '1K', which is the worst $/MP on every model that offers it (flash: 1.1MP for $0.069; and on gemini-3-pro-image '1K' costs the same as '2K' for a quarter of the pixels).",
    ),
  size: z
    .string()
    .regex(/^\d+x\d+$/, "Use '<width>x<height>', e.g. '2560x1440'.")
    .optional()
    .describe(
      "Explicit pixel size, '<width>x<height>'. Seedream only — the default GPT model and grok ignore it silently. Price is flat ($0.035) whatever you ask for, so 'size' either LOWERS what you get (e.g. '2560x1440' = 3.7MP vs 7.5MP with aspect_ratio alone) or, for print work, RAISES it up to the 16,777,216 px ceiling ('5456x3072' = 16.8MP). For web work prefer aspect_ratio alone. Accepted range: 3686400 to 16777216 px; the model rejects anything outside it.",
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
  model?: string;
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
