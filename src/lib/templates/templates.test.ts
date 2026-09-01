import { test } from "node:test";
import assert from "node:assert/strict";

import type { BootstrapContext, Profile } from "./context.js";
import { docsPlan, topLevelDocsDirs } from "./docs.js";
import { renderClaudeMd } from "./claude-md.js";

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
    // Методички кладутся отдельно от docsPlan, только там, где есть architecture/.
    if (dirs.has("docs/architecture/")) {
      for (const f of ["INSTALL.md", "PROJECT-BOOTSTRAP.md", "context-playbook.md"]) {
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

test("профиль S не обещает плейбук — architecture/ у него нет", () => {
  assert.doesNotMatch(renderClaudeMd(ctx("S")), /context-playbook/);
  assert.match(renderClaudeMd(ctx("M")), /context-playbook/);
});
