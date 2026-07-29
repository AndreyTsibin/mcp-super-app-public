import type { Profile } from "./context.js";

export interface DocFile {
  /** Path relative to the project root. */
  relPath: string;
  content: string;
}

/** README stub per docs folder (1–2 lines: what goes here). */
const README: Record<string, string> = {
  _dev: "# _dev\n\nЧерновик скоупа + мастер-трекер разработки. Субтрекеры по фазам/модулям — в `sub-trackers/`.\n",
  "_dev/sub-trackers":
    "# sub-trackers\n\nСубтрекеры по фазам/модулям. Одна фича = один атомарный кусок (бэк / тесты / интеграция), закрывается целиком.\n",
  architecture:
    "# architecture\n\nOverview, ADR, стек. Здесь же лежат методички Project Bootstrap (`PROJECT-BOOTSTRAP.md`, `INSTALL.md`) как референс.\n",
  design: "# design\n\nUI/UX: палитры, шрифты, wireframes, референсы.\n",
  api: "# api\n\nВнешние интеграции: спеки эндпоинтов, форматы запросов/ответов, аутентификация.\n",
  services:
    "# services\n\nСпецификация каждого сервиса/страницы. Одна папка = один сервис.\n",
  pricing: "# pricing\n\nТарифы, монетизация, лимиты.\n",
  database: "# database\n\nСхема БД, миграции, сиды.\n",
  infra: "# infra\n\nДеплой, сервера, окружения, CI/CD.\n",
};

/** Folders created per profile (from INSTALL.md Step 3). */
const PROFILE_DIRS: Record<Profile, string[]> = {
  S: ["_dev", "design"],
  M: ["_dev", "_dev/sub-trackers", "architecture", "design", "api"],
  L: [
    "_dev",
    "_dev/sub-trackers",
    "services",
    "pricing",
    "architecture",
    "database",
    "api",
    "infra",
    "design",
  ],
};

/** Top-level docs folders for a profile (used in CLAUDE.md / docs-protocol). */
export function topLevelDocsDirs(profile: Profile): string[] {
  return PROFILE_DIRS[profile].filter((d) => !d.includes("/"));
}

/** README files to materialize for a profile. */
export function docsPlan(profile: Profile): DocFile[] {
  return PROFILE_DIRS[profile].map((dir) => ({
    relPath: `docs/${dir}/README.md`,
    content: README[dir] ?? `# ${dir.split("/").pop()}\n`,
  }));
}
