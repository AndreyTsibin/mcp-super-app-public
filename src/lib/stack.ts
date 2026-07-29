/**
 * Best-effort stack detection from free-text. Drives stack-specific additions
 * to `.gitignore` and `.claude/settings.json` permissions. Adds only what the
 * named stack actually needs — never everything at once.
 */
export interface StackProfile {
  /** Extra `.gitignore` lines beyond the universal core. */
  gitignore: string[];
  /** Extra permission `allow` entries beyond the base set. */
  permissions: string[];
}

export function detectStack(stack: string): StackProfile {
  const s = stack.toLowerCase();
  const gitignore = new Set<string>();
  const permissions = new Set<string>();

  const isNode =
    /\b(node|npm|pnpm|yarn|react|next|vite|vue|svelte|astro|remix|nuxt|angular|typescript|javascript|ts|js)\b/.test(
      s,
    );
  const isPython = /\b(python|django|flask|fastapi|py)\b/.test(s);
  const isDocker = /\b(docker|compose)\b/.test(s);

  if (isNode) {
    for (const line of [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "*.tsbuildinfo",
      "npm-debug.log*",
    ]) {
      gitignore.add(line);
    }
    for (const perm of [
      "Bash(npm install:*)",
      "Bash(npm ci:*)",
      "Bash(node:*)",
    ]) {
      permissions.add(perm);
    }
    if (/\bnext\b/.test(s)) gitignore.add(".next/");
  }

  if (isPython) {
    for (const line of [
      "__pycache__/",
      ".venv/",
      "*.pyc",
      ".pytest_cache/",
      "*.egg-info/",
    ]) {
      gitignore.add(line);
    }
    for (const perm of ["Bash(python3:*)", "Bash(pytest:*)", "Bash(pip:*)"]) {
      permissions.add(perm);
    }
  }

  if (isDocker) {
    permissions.add("Bash(docker compose:*)");
    permissions.add("Bash(docker ps:*)");
  }

  return {
    gitignore: [...gitignore],
    permissions: [...permissions],
  };
}
