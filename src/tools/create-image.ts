import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { toolError } from "../lib/errors.js";
import { PROMPT_SOURCE_DESCRIPTION, assertPromptSkill } from "../lib/image-skill.js";
import { hasMagnificKey } from "../lib/magnific.js";
import {
  formatOpenrouterReport,
  openrouterInputShape,
  runGenerateImage,
  type OpenrouterArgs,
} from "./generate-image.js";
import {
  formatMagnificReport,
  magnificInputShape,
  runMagnificGenerate,
  type MagnificArgs,
} from "./magnific-generate.js";

/**
 * Single entry point for "make me an image". Two providers behind one tool:
 * OpenRouter (Seedream / Gemini — the everyday path, paid per frame) and
 * Magnific Mystic (direct API, burns Business-plan credits).
 *
 * The OpenRouter knobs sit at the top level because that is the default path
 * and the 'image' skill's pattern files quote those argument names verbatim.
 * Mystic's knobs are nested under `magnific` instead of sharing them: the value
 * spaces genuinely collide (aspect_ratio '16:9' vs 'widescreen_16_9',
 * resolution '2K' vs '2k', model free-form vs enum), and a flat merge would
 * make an invalid combination look valid in the schema.
 *
 * The prompt-skill gate lives here, once, ahead of the dispatch: `prompt` and
 * `prompt_source` are router-level arguments, and neither engine may spend
 * money before it has passed.
 *
 * Magnific is gated on MAGNIFIC_API_KEY being present: without it neither
 * `provider` nor `magnific` appears in the schema and the description never
 * mentions Mystic, so an install that could not generate on it is not told
 * about it (and pays no tokens for the copy).
 */

/** Default output dir (relative to the server's cwd = the project). */
const DEFAULT_SAVE_DIR = "./generated";

