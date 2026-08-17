import { ToolError } from "./errors.js";

const MYSTIC_ENDPOINT = "https://api.magnific.com/v1/ai/mystic";

/** Poll cadence for the async task: check every 2.5s, give up after ~5 min. */
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Mystic base model default. super_real over realism: measured (2026-07-23) to give
 * documentary light and readable Cyrillic on everyday people/text scenes, where realism
 * reliably produced a cinematic "AI look" and garbage pseudo-Cyrillic. See mystic.md.
 */
export const DEFAULT_MYSTIC_MODEL = "super_real";

export interface MysticParams {
  prompt: string;
  /** Base model flavour. Default: super_real. */
  model?: string;
  /** Detailing engine. Default: automatic. */
  engine?: string;
  /** Output resolution tier. Default: 2k. */
  resolution?: string;
  /** Aspect ratio enum (e.g. widescreen_16_9). Default: square_1_1. */
  aspect_ratio?: string;
  /** Prompt fidelity vs. style transfer, 0-100. */
  adherence?: number;
  /** Detail vs. naturalism, 0-100. */
  hdr?: number;
  /** Creative detailing, 0-100. */
  creative_detailing?: number;
  /** Reproducible outputs. */
  fixed_generation?: boolean;
  /** base64 image guiding composition. */
  structure_reference?: string;
  /** Structure adherence, 0-100. */
  structure_strength?: number;
  /** base64 image guiding aesthetics. */
  style_reference?: string;
}

export interface MysticResult {
  /** URLs of the generated images. */
  urls: string[];
  task_id: string;
}

/** Shape of the Mystic POST/GET response we rely on. */
interface MysticResponse {
  data?: {
    task_id?: string;
    status?: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    generated?: string[];
  };
  error?: { message?: string };
  message?: string;
}

/**
 * Whether this install has a Magnific key at all. Read at tool-registration
 * time (never at import time — `.env` is loaded in index.ts after the imports
 * run) so that a keyless install advertises create_image as OpenRouter-only:
 * the same sources ship everywhere, and the provider simply does not exist for
 * anyone who cannot pay for it.
 */
export function hasMagnificKey(): boolean {
  return Boolean(process.env.MAGNIFIC_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.MAGNIFIC_API_KEY?.trim();
  if (!key) {
    throw new ToolError(
      "MAGNIFIC_API_KEY is not set.",
      "Add it to the server's .env (MAGNIFIC_API_KEY=…) and restart the MCP server. Generate a key at https://www.magnific.com/user/api-keys (Business/Enterprise plan required).",
    );
  }
  return key;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Parse a Magnific JSON response, failing with an actionable error on non-JSON. */
async function parseJson(res: Response): Promise<MysticResponse> {
  const text = await res.text();
  try {
    return JSON.parse(text) as MysticResponse;
  } catch {
    throw new ToolError(
      `Magnific returned non-JSON (HTTP ${res.status}).`,
      text.slice(0, 300) || "Empty body. Retry, or check https://docs.magnific.com.",
    );
  }
}

/** Map a Magnific HTTP error into an actionable ToolError. */
function mapApiError(status: number, json: MysticResponse): ToolError {
  const msg = json.error?.message || json.message || `HTTP ${status}`;
  switch (status) {
    case 401:
    case 403:
      return new ToolError(
        `Magnific rejected the API key (${status}).`,
        "The key in .env is invalid, revoked, or lacks API access. Get one at https://www.magnific.com/user/api-keys (Business/Enterprise only).",
      );
    case 402:
      return new ToolError(
        "Insufficient Magnific credits (402).",
        "Top up your plan, then retry.",
      );
    case 429:
      return new ToolError(
        "Magnific rate limit hit (429).",
        "Wait a few seconds and retry.",
      );
    default:
      return new ToolError(
        `Magnific error (${status}): ${msg}`,
        "See https://docs.magnific.com for details.",
      );
  }
}

/** Assemble the POST body, omitting undefined fields so defaults apply server-side. */
function buildBody(params: MysticParams): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.model) body.model = params.model;
  if (params.engine) body.engine = params.engine;
  if (params.resolution) body.resolution = params.resolution;
  if (params.aspect_ratio) body.aspect_ratio = params.aspect_ratio;
  if (params.adherence !== undefined) body.adherence = params.adherence;
  if (params.hdr !== undefined) body.hdr = params.hdr;
  if (params.creative_detailing !== undefined) body.creative_detailing = params.creative_detailing;
  if (params.fixed_generation !== undefined) body.fixed_generation = params.fixed_generation;
  if (params.structure_reference) body.structure_reference = params.structure_reference;
  if (params.structure_strength !== undefined) body.structure_strength = params.structure_strength;
  if (params.style_reference) body.style_reference = params.style_reference;
  return body;
}

/**
 * Generate one or more images via Magnific's Mystic model. The endpoint is async:
 * POST creates a task, then we poll GET /{task_id} until it is COMPLETED.
 */
export async function generateMystic(params: MysticParams): Promise<MysticResult> {
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(MYSTIC_ENDPOINT, {
      method: "POST",
      headers: { "x-magnific-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(params)),
    });
  } catch (error) {
    throw new ToolError(
      `Network error calling Magnific: ${(error as Error).message}`,
      "Check your connection and that api.magnific.com is reachable.",
    );
  }

  const json = await parseJson(res);
  if (!res.ok) throw mapApiError(res.status, json);

  const taskId = json.data?.task_id;
  if (!taskId) {
    throw new ToolError(
      "Magnific accepted the request but returned no task_id.",
      "Retry, or check https://docs.magnific.com if it persists.",
    );
  }

  return pollTask(key, taskId);
}

/** Poll the task until COMPLETED, FAILED, or timeout. */
async function pollTask(key: string, taskId: string): Promise<MysticResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let res: Response;
    try {
      res = await fetch(`${MYSTIC_ENDPOINT}/${taskId}`, {
        headers: { "x-magnific-api-key": key },
      });
    } catch {
      continue; // transient network blip — keep polling until the deadline
    }

    const json = await parseJson(res);
    if (!res.ok) throw mapApiError(res.status, json);

    const status = json.data?.status;
    if (status === "COMPLETED") {
      const urls = json.data?.generated ?? [];
      if (urls.length === 0) {
        throw new ToolError(
          "Magnific reported COMPLETED but returned no images.",
          "The prompt may have been filtered. Rephrase it and retry.",
        );
      }
      return { urls, task_id: taskId };
    }
    if (status === "FAILED") {
      throw new ToolError(
        `Magnific task ${taskId} failed.`,
        "The prompt may have been refused or the service errored. Rephrase and retry.",
      );
    }
  }

  throw new ToolError(
    `Magnific task ${taskId} did not finish within ${POLL_TIMEOUT_MS / 1000}s.`,
    "The service may be slow or stuck. Retry; the task id above can be checked at https://docs.magnific.com.",
  );
}
