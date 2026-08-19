import { ToolError } from "./errors.js";

const IMAGES_ENDPOINT = "https://openrouter.ai/api/v1/images";

/**
 * Default image model — Seedream 5.0 Lite. Flat $0.035/img at any size: `aspect_ratio` alone
 * gives 3642x2048 = 7.5MP at 16:9 (~$0.0047/MP), and an explicit `size` reaches the
 * 16,777,216 px ceiling (5456x3072 = 16.8MP) for the same money — roughly 5x cheaper per
 * pixel than gemini-3.1-flash-image at its usable `2K` tier.
 * Successor to seedream-4.5: same flat price model, higher pixel ceiling, slightly cheaper.
 * See docs/_dev/image-cost-audit.md for the measured matrix.
 */
export const DEFAULT_IMAGE_MODEL = "bytedance-seed/seedream-5-0-lite";

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
      `It may not support image output, or the prompt was refused. Try ${DEFAULT_IMAGE_MODEL} or rephrase the prompt.`,
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
