import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { projectSlug } from "./project-slug.js";

test("posix path becomes a dash slug", () => {
  if (path.sep !== "/") return;
  assert.equal(projectSlug("/Users/a/Dev/app"), "-Users-a-Dev-app");
});

test("dots and underscores collapse to dashes, like Claude Code does", () => {
  if (path.sep !== "/") return;
  assert.equal(projectSlug("/Users/a/my_app.v2"), "-Users-a-my-app-v2");
});

test("slug never contains path separators or a drive colon", () => {
  const slug = projectSlug(path.resolve("Kefir", "aviparser"));
  assert.ok(!/[\\/:]/.test(slug), `slug still has separators: ${slug}`);
});
