#!/usr/bin/env bash
# Destructive Command Guard — глобальная защита Андрея (PreToolUse, matcher: Bash).
# Философия (по best practices Anthropic):
#   - Блокируем только явно-деструктивное с НИЗКИМ риском ложных срабатываний.
#   - fail-open: не смогли распарсить / нет команды → пропускаем (не ломаем работу).
#   - Каждый deny несёт понятную причину + безопасную альтернативу для агента.
# Возвращаем decision через stdout (JSON), exit 0. Пусто на stdout = allow.

set -o pipefail

# --- Извлечь команду из JSON stdin (fail-open при любой ошибке) ---
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -z "$cmd" ] && exit 0

# Префикс "начало команды или после разделителя" — ловит и `foo; rm`, и `a && rm`.
SEP='(^|[;&|({`]|&&|\|\|)[[:space:]]*'

deny() {
  # $1 — причина (человеко-читаемая, попадёт агенту).
  printf '%s' "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$1\"}}"
  exit 0
}

match() { printf '%s' "$cmd" | grep -qE "$1"; }

# --- 1. rm (сохранена исходная логика: разделители + xargs/-exec, кроме git rm) ---
if match "${SEP}rm([[:space:]]|\$)|(xargs|-exec)[[:space:]]+rm([[:space:]]|\$)" \
   && ! match 'git[[:space:]]+rm'; then
  deny "rm заблокирован глобальным правилом Андрея: удаляй через trash <путь> — файлы уходят в Корзину и восстановимы. Для реально временных файлов (/tmp, кэш сборки) переформулируй задачу явно."
fi

# --- 2. find ... -delete (обходит rm-хук, удаляет безвозвратно) ---
if match 'find([[:space:]]|$)' && match '[[:space:]]-delete([[:space:]]|$)'; then
  deny "find -delete заблокирован: удаляет файлы мимо Корзины. Собери список (find ... -print) и удали нужное через trash <путь>."
fi

# --- 3. truncate / shred (обнуление и уничтожение файлов) ---
if match "${SEP}truncate([[:space:]]|\$)"; then
  deny "truncate заблокирован: обнуляет файл до нуля байт безвозвратно. Перезапиши через редактор/Write или сохрани копию в Корзину (trash) перед заменой."
fi
if match "${SEP}shred([[:space:]]|\$)"; then
  deny "shred заблокирован: безвозвратное уничтожение данных. Используй trash <путь> — восстановимо из Корзины."
fi

# --- 4. Деструктивный git ---
# 4a. git reset --hard — теряет незакоммиченные изменения
if match 'git[[:space:]]+reset([[:space:]]|$)' && match '[[:space:]]--hard([[:space:]]|=|$)'; then
  deny "git reset --hard заблокирован: стирает незакоммиченные изменения. Сделай checkpoint-коммит или git stash; если сброс точно нужен — выполни вручную сам."
fi
# 4b. git clean -f — сносит неотслеживаемые файлы безвозвратно
if match 'git[[:space:]]+clean([[:space:]]|$)' && match '[[:space:]]-[a-zA-Z]*f'; then
  deny "git clean -f заблокирован: удаляет неотслеживаемые файлы мимо Корзины. Сначала git clean -n (dry-run), затем удали нужное через trash."
fi
# 4c. git push --force (но --force-with-lease разрешён как безопасный)
if match 'git[[:space:]]+push' \
   && match '(--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))' \
   && ! match 'force-with-lease'; then
  deny "git push --force заблокирован: перезаписывает удалённую историю и может снести чужие/свои коммиты. Используй --force-with-lease и только осознанно вручную."
fi

# Ничего не сматчили → тишина на stdout = allow.
exit 0
