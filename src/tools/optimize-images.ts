import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import sharp from "sharp";
import { z } from "zod";

import { ToolError, toolError } from "../lib/errors.js";

/** Source extensions we optimize (others in a directory are silently ignored). */
const SOURCE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".tiff"]);

type OutputFormat = "webp" | "jpeg" | "avif";

/** Per-format default quality: avif's scale runs lower than webp/jpeg. */
const DEFAULT_QUALITY: Record<OutputFormat, number> = { webp: 80, jpeg: 80, avif: 60 };

const OUT_EXT: Record<OutputFormat, string> = { webp: ".webp", jpeg: ".jpg", avif: ".avif" };

export const optimizeImagesInputSchema = {
  paths: z
    .array(z.string())
    .min(1)
    .describe(
      "Image files and/or directories (absolute, or relative to the project cwd). A directory takes every supported image at its top level (png/jpg/webp/avif/tiff).",
    ),
  format: z
    .enum(["webp", "jpeg", "avif"])
    .optional()
    .describe("Output format. Default: webp (best size/support balance for the web)."),
  max_width: z
    .number()
    .int()
    .min(16)
    .optional()
    .describe("Resize down to this width, keeping aspect ratio; never upscales. Default: 1920."),
  quality: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Encode quality. Defaults: webp/jpeg 80, avif 60."),
  widths: z
    .array(z.number().int().min(16))
    .max(8)
    .optional()
    .describe(
      "Extra downsized variants for srcset, e.g. [800] → name-800.webp next to the main file. Variants wider than the source are skipped.",
    ),
  keep_originals: z
    .boolean()
    .optional()
    .describe(
      "Keep source files after conversion. Default false: the source is replaced by the optimized output (prevents heavy originals leaking into production).",
    ),
};

export const optimizeImagesOutputSchema = {
  files: z
    .array(
      z.object({
        source: z.string(),
        kb_before: z.number(),
        outputs: z.array(
          z.object({
            path: z.string(),
            width: z.number(),
            height: z.number(),
            kb: z.number(),
          }),
        ),
      }),
    )
    .describe("Optimized files with their output variants (sizes for <img> width/height)."),
  skipped: z
    .array(z.object({ path: z.string(), reason: z.string() }))
    .describe("Inputs that could not be processed."),
  total_kb_before: z.number(),
  total_kb_after: z.number().describe("Total size of main outputs (srcset variants excluded)."),
};

type OutputInfo = { path: string; width: number; height: number; kb: number };
type FileResult = { source: string; kb_before: number; outputs: OutputInfo[] };
type OptimizeImagesResult = {
  files: FileResult[];
  skipped: { path: string; reason: string }[];
  total_kb_before: number;
  total_kb_after: number;
};

const kb = (bytes: number): number => Math.round(bytes / 1024);

/** Expand the input paths: directories → their top-level images; files as-is. */
async function collectFiles(
  paths: string[],
  skipped: { path: string; reason: string }[],
): Promise<string[]> {
  const files: string[] = [];
  for (const p of paths) {
    const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    let stat;
    try {
      stat = await fs.stat(abs);
    } catch {
      skipped.push({ path: p, reason: "not found" });
      continue;
    }
    if (stat.isDirectory()) {
      const entries = await fs.readdir(abs, { withFileTypes: true });
      const images = entries
        .filter((e) => e.isFile() && SOURCE_EXTS.has(path.extname(e.name).toLowerCase()))
        .map((e) => path.join(abs, e.name));
      if (images.length === 0) skipped.push({ path: p, reason: "directory has no images" });
      files.push(...images);
    } else if (SOURCE_EXTS.has(path.extname(abs).toLowerCase())) {
      files.push(abs);
    } else {
      skipped.push({ path: p, reason: "unsupported file type" });
    }
  }
  return [...new Set(files)];
}

