import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { ToolError } from "../lib/errors.js";
import { DEFAULT_MYSTIC_MODEL, generateMystic } from "../lib/magnific.js";

/**
 * Magnific (Mystic) engine behind the `create_image` router. Not registered as
 * a tool on its own — the router owns the prompt-skill gate, the provider
 * choice and the save_dir/filename resolution.
 */

const MYSTIC_MODELS = [
  "zen",
  "flexible",
  "fluid",
  "realism",
  "super_real",
  "editorial_portraits",
] as const;

const MYSTIC_ENGINES = [
  "automatic",
  "magnific_illusio",
  "magnific_sharpy",
  "magnific_sparkle",
] as const;

const MYSTIC_ASPECT_RATIOS = [
  "square_1_1",
  "classic_4_3",
  "traditional_3_4",
  "widescreen_16_9",
  "social_story_9_16",
  "smartphone_horizontal_20_9",
  "smartphone_vertical_9_20",
  "standard_3_2",
  "portrait_2_3",
  "horizontal_2_1",
  "vertical_1_2",
  "social_5_4",
  "social_post_4_5",
] as const;

/** Reference-image file extensions we can read and base64-encode. */
const REF_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Map a downloaded image's content-type to a file extension. */
const CT_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Resolve a reference image to raw base64 (no data: prefix — Mystic wants the
 * bytes). Accepts a local path (absolute or relative to cwd) or an http(s) URL.
 */
async function resolveReference(ref: string): Promise<string> {
  if (/^https?:\/\//i.test(ref)) {
    const res = await fetch(ref);
    if (!res.ok) {
      throw new ToolError(
        `Could not fetch reference image (HTTP ${res.status}): ${ref}`,
        "Pass a reachable http(s) URL or a local file path.",
      );
    }
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  }
  const abs = path.isAbsolute(ref) ? ref : path.resolve(process.cwd(), ref);
  if (!REF_EXTS.has(path.extname(abs).toLowerCase())) {
    throw new ToolError(
      `Unsupported reference image type: ${ref}`,
      "Use png/jpg/jpeg/webp files or an http(s) URL.",
    );
  }
  try {
    return (await fs.readFile(abs)).toString("base64");
  } catch {
    throw new ToolError(
      `Reference image not found: ${abs}`,
      "Pass an existing file path (absolute or relative to the project cwd) or an http(s) URL.",
    );
  }
}

/** Download the generated URLs into saveDir, returning the saved absolute paths. */
async function downloadImages(urls: string[], saveDir: string, base: string): Promise<string[]> {
  const dirAbs = path.isAbsolute(saveDir) ? saveDir : path.resolve(process.cwd(), saveDir);
  await fs.mkdir(dirAbs, { recursive: true });

  const paths: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    if (!res.ok) {
      throw new ToolError(
        `Could not download generated image (HTTP ${res.status}).`,
        "The Magnific result URL may have expired. Retry the generation.",
      );
    }
    const ct = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const ext = CT_EXT[ct] ?? path.extname(new URL(urls[i]).pathname).replace(".", "") ?? "png";
    const name = urls.length > 1 ? `${base}-${i + 1}.${ext}` : `${base}.${ext}`;
    const filePath = path.join(dirAbs, name);
    await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
    paths.push(filePath);
  }
  return paths;
}

/** Provider-specific half of the router's input schema (provider='magnific'). */
export const magnificInputShape = {
  model: z
    .enum(MYSTIC_MODELS)
    .optional()
    .describe(
      `Mystic base model. Default: ${DEFAULT_MYSTIC_MODEL}. 'realism'/'super_real' for photographic, 'editorial_portraits' for people, 'zen'/'flexible'/'fluid' for stylised/artistic output.`,
    ),
  engine: z
    .enum(MYSTIC_ENGINES)
    .optional()
    .describe("Detailing engine. Default: automatic. illusio=soft, sharpy=crisp, sparkle=max detail."),
  resolution: z.enum(["1k", "2k", "4k"]).optional().describe("Output resolution tier. Default: 2k. 4k is print territory."),
  aspect_ratio: z
    .enum(MYSTIC_ASPECT_RATIOS)
    .optional()
    .describe("Aspect ratio. Default: square_1_1. E.g. widescreen_16_9, social_story_9_16, portrait_2_3."),
  adherence: z.number().int().min(0).max(100).optional().describe("Prompt fidelity vs. style transfer, 0-100. Default 50."),
  hdr: z.number().int().min(0).max(100).optional().describe("Detail vs. naturalism, 0-100. Default 50."),
  creative_detailing: z.number().int().min(0).max(100).optional().describe("Creative detailing, 0-100. Default 33."),
  fixed_generation: z.boolean().optional().describe("Reproducible output for the same inputs. Default false."),
  structure_reference: z
    .string()
    .optional()
    .describe("Reference image guiding composition/structure: local path (png/jpg/webp) or http(s) URL."),
  structure_strength: z.number().int().min(0).max(100).optional().describe("How strongly to follow structure_reference, 0-100. Default 50."),
  style_reference: z
    .string()
    .optional()
    .describe("Reference image guiding aesthetics/style: local path (png/jpg/webp) or http(s) URL."),
};

export type MagnificArgs = {
  model?: (typeof MYSTIC_MODELS)[number];
  engine?: (typeof MYSTIC_ENGINES)[number];
  resolution?: "1k" | "2k" | "4k";
  aspect_ratio?: (typeof MYSTIC_ASPECT_RATIOS)[number];
  adherence?: number;
  hdr?: number;
  creative_detailing?: number;
  fixed_generation?: boolean;
  structure_reference?: string;
  structure_strength?: number;
  style_reference?: string;
};

export type MagnificResult = {
  paths: string[];
  count: number;
  task_id: string;
};

export function formatMagnificReport(r: MagnificResult): string {
  const lines: string[] = [];
  lines.push(`Сгенерировано через Magnific (Mystic): ${r.count}.`);
  lines.push("Сохранено:", ...r.paths.map((p) => `  ${p}`));
  lines.push(`Task id: ${r.task_id}`);
  return lines.join("\n");
}

/**
 * Generate via Magnific (Mystic) and download the frames. The prompt-skill gate
 * lives in the router, which is the only caller — args here are already checked.
 */
export async function runMagnificGenerate(
  prompt: string,
  args: MagnificArgs,
  saveDir: string,
  base: string,
): Promise<MagnificResult> {
  const result = await generateMystic({
    prompt,
    model: args.model,
    engine: args.engine,
    resolution: args.resolution,
    aspect_ratio: args.aspect_ratio,
    adherence: args.adherence,
    hdr: args.hdr,
    creative_detailing: args.creative_detailing,
    fixed_generation: args.fixed_generation,
    structure_reference: args.structure_reference
      ? await resolveReference(args.structure_reference)
      : undefined,
    structure_strength: args.structure_strength,
    style_reference: args.style_reference
      ? await resolveReference(args.style_reference)
      : undefined,
  });

  const paths = await downloadImages(result.urls, saveDir, base);

  return { paths, count: paths.length, task_id: result.task_id };
}
