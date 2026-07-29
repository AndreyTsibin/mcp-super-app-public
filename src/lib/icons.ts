/**
 * Two icon sets, one shared shape:
 *  - lucide (lucide-static)  — ~2000 generic/UI icons, stroke-based (currentColor).
 *  - simple-icons            — ~3400 brand/company logos, fill-based (official hex).
 * Both packages ship their full icon set locally (no network calls); the first
 * lookup lazily loads and caches the relevant module for the life of the process.
 */
import { createRequire } from "node:module";
import { getIconsData, slugToVariableName, titleToSlug } from "simple-icons/sdk";
import type { SimpleIcon } from "simple-icons";

const require = createRequire(import.meta.url);

export type IconSet = "lucide" | "simple-icons";

export interface IconInfo {
  set: IconSet;
  /** Exact identifier to pass to getIcon(): lucide kebab-case name, or simple-icons slug. */
  name: string;
  title: string;
}

export interface FetchedIcon extends IconInfo {
  svg: string;
  /** Official brand hex color — simple-icons only. */
  hex?: string;
}

// ---------------------------------------------------------------- lucide ---

let lucideModule: Promise<Record<string, string>> | null = null;
async function loadLucideModule(): Promise<Record<string, string>> {
  lucideModule ??= import("lucide-static").then((mod) => mod as unknown as Record<string, string>);
  return lucideModule;
}

/** name (kebab) → tags/aliases, e.g. "wrench" → ["tool","fix","settings",...] */
const lucideTags = require("lucide-static/tags.json") as Record<string, string[]>;

function pascalToKebab(pascal: string): string {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function toKebab(input: string): string {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export async function searchLucide(query: string, limit: number): Promise<IconInfo[]> {
  const mod = await loadLucideModule();
  const q = toKebab(query);
  const scored: Array<{ score: number; name: string }> = [];
  for (const pascalName of Object.keys(mod)) {
    const kebab = pascalToKebab(pascalName);
    const tags = lucideTags[kebab] ?? [];
    let score = 0;
    if (kebab === q) score = 100;
    else if (kebab.includes(q)) score = 80;
    else if (tags.some((t) => t.toLowerCase() === q)) score = 60;
    else if (tags.some((t) => t.toLowerCase().includes(q))) score = 40;
    if (score > 0) scored.push({ score, name: kebab });
  }
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => ({ set: "lucide" as const, name: s.name, title: s.name }));
}

export async function getLucideIcon(name: string): Promise<FetchedIcon | undefined> {
  const mod = await loadLucideModule();
  const kebab = toKebab(name);
  const svg = mod[kebabToPascal(kebab)];
  if (!svg) return undefined;
  return { set: "lucide", name: kebab, title: kebab, svg };
}

// --------------------------------------------------------- simple-icons ---

export async function searchSimpleIcons(query: string, limit: number): Promise<IconInfo[]> {
  const icons = await getIconsData();
  const q = query.trim().toLowerCase();
  const scored: Array<{ score: number; icon: (typeof icons)[number] }> = [];
  for (const icon of icons) {
    const title = icon.title.toLowerCase();
    const slug = icon.slug ?? titleToSlug(icon.title);
    const aka = icon.aliases?.aka?.map((a) => a.toLowerCase()) ?? [];
    let score = 0;
    if (title === q || slug === q) score = 100;
    else if (title.includes(q) || slug.includes(q)) score = 70;
    else if (aka.some((a) => a.includes(q))) score = 50;
    if (score > 0) scored.push({ score, icon });
  }
  scored.sort((a, b) => b.score - a.score || a.icon.title.localeCompare(b.icon.title));
  return scored
    .slice(0, limit)
    .map((s) => ({ set: "simple-icons" as const, name: s.icon.slug ?? titleToSlug(s.icon.title), title: s.icon.title }));
}

export async function getSimpleIcon(nameOrSlug: string): Promise<FetchedIcon | undefined> {
  const mod = (await import("simple-icons")) as unknown as Record<string, SimpleIcon>;
  const slug = titleToSlug(nameOrSlug);
  const icon = mod[slugToVariableName(slug)];
  if (!icon) return undefined;
  return { set: "simple-icons", name: icon.slug, title: icon.title, svg: icon.svg, hex: icon.hex };
}

// --------------------------------------------------- shared: size/color ---

/**
 * Apply size/color to a fetched icon's raw SVG.
 *  - lucide is stroke-based (stroke="currentColor") — color becomes an inline
 *    `style="color:…"` on the root so `currentColor` resolves to it.
 *  - simple-icons ships no fill at all (defaults to black) — color is injected
 *    as `fill="…"` directly.
 * Width/height are replaced if present, otherwise added (simple-icons has none
 * by default, sized only via viewBox).
 */
export function styleSvg(svg: string, opts: { size?: number; color?: string }): string {
  let out = svg;
  if (opts.size) {
    out = /\swidth="/.test(out)
      ? out.replace(/\swidth="[^"]*"/, ` width="${opts.size}"`).replace(/\sheight="[^"]*"/, ` height="${opts.size}"`)
      : out.replace(/<svg/, `<svg width="${opts.size}" height="${opts.size}"`);
  }
  if (opts.color) {
    out = /\sstroke=/.test(out)
      ? out.replace(/<svg([^>]*)>/, `<svg$1 style="color:${opts.color}">`)
      : out.replace(/<svg([^>]*)>/, `<svg$1 fill="${opts.color}">`);
  }
  return out;
}
