# PROJECT-STATE.md — Resume File

**When to load:** At activation (READ first, before anything). Also the rules for WRITING it after each stage.

**Why it exists:** Sessions have limited context. Long documents (ARCHITECTURE, TASKS) get summarized or pushed out. Conversation history is NOT reliable state. This file is the single source of truth for "where are we and why". It lets the skill resume cleanly in a fresh session or after compaction.

---

## At Activation (Recovery)

1. Check for `PROJECT-STATE.md` in the working directory.
2. If it exists → READ it. It tells you: mode, environment, current stage, decisions, doc versions, next action. Resume from `current_stage` — do NOT restart from Stage 0.
3. Also verify which doc files actually exist (PRD.md, ARCHITECTURE.md, ...) — reconcile with the state file. If a doc the state claims is done is missing, flag it.
4. **Partial doc check:** if a doc is marked partial (e.g. TASKS-sprint3 unfinished), FINISH it before advancing the stage:
   - **a.** Re-read the partial file from disk (don't trust memory).
   - **b.** Find the last COMPLETE unit (e.g. last fully-written task) — do NOT regenerate it.
   - **c.** Continue from the NEXT unit. The partial marker in **Next Action** names the exact resume point (e.g. "sprint3: tasks 1-6 done, resume at task 7").
   - **d.** When the doc is complete, flip its status to ✅ and fix the TASKS.md index, THEN advance.
5. If no PROJECT-STATE.md exists → this is a fresh project. Create it after mode selection.

**Greet with recovered context**, e.g.:
```
С возвращением! Вижу проект "PetWalk", режим Expert. Готовы: PRD, ARCHITECTURE (v1.1).
Мы на Этапе 4 (Планирование). Продолжаем с плана разработки?
```

---

## Template

```markdown
# PROJECT-STATE — [Project Name]

> Resume file for the Full-Stack Architect skill. Auto-maintained. Read this first.

- **Mode:** wizard | expert
- **Environment:** claude-code | desktop-project | desktop-web
- **Current stage:** STAGE_4 (Tasks)
- **Last updated:** YYYY-MM-DD

## Documents
| Doc | Status | Version | File |
|-----|--------|---------|------|
| PRD | ✅ approved | v1.1 | PRD.md |
| ARCHITECTURE | ✅ approved | v1.0 | ARCHITECTURE.md |
| PLANNING | ✅ approved | v1.0 | PLANNING.md |
| TASKS | 🔶 partial (sprint 3/5, tasks 1-6 done) | — | TASKS.md + sprint1-3 |

> Status legend: ✅ approved · 🔄 in progress · 🔶 partial · ⬜ pending. For a partial doc, record the EXACT resume unit (sprint + last finished task) here AND in **Next Action**, and set that sprint to 🔶 in the TASKS.md index — so a new session resumes at the right task, not the start of the sprint.

## Complexity Estimate (Stage 0.5)
- Band: Complex (11/16)
- Timeline: ~12-22 wk solo
- Infra: ~\$80-300/mo
- Forecast: ~2 sessions (TASKS per sprint)
- Flags: deadline tight vs scope

## Key Decisions
- **Stack:** Next.js 16 + React 19, Supabase Postgres, Drizzle ORM, Better Auth, Stripe, Vercel
- **Monetization:** subscription \$29/mo
- **Scale target:** 1-10k users/day
- **Auth:** OAuth (Google) + email
- [decision] → [rationale]

## Open Questions
- [ ] Confirm payment provider region support
- [ ] Real-time chat in MVP or post-MVP?

## Changelog
- YYYY-MM-DD: PRD v1.0 created
- YYYY-MM-DD: Added in-app chat → propagated to ARCHITECTURE (v1.1 pending)

## Next Action
Finish TASKS-sprint3 — tasks 1-6 done, resume at task 7. Then generate sprints 4-5.

### ▶️ Resume prompt (copy-paste into a new session)
> Возобнови проект PetWalk через скилл fullstack-architect. Прочитай PROJECT-STATE.md
> и TASKS-sprint3.md, продолжи Этап 5 с задачи 7 спринта 3 (задачи 1-6 готовы — НЕ
> переделывай), затем спринты 4-5.

<!-- desktop-web only: prepend → "Прикрепи файлы: PROJECT-STATE.md + TASKS-sprint3.md (+ PRD/ARCHITECTURE/PLANNING если их нет в проекте), затем:" -->
```

---

## Write Rules (keep it current)

Update PROJECT-STATE.md:
- **After mode selection** → create file, set mode + environment.
- **After each stage completes** → update current_stage, doc status/version, next action.
- **⚠️ Desktop (artifact env):** "update" means RE-ISSUE the whole PROJECT-STATE artifact every stage — same title so it's an update, not a duplicate. The model tends to create it once and never touch it again; that is the #1 cause of broken resume on desktop. After every doc, before moving on, re-emit PROJECT-STATE with the new doc marked done. On CLI a plain `Write` overwrite handles this; on desktop it's a manual re-issue you must not skip.
- **After any decision** → append to Key Decisions with rationale.
- **After any change propagation** → bump versions, append changelog entry.
- **When a question is raised/resolved** → maintain Open Questions.
- **Mid-multi-part doc (TASKS per sprint)** → refresh the **Resume prompt** block in Next Action at EVERY sprint save, not only when context runs low. It costs a few lines but survives a hard cut/compaction that hits before you can write a stop message. Make it env-aware (uncomment the desktop-web line if env=desktop-web). On a partial stop, point it at the exact resume unit.

Keep it CONCISE — it's a state snapshot, not a copy of the docs. Decisions + pointers, not full content. Target < 100 lines.

---

## Why decisions live here

When context is lost, the *reasoning* behind choices is the most expensive thing to reconstruct. The docs show WHAT; this file preserves WHY. On resume, the skill reads decisions and stays consistent instead of contradicting earlier choices.
