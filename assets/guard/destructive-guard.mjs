#!/usr/bin/env node
// Destructive Command Guard — глобальная защита (PreToolUse, matcher: Bash).
// Философия (по best practices Anthropic):
//   - Блокируем только явно-деструктивное с НИЗКИМ риском ложных срабатываний.
//   - fail-open: не смогли распарсить / нет команды → пропускаем (не ломаем работу).
//   - Каждый deny несёт понятную причину + безопасную альтернативу для агента.
// Возвращаем decision через stdout (JSON), exit 0. Пусто на stdout = allow.
// Node вместо bash: работает и на Windows, и без jq.

/** Префикс "начало команды или после разделителя" — ловит и `foo; rm`, и `a && rm`. */
const SEP = "(^|[;&|({`]|&&|\\|\\|)\\s*";

/** Правила проверяются сверху вниз, первое совпадение блокирует команду. */
const RULES = [
  {
    // Разделители + xargs/-exec, кроме git rm.
    when: [`${SEP}rm(\\s|$)|(xargs|-exec)\\s+rm(\\s|$)`],
    unless: "git\\s+rm",
    reason:
      "rm заблокирован глобальным правилом Андрея: удаляй через trash <путь> — файлы уходят в Корзину и восстановимы. Для реально временных файлов (/tmp, кэш сборки) переформулируй задачу явно.",
  },
  {
    // Удаление через find обходит rm-хук и стирает файлы безвозвратно.
    when: ["find(\\s|$)", "\\s-delete(\\s|$)"],
    reason:
      "find -delete заблокирован: удаляет файлы мимо Корзины. Собери список (find ... -print) и удали нужное через trash <путь>.",
  },
  {
    when: [`${SEP}truncate(\\s|$)`],
    reason:
      "truncate заблокирован: обнуляет файл до нуля байт безвозвратно. Перезапиши через редактор/Write или сохрани копию в Корзину (trash) перед заменой.",
  },
  {
    when: [`${SEP}shred(\\s|$)`],
    reason:
      "shred заблокирован: безвозвратное уничтожение данных. Используй trash <путь> — восстановимо из Корзины.",
  },
  {
    // git reset --hard — теряет незакоммиченные изменения.
    when: ["git\\s+reset(\\s|$)", "\\s--hard(\\s|=|$)"],
    reason:
      "git reset --hard заблокирован: стирает незакоммиченные изменения. Сделай checkpoint-коммит или git stash; если сброс точно нужен — выполни вручную сам.",
  },
  {
    // git clean -f — сносит неотслеживаемые файлы безвозвратно.
    when: ["git\\s+clean(\\s|$)", "\\s-[a-zA-Z]*f"],
    reason:
      "git clean -f заблокирован: удаляет неотслеживаемые файлы мимо Корзины. Сначала git clean -n (dry-run), затем удали нужное через trash.",
  },
  {
    // git push --force, но --force-with-lease разрешён как безопасный.
    when: ["git\\s+push", "(--force(\\s|$)|\\s-f(\\s|$))"],
    unless: "force-with-lease",
    reason:
      "git push --force заблокирован: перезаписывает удалённую историю и может снести чужие/свои коммиты. Используй --force-with-lease и только осознанно вручную.",
  },
];

/** `m` повторяет построчную семантику grep: разделители ловятся и в многострочной команде. */
const match = (command, pattern) => new RegExp(pattern, "m").test(command);

/** Причина блокировки для команды, или null если блокировать нечего. */
export function denyReason(command) {
  for (const rule of RULES) {
    if (!rule.when.every((p) => match(command, p))) continue;
    if (rule.unless && match(command, rule.unless)) continue;
    return rule.reason;
  }
  return null;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = await readStdin();
  const command = JSON.parse(raw)?.tool_input?.command;
  if (typeof command !== "string" || command === "") return;

  const reason = denyReason(command);
  if (!reason) return; // тишина на stdout = allow

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

// fail-open на любой неожиданности: битый stdin, чужая схема, что угодно.
main().catch(() => {});
