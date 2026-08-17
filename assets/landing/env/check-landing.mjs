#!/usr/bin/env node
/**
 * Machine validator for a generated Astro site. Run from the project root
 * AFTER a build (it inspects the built output, not the sources):
 *   npm run build && node .claude/check-landing.mjs
 * Exit code: 0 = clean (warnings allowed), 1 = errors found.
 *
 * Checks the hard requirements from docs/: lead-capture contract
 * (ЗАЯВКИ-инструкция), per-page SEO meta, WCAG contrast of the theme tokens,
 * placeholder leftovers, internal links, and images (tech/image-standard).
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

/** @type {Record<string, {level: "error"|"warn", msg: string}[]>} */
const sections = {};
function report(section, level, msg) {
  (sections[section] ??= []).push({ level, msg });
}

async function readIfExists(abs) {
  try {
    return await fs.readFile(abs, "utf8");
  } catch {
    return null;
  }
}

/** All files under `dir` matching `test`, as paths relative to `base` (dist by default). */
async function walk(dir, test, acc = [], base = DIST) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) await walk(abs, test, acc, base);
    else if (e.isFile() && test(e.name)) acc.push(path.relative(base, abs));
  }
  return acc;
}

/** dist/index.html → "/", dist/uslugi/remont/index.html → "/uslugi/remont" */
function routeOf(rel) {
  const url = "/" + rel.replace(/index\.html$/, "").replace(/\\/g, "/");
  return url.length > 1 ? url.replace(/\/$/, "") : "/";
}

// ---------------------------------------------------------------- lead capture