function buildInputSchema(magnificEnabled: boolean) {
  return {
    prompt: z
      .string()
      .min(1)
      .describe(
        "What to generate. ОБЯЗАТЕЛЬНО собери его скиллом 'image' — у каждой модели свой синтаксис промпта. Тул откажет, если скилла нет в проекте или не заполнен prompt_source.",
      ),
    prompt_source: z.string().min(1).describe(PROMPT_SOURCE_DESCRIPTION),
    ...(magnificEnabled
      ? {
          provider: z
            .enum(["openrouter", "magnific"])
            .optional()
            .describe(
              "Which engine to generate on. Default 'openrouter' — Seedream/Gemini, the everyday path. " +
                "Pick 'magnific' only when the user asked for Magnific/Mystic by name: it goes to the direct " +
                "Magnific API and burns Business-plan credits rather than per-frame API money.",
            ),
        }
      : {}),
    ...openrouterInputShape,
    ...(magnificEnabled
      ? {
          magnific: z
            .object(magnificInputShape)
            .optional()
            .describe(
              "Mystic-only settings, used when provider='magnific'. Kept in their own object because the " +
                "value spaces differ from the top-level (OpenRouter) ones: aspect_ratio is 'widescreen_16_9' " +
                "here and '16:9' up there, resolution is '2k' here and '2K' up there. Ignored for OpenRouter.",
            ),
        }
      : {}),
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
}

function buildOutputSchema(magnificEnabled: boolean) {
  return {
    provider: magnificEnabled
      ? z.enum(["openrouter", "magnific"]).describe("Engine the frames came from.")
      : z.literal("openrouter").describe("Engine the frames came from."),
    paths: z.array(z.string()).describe("Absolute paths of the saved image files."),
    count: z.number(),
    save_dir: z.string(),
    model: z
      .string()
      .optional()
      .describe(magnificEnabled ? "openrouter only: the model that ran." : "The model that ran."),
    cost: z
      .number()
      .optional()
      .describe(
        magnificEnabled
          ? "openrouter only: total cost in USD, when reported."
          : "Total cost in USD, when reported.",
      ),
    ...(magnificEnabled
      ? { task_id: z.string().optional().describe("magnific only: Mystic task id, for reference.") }
      : {}),
  };
}

const OPENROUTER_DESCRIPTION =
  "Seedream 5.0 Lite / Gemini 3 via OpenRouter. Returns the image inline in chat plus the saved paths and the measured cost. Seedream is the default model: $0.035 flat at any resolution, best prompt adherence — control framing with `aspect_ratio` alone (7.5MP at 16:9) and pass `size` only for print work (ceiling 16.8MP, same price). Seedream covers essentially every task; read the `model` description before picking anything else, it carries a measured decision table. EDITING: pass the source image via `reference_images` (local paths or URLs) plus an instruction in the prompt ('remove the sign', 'make the background lighter'); every model here accepts image input. Name what must stay unchanged explicitly ('keeping its pose unchanged') — the vendor-documented way to avoid drift. Mask-based inpainting is NOT supported. Sizing is model-specific: Seedream takes `aspect_ratio` alone; Gemini needs `aspect_ratio` + `resolution:'2K'`. Requires OPENROUTER_API_KEY in the server .env.";

const TAIL_DESCRIPTION =
  "Files land in save_dir (default ./generated, relative to the project). AFTER GENERATING: raw output is full-resolution and the wrong format for production — run `optimize_images` on save_dir before shipping (resize/webp/srcset). In a landing build (create_website kind='landing') this is the mandatory last step of the image stage: generate the whole series first (hero → reference_images for the rest, same 'photoshoot'), then one `optimize_images` call on assets/img at the end — never optimize between individual generations.";

function buildDescription(magnificEnabled: boolean): string {
  if (!magnificEnabled) {
    return (
      `Generate or edit image(s) and save them into the project. ${OPENROUTER_DESCRIPTION}\n\n` +
      "MANDATORY FIRST STEP: the prompt must be written with the bundled 'image' skill — each model needs its own prompt syntax, and Seedream in particular treats comma-separated tags as an anti-pattern. The tool refuses to generate when the skill is missing from the project (it installs it and tells you to read .claude/skills/image/SKILL.md from disk, then call again) or when `prompt_source` is empty.\n\n" +
      TAIL_DESCRIPTION
    );
  }
  return (
    "Generate or edit image(s) and save them into the project. One entry point, two engines — pick with `provider`:\n\n" +
    `• provider='openrouter' (DEFAULT, use it unless told otherwise) — ${OPENROUTER_DESCRIPTION}\n\n` +
    "• provider='magnific' — Magnific's Mystic (direct Magnific API, NOT OpenRouter): strong photographic realism, structure/style references, hdr/creative_detailing sliders. Async under the hood — submits and polls up to 5 min, then downloads the result. All its settings go in the `magnific` object, never at the top level; the top-level OpenRouter knobs are ignored for this provider. Costs Business-plan credits, not per-frame API money, so choose it only when the user asked for Magnific/Mystic by name. Requires MAGNIFIC_API_KEY in the server .env.\n\n" +
    "MANDATORY FIRST STEP for both: the prompt must be written with the bundled 'image' skill — each model needs its own prompt syntax (Seedream treats comma-separated tags as an anti-pattern; Mystic has its own flavor/engine/slider vocabulary in references/mystic.md). The tool refuses to generate when the skill is missing from the project (it installs it and tells you to read .claude/skills/image/SKILL.md from disk, then call again) or when `prompt_source` is empty.\n\n" +
    TAIL_DESCRIPTION
  );
}

type Args = OpenrouterArgs & {
  prompt_source: string;
  provider?: "openrouter" | "magnific";
  magnific?: MagnificArgs;
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
  // Read once, at registration: the schema and the description are what the
  // client caches, and the key cannot appear mid-process anyway.
  const magnificEnabled = hasMagnificKey();

  server.registerTool(
    "create_image",
    {
      title: "Create image",
      description: buildDescription(magnificEnabled),
      inputSchema: buildInputSchema(magnificEnabled),
      outputSchema: buildOutputSchema(magnificEnabled),
    },
    async (args: Args) => {
      try {
        // Gate first: neither engine spends money until the prompt went through
        // the skill.
        await assertPromptSkill(args.project_path?.trim() || process.cwd(), args.prompt_source);

        const saveDir = args.save_dir?.trim() || DEFAULT_SAVE_DIR;
        const base = baseName(args.filename, args.prompt);

        if (args.provider === "magnific" && magnificEnabled) {
          const result = await runMagnificGenerate(
            args.prompt,
            args.magnific ?? {},
            saveDir,
            base,
          );
          return {
            content: [{ type: "text" as const, text: formatMagnificReport(result) }],
            structuredContent: { provider: "magnific" as const, ...result, save_dir: saveDir },
          };
        }

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
