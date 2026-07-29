import type { BootstrapContext } from "./context.js";
import { topLevelDocsDirs } from "./docs.js";

/** Minimal Auto-memory frontmatter. Claude Code enriches it on first touch. */
function frontmatter(
  name: string,
  description: string,
  type: "user" | "feedback" | "project" | "reference",
): string {
  return `---
name: ${name}
description: ${description}
metadata:
  type: ${type}
---`;
}

/** `product-vision` (type: project) — always seeded. */
export function renderProductVision(ctx: BootstrapContext): string {
  const links =
    ctx.profile === "S"
      ? "[[work-protocol]]"
      : "[[work-protocol]], [[docs-protocol]]";

  return `${frontmatter("product-vision", `Что строим и зачем — ${ctx.name}`, "project")}

# ${ctx.name} — product vision

**Что это.** ${ctx.vision}

**Стек.** ${ctx.stack}. Профиль проекта — ${ctx.profile}.

Секреты — в \`.env\`, не в коде (никогда в git). См. ${links}.
`;
}

/** `docs-protocol` (type: project) — seeded for M/L only. */
export function renderDocsProtocol(ctx: BootstrapContext): string {
  const list = topLevelDocsDirs(ctx.profile)
    .map((d) => `- \`docs/${d}/\``)
    .join("\n");

  return `${frontmatter("docs-protocol", `Профиль ${ctx.profile} и структура docs/ — какие папки развёрнуты`, "project")}

# docs-protocol

Развёрнут **профиль ${ctx.profile}**. Структура \`docs/\`:

${list}

**Правило.** \`.claude/CLAUDE.md\` — инструкции агенту (поведенческий контракт, грузится
каждую сессию, до 200 строк, на английском). Детальная дока живёт в \`docs/\` и читается по
надобности, ссылки — по пути в тексте, не через \`@import\`. См. [[work-protocol]].
`;
}

/** `MEMORY.md` index (loaded into every session). */
export function renderMemoryIndex(ctx: BootstrapContext): string {
  const lines = [
    `# Memory index — ${ctx.name}`,
    ``,
    `- [work-protocol](work-protocol.md) — как работаем: сессии, git, автономия, старт/завершение (читать всегда)`,
    `- [product-vision](product-vision.md) — что строим: ${ctx.name}`,
  ];
  if (ctx.profile !== "S") {
    lines.push(
      `- [docs-protocol](docs-protocol.md) — профиль ${ctx.profile}, структура docs/, правило CLAUDE.md vs docs/`,
    );
  }
  return lines.join("\n") + "\n";
}