async function checkLeadCapture(pages) {
  const S = "📨 Заявки";

  const sendPhp = await readIfExists(path.join(DIST, "send.php"));
  if (!sendPhp) {
    report(S, "error", "dist/send.php не найден — заявки не работают. Файл должен лежать в public/send.php.");
  } else {
    // Адрес вебхука знает только заказчик, поэтому проверяем форму, а не значение:
    // подставлен ли он вообще и похож ли на https-URL.
    const webhook = sendPhp.match(/const\s+WEBHOOK_URL\s*=\s*'([^']*)'/)?.[1] ?? "";
    if (webhook.includes("URL_ВЕБХУКА_ОТ_ЧЕЛОВЕКА")) {
      report(S, "warn", "send.php: вебхук не подставлен — заявки не дойдут, впиши полный URL от заказчика.");
    } else if (!/^https:\/\/\S+$/.test(webhook)) {
      report(S, "error", "send.php: WEBHOOK_URL не похож на https-адрес — вставь URL заказчика целиком, как есть, ничего не достраивая.");
    }
    for (const token of ["'website'", "'consent'", "'Phone'", "'form_id'", "'kolokol_token'"]) {
      if (!sendPhp.includes(token)) {
        report(S, "error", `send.php: не найдено поле ${token} — контракт заявок нарушен.`);
      }
    }
  }

  if ((await readIfExists(path.join(DIST, "assets", "lead-form.js"))) === null) {
    report(S, "error", "dist/assets/lead-form.js не найден — форма не заработает.");
  }

  let formsSeen = 0;
  for (const [file, html] of pages) {
    const forms = html.match(/<form\b[^>]*\bdata-form\b[^>]*>[\s\S]*?<\/form>/gi) ?? [];
    formsSeen += forms.length;
    const idsHere = [];
    for (const form of forms) {
      const id = form.match(/data-form=["']([^"']*)["']/)?.[1] ?? "(без id)";
      idsHere.push(id);
      const where = `${file}, форма "${id}"`;
      if (!/name=["']website["']/.test(form)) {
        report(S, "error", `${where}: нет honeypot-поля name="website".`);
      }
      if (!/name=["']Phone["']/.test(form)) {
        report(S, "error", `${where}: нет поля name="Phone" (заглавная P — критично).`);
      }
      if (!/name=["']consent["']/.test(form)) {
        report(S, "error", `${where}: нет чекбокса name="consent".`);
      }
      if (!/data-form-status/.test(form)) {
        report(S, "error", `${where}: нет элемента статуса data-form-status.`);
      }
    }
    // form_id должен различать формы В ПРЕДЕЛАХ страницы; одинаковый id на разных
    // страницах — норма, заявки различаются по page_url.
    for (const id of new Set(idsHere.filter((x, i) => idsHere.indexOf(x) !== i))) {
      report(S, "warn", `${file}: data-form="${id}" у нескольких форм — form_id в CRM не различить.`);
    }

    // Case drift anywhere in the page breaks the field contract silently.
    for (const bad of html.matchAll(/name=["'](phone|name|message|Consent|Website)["']/g)) {
      report(S, "error", `${file}: поле name="${bad[1]}" — неверный регистр (контракт: Phone/Name/Message, consent/website lowercase).`);
    }

    if (html.includes("ССЫЛКА_НА_ПОЛИТИКУ")) {
      report(S, "error", `${file}: ссылка на политику не подставлена (ССЫЛКА_НА_ПОЛИТИКУ).`);
    }

    if (forms.length > 0 && !/lead-form\.js\?v=/.test(html)) {
      report(S, "error", `${file}: lead-form.js не подключён с ?v= (обязателен для сброса кеша).`);
    }
  }

  if (formsSeen === 0) {
    report(S, "error", "Ни одной формы с data-form не найдено — сайт без заявок.");
  }
}

// ------------------------------------------------------------------------ SEO

function checkSeo(pages) {
  const S = "🔍 SEO";

  for (const [file, html] of pages) {
    const at = `${file}:`;
    // Полигон и выбор темы — среда сборки, клиенту они не нужны.
    if (/^(kit|themes)\//.test(file)) {
      report(S, "warn", `${file}: служебная страница генератора в сборке — удали src/pages/${file.split("/")[0]}.astro перед сдачей.`);
      continue;
    }
    // Прочие noindex-страницы (политика и т.п.) — осознанное решение автора,
    // SEO-требования к ним не предъявляем.
    if (/content=["']noindex/i.test(html)) continue;
    if (!/<html[^>]*\blang=["']ru["']/i.test(html)) {
      report(S, "error", `${at} <html lang="ru"> отсутствует.`);
    }
    if (!/<title>\s*[^<\s][\s\S]*?<\/title>/i.test(html)) {
      report(S, "error", `${at} <title> пустой или отсутствует.`);
    }
    if (!/<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)) {
      report(S, "error", `${at} meta description пустой или отсутствует.`);
    }
    if (!/<meta[^>]*name=["']viewport["']/i.test(html)) {
      report(S, "error", `${at} meta viewport отсутствует — мобильная вёрстка сломается.`);
    }

    const h1 = (html.match(/<h1\b/gi) ?? []).length;
    if (h1 === 0) report(S, "error", `${at} нет <h1>.`);
    else if (h1 > 1) report(S, "error", `${at} <h1> × ${h1} — на странице должен быть ровно один.`);

    // Домен canonical проверяется один раз в «Сборке» — здесь только его наличие.
    if (!/<link[^>]*rel=["']canonical["']/i.test(html)) {
      report(S, "error", `${at} нет canonical — поисковик склеит страницы как дубли.`);
    }

    for (const og of ["og:title", "og:description", "og:image"]) {
      if (!html.includes(`property="${og}"`) && !html.includes(`property='${og}'`)) {
        report(S, "warn", `${at} Open Graph: нет ${og}.`);
      }
    }
    if (!/<link[^>]*rel=["'](?:shortcut )?icon["']/i.test(html)) {
      report(S, "warn", `${at} favicon не подключён.`);
    }
  }

}

// ------------------------------------------------------------------- contrast

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function checkContrast(css) {
  const S = "🎨 Контраст (WCAG AA)";
  if (!css) return report(S, "error", "CSS сборки не найден (dist/_astro/*.css) — прогнал ли ты npm run build?");

  /** @type {Record<string, string>} */
  const colors = {};
  // Последнее объявление выигрывает: theme.css подключается после tokens.css.
  for (const m of css.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)\b/g)) {
    colors[m[1]] = m[2];
  }
  if (Object.keys(colors).length === 0) {
    return report(S, "warn", "Токены --color-* с hex не найдены — контраст проверь вручную.");
  }

  const pairs = [
    ["text", "bg", 4.5, "error"],
    ["text", "bg-section", 4.5, "error"],
    ["on-accent", "accent", 4.5, "error"],
    ["on-primary", "primary", 4.5, "error"],
    ["text-light", "bg", 4.5, "warn"],
    ["text-light", "bg-section", 4.5, "warn"],
  ];
  for (const [fg, bg, min, level] of pairs) {
    if (!colors[fg] || !colors[bg]) continue;
    const ratio = contrast(colors[fg], colors[bg]);
    if (ratio < min) {
      report(S, level, `--color-${fg} на --color-${bg}: ${ratio.toFixed(2)}:1 < ${min}:1 (${colors[fg]} на ${colors[bg]}).`);
    }
  }
}

// ----------------------------------------------------------------- leftovers

function checkLeftovers(files) {
  const S = "🧹 Остатки";
  const patterns = [
    // Маркер сетки шаблона: `[[H1 · 4–7 слов]]`. Доехал до сборки — секцию
    // поставили, а текст под неё не написали.
    [/\[\[[^\]]{2,120}\]\]/g, "error", "незаполненный маркер шаблона [[…]]"],
    [/placeholder-(?:hero|split)\.svg/g, "error", "картинка-заглушка шаблона"],
    [/PLACEHOLDER/g, "error", "PLACEHOLDER"],
    [/\blorem\b/gi, "error", "lorem ipsum"],
    [/\bTODO\b/g, "error", "TODO"],
    [/\bFIXME\b/g, "error", "FIXME"],
    [/\bX{3,}\b/g, "warn", "XXX-заглушка (телефон/цифры?)"],
  ];
  for (const [file, text] of files) {
    // /kit и /themes — среда сборки: маркеры и заглушки там по проекту.
    // Что они вообще ещё в сборке — ловит SEO-секция.
    if (/^(kit|themes)\//.test(file)) continue;
    for (const [re, level, label] of patterns) {
      const count = (text.match(re) ?? []).length;
      if (count > 0) report(S, level, `${file}: ${label} × ${count}.`);
    }
  }
}

// --------------------------------------------------------------------- links

function checkLinks(pages, routes, assets) {
  const S = "🔗 Ссылки";
  for (const [file, html] of pages) {
    for (const m of html.matchAll(/href=["'](\/[^"'#?]*)/g)) {
      const href = m[1].replace(/\/$/, "") || "/";
      if (routes.has(href)) continue;
      // Не маршрут — значит должен быть файлом из public/ (send.php, favicon…).
      if (assets.has(href.slice(1))) continue;
      report(S, "error", `${file}: ссылка ${m[1]} никуда не ведёт — такой страницы в сборке нет.`);
    }
  }
}

// -------------------------------------------------------------------- images

async function checkImages(pages, assets) {
  const S = "🖼 Картинки";

  let heroSeen = false;
  for (const [file, html] of pages) {
    for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
      const src = img.match(/src=["']([^"']*)["']/)?.[1] ?? "";
      const isHero = /fetchpriority=["']high["']/.test(img);
      if (isHero) {
        heroSeen = true;
        if (/loading=["']lazy["']/.test(img)) {
          report(S, "error", `${file}: hero-img (${src}) с loading="lazy" — hero должен грузиться сразу.`);
        }
      } else if (!/loading=["']lazy["']/.test(img)) {
        report(S, "warn", `${file}: <img ${src}> без loading="lazy" (не hero — лениво по стандарту).`);
      }
      // alt="" осознанно пуст у декоративных фонов — они помечены aria-hidden.
      if (!/alt=["'][^"']+["']/.test(img) && !/aria-hidden/.test(img)) {
        report(S, "warn", `${file}: <img ${src}> без осмысленного alt.`);
      }
      if (src.startsWith("/") && !assets.has(src.slice(1).split("?")[0])) {
        report(S, "error", `${file}: картинка ${src} не найдена в сборке — битый путь.`);
      }
      // Растр из public/ Astro не трогает: одна картинка на все экраны. Нарезка
      // включается только для импортов из src/assets/ — там и место контенту.
      if (/^\/assets\/img\/.+\.(jpe?g|png|webp|avif)$/i.test(src) && !/srcset=/.test(img)) {
        report(S, "warn", `${file}: ${src} лежит в public/ и грузится одним файлом на все ширины — перенеси в src/assets/img/ и подключи импортом (см. image-standard).`);
      }
      if (src.startsWith("./") || (src && !src.startsWith("/") && !/^https?:/.test(src))) {
        report(S, "error", `${file}: относительный путь картинки (${src}) — на внутренних страницах он уедет в 404, пиши от корня: /assets/img/…`);
      }
    }
  }
  if (!heroSeen) {
    report(S, "warn", 'Нет <img fetchpriority="high"> — ок, только если hero сделан CSS-фоном.');
  }

  // Вес проверяем у ИСХОДНИКОВ, а не у того, что доехало до dist: нарезки в
  // dist/_astro/ делает Astro, они заведомо лёгкие. Тяжёлый файл автор кладёт
  // в src/assets/img/ (оттуда режется) или в public/assets/img/ (оттуда — как есть).
  const SRC_IMG = path.join(ROOT, "src/assets/img");
  const sources = [
    ...(await walk(SRC_IMG, () => true, [], SRC_IMG)).map((rel) => ["src/assets/img", rel]),
    ...[...assets].filter((rel) => /^assets\/img\//.test(rel)).map((rel) => [DIST, rel]),
  ];
  for (const [base, rel] of sources) {
    if (/\.(md|svg)$/i.test(rel)) continue; // README папки и SVG — резать нечего
    const abs = base === DIST ? path.join(DIST, rel) : path.join(SRC_IMG, rel);
    const kb = Math.round((await fs.stat(abs)).size / 1024);
    const name = base === DIST ? rel : `src/assets/img/${rel}`;
    if (kb > 1024) {
      report(S, "error", `${name}: ${kb} КБ — слишком тяжёлая, прогони optimize_images.`);
    } else if (kb > 400) {
      report(S, "warn", `${name}: ${kb} КБ — тяжеловата, стоит прогнать optimize_images.`);
    }
    if (/\.(png|tiff?)$/i.test(rel)) {
      report(S, "warn", `${name}: не-webp формат — конвертируй через optimize_images.`);
    }
  }
}

// --------------------------------------------------------------------- build

async function checkBuild(pages) {
  const S = "🧩 Сборка";

  const config = await readIfExists(path.join(ROOT, "astro.config.mjs"));
  if (config && /site:\s*['"]https:\/\/example\.com/.test(config)) {
    report(S, "error", "astro.config.mjs: site остался example.com — подставь домен клиента.");
  }

  const home = pages.find(([f]) => f === "index.html")?.[1];
  if (!home) report(S, "error", "dist/index.html не найден — главной страницы нет.");
  else if (!/get\(\s*["']h["']\s*\)/.test(home)) {
    report(S, "warn", "Подмена <h1> через ?h= не найдена — контекстная реклама не сможет подменять заголовок.");
  }

  // Полигон и страница тем ловятся по сборке (SEO); здесь — сетка контента,
  // которая живёт вместе с ними и уезжает из проекта тем же движением.
  if ((await readIfExists(path.join(ROOT, "src/data/placeholder.ts"))) !== null) {
    report(S, "warn", "src/data/placeholder.ts ещё в проекте — удали вместе с /kit и /themes перед сдачей.");
  }
}

// ----------------------------------------------------------------------- main

if ((await readIfExists(path.join(DIST, "index.html"))) === null) {
  console.log("❌ dist/ пуст или его нет. Сначала собери сайт: npm run build");
  process.exit(1);
}

const htmlRels = await walk(DIST, (n) => n.endsWith(".html"));
const pages = [];
for (const rel of htmlRels) pages.push([rel, await readIfExists(path.join(DIST, rel))]);

const cssRels = await walk(DIST, (n) => n.endsWith(".css"));
let css = "";
for (const rel of cssRels) css += (await readIfExists(path.join(DIST, rel))) ?? "";

const assets = new Set(await walk(DIST, () => true));
const routes = new Set(htmlRels.map(routeOf));

await checkLeadCapture(pages);
checkSeo(pages);
checkContrast(css);
checkLeftovers(pages);
checkLinks(pages, routes, assets);
await checkImages(pages, assets);
await checkBuild(pages);

// ---- print

let errors = 0;
let warns = 0;
console.log(`Проверка сборки — ${DIST}\n`);
for (const s of ["📨 Заявки", "🔍 SEO", "🎨 Контраст (WCAG AA)", "🧹 Остатки", "🔗 Ссылки", "🖼 Картинки", "🧩 Сборка"]) {
  console.log(s);
  for (const { level, msg } of sections[s] ?? []) {
    console.log(`  ${level === "error" ? "❌" : "⚠️ "} ${msg}`);
    level === "error" ? errors++ : warns++;
  }
  if (!sections[s]?.length) console.log("  ✅ ок");
}
console.log(`\nИтог: ${errors} ошибок, ${warns} предупреждений.`);
if (errors > 0) {
  console.log("Ошибки чини обязательно; предупреждения — осознанное решение.");
  process.exit(1);
}
