import { ToolError } from "./errors.js";

const IMAGES_ENDPOINT = "https://openrouter.ai/api/v1/images";

/**
 * The models `create_image` may draw with — the same five the landing-page
 * generator offers its operators, kept as ONE list on purpose: a vendor retires
 * a model when it ships the next one, and a short list shared by both apps is a
 * list that can actually be kept true (IMG-8). The schema turns this into an
 * enum, so a slug outside it is refused before any money is spent.
 *
 * Order is the decision order: production first (the default), then drafts,
 * then the editor. Prices are measured `usage.cost` per frame at 16:9.
 */
export const IMAGE_MODELS = [
  /** Production. $0.101 at 2K (2752x1536): best skin/material fidelity, banner ratios. */
  "google/gemini-3.1-flash-image",
  /** Drafts. $0.034, 1K tier only — it has no 2K to sell. Fastest frame of the set. */
  "google/gemini-3.1-flash-lite-image",
  /** Editing and series. $0.035 flat at any size, 7.5MP at 16:9, best editor. Slowest. */
  "bytedance-seed/seedream-5-0-lite",
  /** Hardest scenes only. $0.137 at 2K; cleaner but more sterile than flash. */
  "google/gemini-3-pro-image",
  /** Only when the user names it: price follows pixels (~$0.019/MP), 4.6MP ceiling. */
  "bytedance-seed/seedream-5-0-pro",
] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];

/**
 * Default — Gemini 3.1 Flash, the production model. It is the one measured on
 * our own frames (skin, materials, hardware) and the one the generator defaults
 * to; a draft is the exception the agent opts into, not the other way round.
 * Pass `resolution:'2K'` with it — omitted, the API falls back to 1K.
 */
export const DEFAULT_IMAGE_MODEL: ImageModel = IMAGE_MODELS[0];

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  /**
   * Explicit pixel size, "<width>x<height>" (e.g. "2560x1440"). Some models take
   * only this and ignore aspect_ratio/resolution — notably Seedream 5.0 Lite, which also
   * rejects anything under 3_686_400 px.
   */
  size?: string;
  n?: number;
  seed?: number;
  output_format?: string;
  /**
   * Reference images for image-to-image / style anchoring: HTTP(S) URLs or
   * base64 data URLs. Sent as `input_references` (max 16, provider-dependent).
   */
  reference_images?: string[];
}

export interface GeneratedImage {
  /** Raw base64 (no data: prefix). */
  b64: string;
  /** MIME type, e.g. "image/png". */
  mediaType: string;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  model: string;
  /** Total cost in USD, when OpenRouter reports it. */
  cost?: number;
}

/** Shape of the /api/v1/images response we rely on. */
interface ImagesResponse {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  usage?: { cost?: number };
  error?: { message?: string };
  message?: string;
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new ToolError(
      "OPENROUTER_API_KEY is not set.",
      "Add it to the server's .env (OPENROUTER_API_KEY=sk-or-v1-…) and restart the MCP server. Get a key at https://openrouter.ai/keys.",
    );
  }
  return key;
}

/** Generate one or more images via OpenRouter's images endpoint. */
export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  const key = apiKey();
  const model = params.model?.trim() || DEFAULT_IMAGE_MODEL;

  const body: Record<string, unknown> = { model, prompt: params.prompt };
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.resolution) body.resolution = params.resolution;
  if (params.size) body.size = params.size;
  if (params.n !== undefined) body.n = params.n;
  if (params.seed !== undefined) body.seed = params.seed;
  if (params.output_format) body.output_format = params.output_format;
  if (params.reference_images?.length) {
    body.input_references = params.reference_images.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));
  }

  let res: Response;
  try {
    res = await fetch(IMAGES_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ToolError(
      `Network error calling OpenRouter: ${(error as Error).message}`,
      "Check your connection and that openrouter.ai is reachable.",
    );
  }

  const text = await res.text();
  let json: ImagesResponse;
  try {
    json = JSON.parse(text) as ImagesResponse;
  } catch {
    throw new ToolError(
      `OpenRouter returned non-JSON (HTTP ${res.status}).`,
      text.slice(0, 300) || "Empty body. Retry, or check https://openrouter.ai/docs.",
    );
  }

  if (!res.ok) throw mapApiError(res.status, json, model);

  const images: GeneratedImage[] = (json.data ?? [])
    .filter((d) => typeof d.b64_json === "string")
    .map((d) => ({ b64: d.b64_json as string, mediaType: d.media_type || "image/png" }));

  if (images.length === 0) {
    throw new ToolError(
      `Model '${model}' returned no image.`,
      "It may not support image output, or the prompt was refused. Try bytedance-seed/seedream-5-0-lite or rephrase the prompt.",
    );
  }

  return { images, model, cost: json.usage?.cost };
}

/** Map an OpenRouter HTTP error into an actionable ToolError. */
function mapApiError(status: number, json: ImagesResponse, model: string): ToolError {
  const msg = json.error?.message || json.message || `HTTP ${status}`;
  switch (status) {
    case 401:
      return new ToolError(
        "OpenRouter rejected the API key (401).",
        "The key in .env is invalid or revoked. Get a fresh one at https://openrouter.ai/keys.",
      );
    case 402:
      return new ToolError(
        "Insufficient OpenRouter credits (402).",
        "Top up at https://openrouter.ai/credits, then retry.",
      );
    case 404:
      return new ToolError(
        `Model '${model}' not found (404): ${msg}`,
        "Check the id at https://openrouter.ai/models?output_modalities=image.",
      );
    case 429:
      return new ToolError(
        "OpenRouter rate limit hit (429).",
        "Wait a few seconds and retry, or lower n.",
      );
    default:
      return new ToolError(
        `OpenRouter error (${status}): ${msg}`,
        "See https://openrouter.ai/docs for details.",
      );
  }
}