/** Encode one source into `outPath` (via a temp file when overwriting the source). */
async function encode(
  source: string,
  outPath: string,
  width: number,
  format: OutputFormat,
  quality: number,
): Promise<OutputInfo> {
  // .rotate() bakes in EXIF orientation — client phone photos come rotated.
  const pipeline = sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .toFormat(format, { quality, ...(format === "jpeg" ? { mozjpeg: true } : {}) });

  const overwriting = outPath === source;
  const target = overwriting ? `${outPath}.tmp` : outPath;
  const info = await pipeline.toFile(target);
  if (overwriting) await fs.rename(target, outPath);
  return { path: outPath, width: info.width, height: info.height, kb: kb(info.size) };
}

export async function runOptimizeImages(args: {
  paths: string[];
  format?: OutputFormat;
  max_width?: number;
  quality?: number;
  widths?: number[];
  keep_originals?: boolean;
}): Promise<OptimizeImagesResult> {
  const format = args.format ?? "webp";
  const maxWidth = args.max_width ?? 1920;
  const quality = args.quality ?? DEFAULT_QUALITY[format];

  const skipped: { path: string; reason: string }[] = [];
  const sources = await collectFiles(args.paths, skipped);
  if (sources.length === 0 && skipped.length > 0) {
    throw new ToolError(
      "No processable images in `paths`.",
      `Skipped: ${skipped.map((s) => `${s.path} (${s.reason})`).join("; ")}`,
    );
  }

  const files: FileResult[] = [];
  for (const source of sources) {
    try {
      const srcBytes = (await fs.stat(source)).size;
      const base = path.join(
        path.dirname(source),
        path.basename(source, path.extname(source)),
      );
      const mainPath = `${base}${OUT_EXT[format]}`;

      const outputs: OutputInfo[] = [await encode(source, mainPath, maxWidth, format, quality)];
      const mainWidth = outputs[0].width;
      for (const w of args.widths ?? []) {
        if (w >= mainWidth) continue; // no point duplicating the main output
        outputs.push(await encode(source, `${base}-${w}${OUT_EXT[format]}`, w, format, quality));
      }

      if (!args.keep_originals && source !== mainPath) await fs.unlink(source);
      files.push({ source, kb_before: kb(srcBytes), outputs });
    } catch (error) {
      skipped.push({ path: source, reason: (error as Error).message ?? String(error) });
    }
  }

  return {
    files,
    skipped,
    total_kb_before: files.reduce((sum, f) => sum + f.kb_before, 0),
    total_kb_after: files.reduce((sum, f) => sum + f.outputs[0].kb, 0),
  };
}

function formatReport(r: OptimizeImagesResult): string {
  const lines: string[] = [];
  lines.push(
    `Оптимизировано: ${r.files.length} (${r.total_kb_before} КБ → ${r.total_kb_after} КБ основные файлы).`,
  );
  for (const f of r.files) {
    lines.push(`  ${f.source} (${f.kb_before} КБ)`);
    for (const o of f.outputs) {
      lines.push(`    → ${o.path} — ${o.width}×${o.height}, ${o.kb} КБ`);
    }
  }
  if (r.skipped.length) {
    lines.push("Пропущено:", ...r.skipped.map((s) => `  ! ${s.path}: ${s.reason}`));
  }
  return lines.join("\n");
}

export function registerOptimizeImages(server: McpServer): void {
  server.registerTool(
    "optimize_images",
    {
      title: "Optimize images",
      description:
        "Resize and re-encode images for production web use via sharp: downscale to max_width (default 1920, never upscales), convert to webp (default; jpeg/avif available), auto-apply EXIF rotation, optionally emit extra srcset variants (widths → name-<w>.webp). By default the source file is replaced by the optimized output so heavy originals don't leak into production; keep_originals: true preserves them. Accepts files or directories. Returns final dimensions (use them for <img> width/height) and sizes before/after. Typical landing use: generate images into assets/img, then optimize the whole directory in one call.",
      inputSchema: optimizeImagesInputSchema,
      outputSchema: optimizeImagesOutputSchema,
    },
    async (args: {
      paths: string[];
      format?: OutputFormat;
      max_width?: number;
      quality?: number;
      widths?: number[];
      keep_originals?: boolean;
    }) => {
      try {
        const result = await runOptimizeImages(args);
        return {
          content: [{ type: "text" as const, text: formatReport(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
