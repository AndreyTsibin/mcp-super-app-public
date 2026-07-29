import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { searchLucide, searchSimpleIcons, type IconInfo } from "../lib/icons.js";

const iconInfoSchema = z.object({
  set: z.enum(["lucide", "simple-icons"]),
  name: z.string().describe("Exact identifier to pass to get_icon as `name`."),
  title: z.string(),
});

export const searchIconsOutputSchema = {
  results: z.array(iconInfoSchema).describe("Matches, best score first."),
};

function formatResults(results: IconInfo[]): string {
  if (results.length === 0) {
    return "No matches. Try a broader or different English keyword — both sets are English-only (no Russian metadata).";
  }
  return results.map((r) => `${r.set}: ${r.name}${r.title !== r.name ? ` (${r.title})` : ""}`).join("\n");
}

export function registerSearchIcons(server: McpServer): void {
  server.registerTool(
    "search_icons",
    {
      title: "Search icons",
      description:
        "Search two local icon sets by English keyword/concept: lucide (~2000 generic UI icons — wrench, shield, clock, printer…) and simple-icons (~3400 brand/company logos — GitHub, HP, Telegram…). Use this before get_icon to find the exact `name`/`set` to fetch — exact slugs aren't always guessable.",
      inputSchema: {
        query: z.string().min(1).describe("English keyword or concept, e.g. 'wrench', 'repair', 'github'."),
        set: z
          .enum(["lucide", "simple-icons", "all"])
          .default("all")
          .describe("Restrict to one icon set, or search both (default)."),
        limit: z.number().int().min(1).max(50).default(10).describe("Max results per set."),
      },
      outputSchema: searchIconsOutputSchema,
    },
    async ({ query, set, limit }) => {
      const wantLucide = set === "lucide" || set === "all";
      const wantSimple = set === "simple-icons" || set === "all";
      const [lucide, simple] = await Promise.all([
        wantLucide ? searchLucide(query, limit) : Promise.resolve([]),
        wantSimple ? searchSimpleIcons(query, limit) : Promise.resolve([]),
      ]);
      const results = [...lucide, ...simple];
      return {
        content: [{ type: "text" as const, text: formatResults(results) }],
        structuredContent: { results },
      };
    },
  );
}
