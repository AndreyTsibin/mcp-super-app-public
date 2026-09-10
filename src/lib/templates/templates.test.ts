import { test } from "node:test";
import assert from "node:assert/strict";

import type { BootstrapContext, Profile } from "./context.js";
import { docsPlan, topLevelDocsDirs } from "./docs.js";
import { renderClaudeMd } from "./claude-md.js";
import { renderDocsProtocol } from "./memory.js";

const PROFILES: Profile[] = ["S", "M", "L"];

function ctx(profile: Profile): BootstrapContext {
  return {
    projectPath: "/tmp/demo",
    name: "demo",
    profile,
    stack: "TypeScript + Node",
    vision: "Тестовый проект.",
  };
}

test("каждый профиль заводит журнал решений, трекер и скоуп", () => {
  for (const profile of PROFILES) {
    const paths = docsPlan(profile, "demo").map((d) => d.relPath);
    for (const required of [
      "docs/decisions/README.md",
      "docs/_dev/tracker.md",
      "docs/_dev/scope.md",
    ]) {
      assert.ok(paths.includes(required), `${profile}: нет ${required}`);
    }
  }
});

test("трекер и журнал несут формат, а не пустую шапку", () => {
  const files = docsPlan("S", "demo");
  const tracker = files.find((f) => f.relPath === "docs/_dev/tracker.md")!.content;
  const decisions = files.find((f) => f.relPath === "docs/decisions/README.md")!.content;

  assert.match(tracker, /План, а не архив/);
  assert.match(decisions, /grep -rn/); // как искать — без этого журнал не читают
  assert.match(decisions, /### API-3/); // образец записи
});

test("карта документации в CLAUDE.md не ссылается в никуда", () => {
  for (const profile of PROFILES) {
    const created = new Set(docsPlan(profile, "demo").map((d) => d.relPath));
    const dirs = new Set(topLevelDocsDirs(profile).map((d) => `docs/${d}/`));
    // Методички кладутся отдельно от docsPlan: плейбук — всем, каркасные — где есть
    // architecture/ (см. bootstrap-project.ts).
    created.add("docs/context-playbook.md");
    if (dirs.has("docs/architecture/")) {
      for (const f of ["INSTALL.md", "PROJECT-BOOTSTRAP.md"]) {
        created.add(`docs/architecture/${f}`);
      }
    }

    const md = renderClaudeMd(ctx(profile));
    const rows = md.matchAll(/^\| `(docs\/[^`]+)`/gm);
    for (const [, target] of rows) {
      assert.ok(
        created.has(target) || dirs.has(target),
        `${profile}: CLAUDE.md ссылается на ${target}, которого bootstrap не создаёт`,
      );
    }
  }
});

test("плейбук лежит по одному пути во всех профилях", () => {
  // У S нет architecture/, поэтому путь общий — docs/context-playbook.md. Разойдётся
  // с bootstrap-project.ts — карта документации начнёт врать именно у S.
  for (const profile of PROFILES) {
    assert.match(renderClaudeMd(ctx(profile)), /`docs\/context-playbook\.md`/);
    assert.doesNotMatch(renderClaudeMd(ctx(profile)), /architecture\/context-playbook/);
  }
});

test("ни один шаблон не ссылается на старый architecture/context-playbook.md", () => {
  // Регрессия: плейбук переехал в docs/context-playbook.md (единый путь для всех
  // профилей), но docs-protocol.md и architecture/README.md продолжали звать его
  // по старому пути — предыдущий тест смотрит только CLAUDE.md и эту щель не ловит.
  for (const profile of PROFILES) {
    assert.doesNotMatch(renderDocsProtocol(ctx(profile)), /architecture\/context-playbook/);
    assert.match(renderDocsProtocol(ctx(profile)), /`docs\/context-playbook\.md`/);
  }

  for (const profile of ["M", "L"] as Profile[]) {
    const architectureReadme = docsPlan(profile, "demo").find(
      (f) => f.relPath === "docs/architecture/README.md",
    )!.content;
    assert.doesNotMatch(architectureReadme, /architecture\/context-playbook/);
    assert.doesNotMatch(
      architectureReadme,
      /Здесь же[^.]*context-playbook/,
      "architecture/README.md не должен утверждать, что context-playbook.md лежит в этой папке",
    );
  }
});

test("замер контекста называет /context, а не страж", () => {
  // BST-4: эвристика стража — сигнал «файл вырос», а не цифра. Правило «бюджеты в
  // токенах» без выполнимого способа померить возвращает нас к спору о вкусе.
  const md = renderClaudeMd(ctx("M"));
  assert.match(md, /\/context/);
  assert.match(md, /Closing a phase[\s\S]*\/context/);
});

test("трекер заводит одноразовую проверку механики", () => {
  const tracker = docsPlan("S", "demo").find((f) => f.relPath === "docs/_dev/tracker.md")!.content;
  // Правило без момента срабатывания помнится до следующей фазы (плейбук §8.7):
  // зонд и поломка стража приезжают строкой очереди, а не пожеланием в методичке.
  assert.match(tracker, /Зонд `\.claude\/rules\/`/);
  assert.match(tracker, /check-docs\.mjs/);
  assert.match(tracker, /docs\/context-playbook\.md/);
});
