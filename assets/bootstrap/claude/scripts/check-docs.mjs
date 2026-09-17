#!/usr/bin/env node
/**
 * Страж документации: битые ссылки, протухшие пути к коду, раздувание, отставание handoff.
 *
 *   node .claude/scripts/check-docs.mjs
 *   node .claude/scripts/check-docs.mjs --verbose   # показать, что пропущено и почему
 *
 * Зачем: markdown-ссылки ломаются заметно и потому чинятся, а пути к коду в бэктиках
 * (`src/lib/foo.ts`) не проверяет никто — после рефакторинга они молча врут, и дороже
 * всего это стоит в файле, который читают каждую сессию.
 *
 * Ноль зависимостей — нужен только node. Гоняй в том же гейте, что и тесты.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const VERBOSE = process.argv.includes("--verbose");

/**
 * Файлы и папки вне проверки путей. У КАЖДОГО исключения должна быть причина:
 * исключение без причины через полгода неотличимо от бага.
 */
const EXCLUDED = [
  { match: /(^|\/)_dev\/archive\//, why: "архив: цитировать умершие пути — его работа" },
  { match: /(^|\/)CHANGELOG\.md$/, why: "история: путь назывался так на момент релиза" },
  {
    match: /^docs\/(architecture\/(INSTALL|PROJECT-BOOTSTRAP)|context-playbook)\.md$/,
    why: "методички: говорят о механизме и о любых проектах, а не о файлах этого",
  },
  {
    match: /(^|\/)PROJECT-STATE\.md$/,
    why: "точка возврата архитектора: перечисляет документы, которые ещё только предстоит написать",
  },
];

/** Папки, куда не заходим вообще. */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".astro", "vendor"]);

/** Пути (относительно корня), которые пропускаем целиком: чужие тексты, не наша дока. */
const SKIP_PATHS = [".claude/skills", ".claude/commands", ".claude/plugins"];

/**
 * Раздувание — в СИМВОЛАХ, не в строках и не в токенах. Плотность строки гуляет в разы,
 * а эвристика токенов ошибается процентов на пятнадцать и требует знать язык текста.
 * Символы считает любая ОС без зависимостей: кириллица ≈ 2.5–3.5 символа на токен,
 * латиница и код ≈ 4. Точную цифру даёт только `/context` в интерактивном терминале —
 * страж говорит «файл вырос», а не «файл весит столько-то».
 */
const SIZE_WARN = {
  "CLAUDE.md": 12000, // ≈4k токенов
  "HANDOFF.md": 3000, // один экран, ≈1k токенов
  "tracker.md": 12000, // план, не архив
  rules: 4000, // .claude/rules/*.md — правило по маске
  default: 24000, // спека или документ, ≈8k токенов
};

const CODE_EXT = "ts|tsx|js|jsx|mjs|cjs|json|md|py|go|rb|php|css|scss|astro|vue|svelte|yml|yaml|toml|sql";

/**
 * Отставание handoff: сколько коммитов легло после последнего, который его трогал.
 * Протокол завершения сессии требует переписать handoff до коммита — отстал он, и
 * следующая сессия стартует по описанию, которого в коде уже нет. Порог 3: чекпоинты
 * внутри сессии — норма, три подряд без обновления эстафеты — пропущенный протокол.
 */
function handoffLag(relPath) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const touched = git("log", "-1", "--format=%H", "--", relPath);
    if (!touched) return 0; // handoff ещё не коммитился — сказать нечего
    return Number(git("rev-list", "--count", touched + "..HEAD")) || 0;
  } catch {
    return 0; // не git-репозиторий или git недоступен — молчим
  }
}

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    // Скрытые папки мимо — кроме `.claude`: там лежат CLAUDE.md и HANDOFF.md,
    // самые читаемые файлы проекта, и гниют они дороже всех.
    if (SKIP_DIRS.has(entry) || (entry.startsWith(".") && entry !== ".claude")) continue;
    const full = join(dir, entry);
    const rel = full.slice(ROOT.length + 1).split(sep).join("/");
    if (SKIP_PATHS.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
    if (statSync(full).isDirectory()) collect(full, out);
    else if (entry.endsWith(".md")) out.push(rel);
  }
  return out;
}

/** Вырезаем fenced-блоки: пример синтаксиса — не находка. */
function withoutFences(text) {
  let inside = false;
  return text.split("\n").map((line) => {
    if (/^\s*```/.test(line)) {
      inside = !inside;
      return "";
    }
    return inside ? "" : line;
  });
}

function resolvesAnywhere(file, path) {
  return [ROOT, join(ROOT, dirname(file)), join(ROOT, "src"), join(ROOT, "node_modules")].some((base) =>
    existsSync(join(base, path)),
  );
}

const brokenLinks = [];
const stalePaths = [];
const bloated = [];
const skipped = [];

for (const file of collect(ROOT).sort()) {
  const raw = readFileSync(join(ROOT, file), "utf8");
  const posix = file.split(sep).join("/");
  const excluded = EXCLUDED.find((e) => e.match.test(posix));

  const name = posix.split("/").pop();
  const limit = posix.includes(".claude/rules/")
    ? SIZE_WARN.rules
    : (SIZE_WARN[name] ?? SIZE_WARN.default);
  if (raw.length > limit) bloated.push({ at: posix, chars: raw.length, limit });

  withoutFences(raw).forEach((rawLine, i) => {
    const at = `${posix}:${i + 1}`;

    // Ссылки: инлайн-код снимаем — `[текст](путь)` в таблице это пример синтаксиса.
    const line = rawLine.replace(/`[^`]*`/g, "");
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g)) {
      const target = m[1].split("#")[0].trim();
      if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
      if (existsSync(join(ROOT, dirname(file), target))) continue;
      if (excluded) skipped.push({ at, path: target, why: excluded.why });
      else brokenLinks.push({ at, path: target });
    }

    if (excluded) return;
    for (const m of rawLine.matchAll(new RegExp("`([\\w./()@-]+\\.(?:" + CODE_EXT + "))`", "g"))) {
      const path = m[1];
      if (!path.includes("/") || path.startsWith("@") || path.startsWith("/")) continue;
      if (!resolvesAnywhere(file, path)) stalePaths.push({ at, path });
    }
  });
}

const report = (title, items, fmt) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length}):`);
  for (const f of items) console.log(`  ${fmt(f)}`);
};

report("БИТЫЕ ССЫЛКИ", brokenLinks, (f) => `${f.at}  →  ${f.path}`);
report("ПРОТУХШИЕ ПУТИ К КОДУ", stalePaths, (f) => `${f.at}  →  ${f.path}`);
report("РАЗДУВАНИЕ", bloated, (f) => `${f.at}  ${f.chars} символов, бюджет ${f.limit}`);

const lag = handoffLag(".claude/HANDOFF.md");
if (lag >= 3) {
  console.log(`\nHANDOFF ОТСТАЁТ: ${lag} коммитов после последнего обновления .claude/HANDOFF.md.`);
}

if (VERBOSE && skipped.length) {
  console.log(`\nпропущено ${skipped.length}:`);
  for (const s of skipped) console.log(`  ${s.at}  →  ${s.path}  [${s.why}]`);
}

const errors = brokenLinks.length + stalePaths.length;
const warnings = bloated.length + (lag >= 3 ? 1 : 0);
console.log(
  errors || warnings
    ? `\n${errors} ошибок, ${warnings} предупреждений.`
    : "\nчисто.",
);
process.exit(errors ? 1 : 0);
