# Stage 0.5: Complexity, Timeline & Cost Estimate

**When to load:** Right after PRD.md is approved, BEFORE Stage 1 (stack selection).

**Goal:** Set realistic expectations early. Turn the PRD into a rough but honest read on complexity, time, and money — so the user knows what they're signing up for before tech decisions are made.

**Output:** A short estimate block (NOT a saved file — it gets folded into PROJECT-STATE.md decisions and re-checked at Stage 3 against the detailed plan).

---

## Complexity Scoring

Rate each driver from the PRD. Sum the weights.

| Driver | Low (0) | Medium (1) | High (2) |
|--------|---------|------------|----------|
| Core entities / data models | 1-3 | 4-7 | 8+ |
| MVP feature count | ≤4 | 5-8 | 9+ |
| Auth complexity | Email/password | OAuth + roles | SSO / multi-tenant / orgs |
| Third-party integrations | 0-1 | 2-3 | 4+ |
| Payments | None | One-off / simple | Subscriptions + webhooks + invoicing |
| Real-time needs | None | Notifications | Live collab / chat / presence |
| Expected scale | <1k/day | 1k-10k/day | 10k+/day |
| Compliance / security | Standard | PII handling | Fintech / medical / GDPR-heavy |

**Total → band:**
- **0-4 → Simple** (classic CRUD SaaS / landing+CMS)
- **5-9 → Medium** (typical marketplace / B2B SaaS with payments)
- **10-13 → Complex** (real-time, multi-tenant, multiple integrations)
- **14+ → Very Complex** (consider phasing; MVP scope likely too big)

---

## Timeline & Cost Ranges (MVP)

Base effort by band (solo-dev-equivalent hours), then adjust for team capacity from the PRD.

| Band | Effort (h) | Solo @20h/wk | Small team @40h/wk | Dev cost* | Infra/mo (MVP) |
|------|-----------|--------------|--------------------|-----------|----------------|
| Simple | 60-120 | 3-6 wk | 2-3 wk | \$0-5k | \$0-30 |
| Medium | 120-250 | 6-12 wk | 3-6 wk | \$5k-20k | \$20-80 |
| Complex | 250-450 | 12-22 wk | 6-11 wk | \$20k-60k | \$80-300 |
| Very Complex | 450+ | 22+ wk | 11+ wk | \$60k+ | \$300+ |

*Dev cost = if hiring; \$0 if solo/Claude Code. Infra assumes modern serverless stack (Vercel + managed Postgres).

Add **+20-30% buffer** for integration, testing, and the unknown. State ranges, never single numbers.

---

## Session & Context Forecast

Docs grow with complexity — **TASKS.md is the biggest** (detailed Claude Code prompts per task). Set this expectation NOW so the user picks the right environment and doesn't hit a context wall mid-TASKS.

| Band | Doc set (approx) | Sessions | Strategy |
|------|------------------|----------|----------|
| Simple | ~600-1000 lines | 1 | One pass; save after each doc. |
| Medium | ~1200-1800 lines | 1 (tight) | One pass; save each doc; TASKS may split per sprint. |
| Complex | ~2500-3500 lines (TASKS 1000+) | ~2 | Session 1: PRD+ARCH+PLAN. Session 2: TASKS per sprint. Prefer Claude Code / Desktop Project. |
| Very Complex | 3500+ lines | 3+ | Section-by-section, save constantly, resume via PROJECT-STATE. Plain web chat WILL lose work → recommend Claude Code. |

Tie to the STEP B environment: **Complex+ in a plain web chat → flag the risk and recommend Claude Code or a Desktop Project before starting.** See `context-management.md` (Environment Profiles).

---

## Risk Drivers to Flag

Call out anything that pushes risk up:
- 🔴 Scope vs deadline mismatch (e.g. Complex band + "2 недели")
- 🔴 Budget below dev-cost range
- 🔴 Team lacks skills for the implied stack
- 🟡 Heavy compliance with no buffer
- 🟡 Multiple unproven third-party integrations on the critical path

---

## Presentation

**Wizard mode** — explain the verdict and what drives it:
```
## 📊 Оценка проекта (предварительная)

**Сложность:** Medium (6/16) — драйверы: подписки+вебхуки, 6 фич, OAuth.

**Сроки MVP:** ~8-12 недель соло @20ч/нед (с буфером 20%).
**Бюджет:** разработка \$5-20k если нанимать (или \$0 на Claude Code) + инфра ~\$20-50/мес.
**Объём документации:** ~1.2-1.8k строк, уложимся в 1 сессию. (Для Complex+ — 2+ сессии, лучше Claude Code или Project.)

**На что обратить внимание:**
🔴 Дедлайн «1 месяц» из PRD не бьётся со сложностью — либо режем scope, либо двигаем срок.

Это прикидка по PRD. Уточним на Этапе 4 (планирование), когда распишем спринты. Двигаемся к выбору стека?
```

> ⚠️ The numbers above are a **Medium** example — they are FORMAT, not values. Always pull the row matching THIS project's band from the tables above. A Complex project must say "~2.5-3.5k строк, 2+ сессии, лучше Claude Code / Project", NOT "уложимся в 1 сессию".

**Expert mode** — just the table, no hand-holding:
```
Complexity: Medium (6/16). Est: ~8-12wk solo / ~4-6wk small team (+20% buffer). Infra ~\$20-50/mo.
Docs: ~1.5k lines, 1 session. (Complex+ → multi-session, prefer Claude Code.)
⚠️ PRD deadline (1mo) < estimate — descope or extend. → Stack selection?
```

---

## After Presenting

- Record band + ranges + flags in PROJECT-STATE.md under decisions.
- If a 🔴 mismatch exists, nudge the user to resolve it now (descope / extend / rebudget) — cheaper here than after TASKS.
- Proceed to Stage 1 on confirmation.
- At Stage 3, compare this estimate to the detailed sprint plan and note drift.
