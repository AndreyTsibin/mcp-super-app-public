#!/usr/bin/env node
/**
 * Записать отпечаток исходников рядом со сборкой: `dist/.build-stamp`.
 *
 * Нужен самопроверке (`src/lib/self-check.ts`). Раньше «сборка устарела» решалось
 * сравнением mtime, а время правки — не то же самое, что правка: любой `git checkout`
 * переписывает файлы и делает их «новее» `dist/`, хотя содержимое то же. После каждого
 * релиза (скрипт переключает ветки) сервер начинал ложно кричать о протухшей сборке,
 * а баннер, который врёт, перестают читать.
 *
 * Запускается автоматически из `npm run build` — руками звать не нужно.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(PKG_ROOT, "src");
const STAMP = path.join(PKG_ROOT, "dist", ".build-stamp");

/** Все файлы под `dir`, путями относительно него, в стабильном порядке. */
async function walk(dir, base = dir, acc = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, base, acc);
    else if (entry.isFile()) acc.push(path.relative(base, full));
  }
  return acc.sort();
}

/**
 * sha1 от пар «путь + содержимое». Путь в хеше обязателен: без него переименование
 * файла не изменило бы отпечаток.
 */
export async function stampOf(srcDir) {
  const hash = crypto.createHash("sha1");
  for (const rel of await walk(srcDir)) {
    hash.update(rel);
    hash.update(await fs.readFile(path.join(srcDir, rel)));
  }
  return hash.digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await fs.writeFile(STAMP, `${await stampOf(SRC)}\n`, "utf8");
}
