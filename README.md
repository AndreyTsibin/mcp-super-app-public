# mcp-super-app

MCP-сервер для Claude Code: собирает рутинные setup-действия (каркас проекта, скиллы,
среда сборки лендинга, guard-хук, картинки, иконки) в одну точку входа. Подключил
сервер → все инструменты доступны из любого чата обычными tool-вызовами.

Стек: TypeScript + `@modelcontextprotocol/sdk`, транспорт **stdio** (локальный сервер,
никуда ничего не отправляет, кроме OpenRouter при генерации картинок).

---

## Установка — одной фразой

Открой **Claude Code** и отправь ему это сообщение:

```
Установи MCP-сервер по инструкции: https://github.com/AndreyTsibin/mcp-super-app-public/blob/main/INSTALL.md
```

Дальше агент всё сделает сам: проверит окружение, склонирует репозиторий, соберёт
и подключит сервер. Разбираться в коде не нужно.

Полная пошаговая инструкция (в том числе что делать, если что-то пошло не так) —
в [INSTALL.md](INSTALL.md).

---

## Требования

- **Node.js ≥ 20**.
- **Ключ OpenRouter** — только для `generate_image`. Остальные инструменты работают без ключа.
  Ключ у каждого свой: <https://openrouter.ai/keys>.
- Для `install_guard` нужен `jq` (`brew install jq`) — иначе guard-скрипт fail-open'ит
  (пропускает всё).

## Инструменты

| Инструмент | Что делает |
|---|---|
| `bootstrap_project` | Разворачивает каркас нового проекта одним вызовом: `.gitignore`, `.editorconfig`, `.claude/` (settings, хук, `CLAUDE.md`, `HANDOFF`), `docs/` по профилю **S/M/L** и Auto-memory. Идемпотентно — существующее не затирает. |
| `install_skill` | Ставит скилл в проект: bundled → копия в `.claude/skills/<id>/`; proxied → прогон официального CLI. Артефакты авто-добавляются в `.gitignore`. |
| `scaffold_landing` | Разворачивает Astro-проект генератора сайтов: библиотека из 21 секции с вариантами, токен-контракт + тема, страницы `/kit` (полигон) и `/themes` (выбор темы), стандарты `docs/` (флоу, нишевые профили, каталог секций, картинки, критика-рубрика), шаблоны заявок `send.php` + `lead-form.js`, previewer и машинный валидатор `.claude/check-landing.mjs` (контракт заявок, SEO, контраст, битые ссылки, картинки). Модель «один проект = один сайт», лендинг или многостраничник. |
| `install_guard` | Ставит PreToolUse-хук защиты от деструктивных команд (`rm`, `find -delete`, `git reset --hard` и т.п.) — глобально (`target=user`) или в проект. Безопасный merge в `settings.json`. |
| `generate_image` | Генерит изображение через OpenRouter, возвращает **картинку в чат** + сохраняет файл в проект (`./generated` по умолчанию) + отдаёт `usage.cost`. Дефолт-модель — Seedream 4.5 (`bytedance-seed/seedream-4.5`, $0.04 за кадр при любом размере); Nano Banana 2/Pro и GPT Image 2 — через `model`. `reference_images` (пути/URL) — image-to-image / консистентность серии. **Промпт обязателен через скилл `image`:** нет скилла в проекте или пустой `prompt_source` — тул отказывает и не тратит деньги. |
| `optimize_images` | Готовит картинки к продакшену (sharp): ресайз до `max_width` (без апскейла), конверт в webp/jpeg/avif, EXIF-поворот, опциональные srcset-варианты (`widths`). По умолчанию заменяет исходник оптимизированным файлом. Возвращает итоговые размеры (для `width`/`height` в `<img>`). |
| `search_icons` | Ищет иконку по английскому слову/концепту в двух наборах: **lucide** (~2000 generic UI-иконок — wrench, shield, clock…) и **simple-icons** (~3400 лого брендов — GitHub, HP, Telegram…). Возвращает точные `name`/`set` для `get_icon`. |
| `get_icon` | Отдаёт сырой SVG иконки по точному `name`/`set`. `size` — px (квадрат), `color` — CSS-цвет (lucide и так `currentColor`; simple-icons по умолчанию — официальный фирменный hex бренда). |

## Ключ OpenRouter

Нужен, только если будешь генерировать картинки.

```bash
cp .env.example .env
# впиши свой ключ: OPENROUTER_API_KEY=sk-or-v1-...
```

`.env` игнорируется git (см. `.gitignore`). Ключ берётся из `.env` в корне пакета —
сервер грузит его сам при старте, передавать через конфиг не нужно.

## Подключение к Claude Code вручную

Если по какой-то причине не сработал автоматический путь из [INSTALL.md](INSTALL.md).

**1. CLI** (глобально, для всех проектов — `-s user`):

```bash
claude mcp add mcp-super-app -s user -- /абсолютный/путь/к/mcp-super-app/launch.sh
```

**2. Файл `.mcp.json`** (в корне проекта — для этого проекта, или в `~/.claude.json` — глобально):

```json
{
  "mcpServers": {
    "mcp-super-app": {
      "command": "/абсолютный/путь/к/mcp-super-app/launch.sh"
    }
  }
}
```

Подключение через `launch.sh` (а не напрямую `node dist/index.js`) даёт
автообновление: скрипт делает `git pull` и пересборку при каждом старте,
а без сети или при ошибке сборки — тихо падает обратно на уже собранный `dist/`.
Нужен запуск без апдейта — вызывай `node dist/index.js` напрямую.

После подключения перезапусти Claude Code.

## Разработка

```bash
npm install
npm run build      # компиляция TS → dist/
npm run dev        # tsx watch — запуск из src/ без сборки
npm run typecheck  # tsc --noEmit
npx @modelcontextprotocol/inspector node dist/index.js   # ручная проверка тулов
```

Точка запуска сервера — `dist/index.js` (stdio).

## Структура

```
src/
├── index.ts          # точка входа: регистрация tools + stdio transport, загрузка .env
├── lib/              # общая инфра: openrouter, scaffold, project-slug, errors, settings-merge, …
└── tools/            # по модулю на инструмент
assets/               # статические шаблоны: skills/, bootstrap/, landing/, guard/
docs/                 # спеки и стандарты (архитектура, API)
```

Договорённости и рабочий метод — в [`.claude/CLAUDE.md`](.claude/CLAUDE.md).
