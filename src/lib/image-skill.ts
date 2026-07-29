import fs from "node:fs/promises";
import path from "node:path";

import { ToolError } from "./errors.js";
import { runInstall } from "./skills-install.js";

/**
 * Gate shared by the image tools: a prompt written "from the head" wastes money
 * and produces generic frames, because every model needs its own prompt syntax
 * (Seedream treats comma-separated tags as an anti-pattern, Gemini wants
 * positive framing and explicit camera control). So generation is only allowed
 * once the bundled 'image' skill is in the project AND the caller states which
 * part of the guide the prompt came from.
 */

export const PROMPT_SKILL_ID = "image";

/** Path to the installed prompt skill's manifest inside a project. */
export function skillManifest(root: string): string {
  return path.join(root, ".claude", "skills", PROMPT_SKILL_ID, "SKILL.md");
}

/** Обязательное поле-подтверждение: описание для схемы обоих тулов. */
export const PROMPT_SOURCE_DESCRIPTION =
  "ОБЯЗАТЕЛЬНО. Какой раздел скилла 'image' использован при составлении промпта — " +
  "например 'SKILL.md → Seedream' или 'references/gemini.md'. Заполняй только если " +
  "ты действительно прочитал гайд и собрал промпт по нему: промпт «из головы» здесь " +
  "не принимается — у каждой модели свой синтаксис, и без гайда кадр выходит " +
  "шаблонным, а деньги тратятся впустую.";

/** Отговорки вместо реального раздела гайда. */
const EVASIONS = /^(none|no|n\/a|na|-|нет|не читал|из головы|skip|unknown|default)$/i;

/**
 * Ensure the 'image' skill is present, installing it when missing. Unlike the
 * previous best-effort behaviour this THROWS instead of generating: a freshly
 * installed skill is not loaded in the running session, so the agent must read
 * `SKILL.md` from disk, rewrite the prompt and call again.
 */
export async function assertPromptSkill(root: string, promptSource: string): Promise<void> {
  const manifest = skillManifest(root);
  let present = true;
  try {
    await fs.access(manifest);
  } catch {
    present = false;
  }

  if (!present) {
    try {
      await runInstall(PROMPT_SKILL_ID, root, false);
    } catch (error) {
      const reason = error instanceof ToolError ? error.message : String(error);
      throw new ToolError(
        `Промпт-скилл '${PROMPT_SKILL_ID}' не установлен в проекте, и авто-установка не удалась: ${reason}`,
        `Генерация не запускалась. Поставь скилл вручную — install_skill (skill: ${PROMPT_SKILL_ID}, ` +
          "project_path: <корень проекта>), собери промпт по его гайду и вызови тул снова.",
      );
    }
    throw new ToolError(
      `Промпт-скилл '${PROMPT_SKILL_ID}' только что установлен в проект — генерация НЕ запускалась.`,
      `Скиллы подхватываются только при старте сессии, поэтому не жди перезапуска: прочитай ` +
        `${manifest} (и нужный файл из references/ под свою модель) обычным чтением файла, ` +
        "перепиши промпт по гайду и вызови тул снова, указав раздел в prompt_source.",
    );
  }

  const source = promptSource?.trim() ?? "";
  if (source.length < 3 || EVASIONS.test(source)) {
    throw new ToolError(
      "prompt_source не заполнен — генерация не запускалась.",
      `Промпт должен быть собран по скиллу '${PROMPT_SKILL_ID}': прочитай ${manifest} ` +
        "(и references/ под свою модель), перепиши промпт и укажи в prompt_source, какой раздел использован.",
    );
  }
}
