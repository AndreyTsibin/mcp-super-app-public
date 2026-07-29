import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { ToolError, toolError } from "../lib/errors.js";
import { getLucideIcon, getSimpleIcon, styleSvg } from "../lib/icons.js";

export const getIconOutputSchema = {
  set: z.enum(["lucide", "simple-icons"]),
  name: z.string(),
  title: z.string(),
  svg: z.string().describe("Raw <svg>…</svg> markup, ready to inline."),
  hex: z.string().optional().describe("Official brand color (simple-icons only)."),
};

export function registerGetIcon(server: McpServer): void {
  server.registerTool(
    "get_icon",
    {
      title: "Get icon",
      description:
        "Fetch one icon's raw SVG markup by exact name from lucide (generic UI icons) or simple-icons (brand logos). Use search_icons first if the exact name/set isn't already known.",
      inputSchema: {
        set: z.enum(["lucide", "simple-icons"]).describe("Which icon set `name` belongs to."),
        name: z
          .string()
          .min(1)
          .describe(
            "Exact icon identifier: lucide kebab-case name (e.g. 'wrench') or simple-icons slug/title (e.g. 'github', 'GitHub').",
          ),
        size: z.number().int().positive().optional().describe("Width/height in px (square). Default: the set's own size."),
        color: z
          .string()
          .optional()
          .describe(
            "CSS color (hex, 'currentColor', …). lucide defaults to currentColor already; simple-icons defaults to its official brand hex when set.",
          ),
      },
      outputSchema: getIconOutputSchema,
    },
    async ({ set, name, size, color }) => {
      try {
        const fetched = set === "lucide" ? await getLucideIcon(name) : await getSimpleIcon(name);
        if (!fetched) {
          throw new ToolError(
            `Icon "${name}" not found in ${set}.`,
            "Run search_icons first to find the exact name/set.",
          );
        }
        const effectiveColor = color ?? (set === "simple-icons" ? `#${fetched.hex}` : undefined);
        const svg = styleSvg(fetched.svg, { size, color: effectiveColor });
        const structuredContent = { ...fetched, svg };
        return {
          content: [
            { type: "text" as const, text: `${fetched.set}: ${fetched.title}\n\n${svg}` },
          ],
          structuredContent,
        };
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
