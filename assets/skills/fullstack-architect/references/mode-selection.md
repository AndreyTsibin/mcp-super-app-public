# Mode Selection: Wizard vs Expert

**When to load:** At activation, BEFORE Stage 0 (only if mode not already set in PROJECT-STATE.md).

**Goal:** Pick the right interaction style so technical users move fast and non-technical users get guidance. Auto-detect, then confirm once.

---

## Two Modes

| Aspect | 🧙 Wizard (default) | ⚡ Expert |
|--------|--------------------|-----------|
| Audience | Non-technical (founders, PMs) | Developers, architects, technical founders |
| Questions | 2-3 at a time, sequential | Batched — all questions for a stage at once |
| Term explanations | Always explain (API, JWT, etc.) | Never — assume fluency |
| Examples | Rich, real-world analogies | Skip unless asked |
| Emoji / tone | Warm, lots of emoji | Minimal, dense, professional |
| Glossary | Proactively offered | Only on explicit request |
| Confirmations | Every micro-step | Per-stage gate only; allow "run to TASKS" |
| Stack defaults | Recommend & explain | Accept terse stack spec (e.g. "Next 16 + Postgres + Drizzle") |
| Doc depth | Same — full quality | Same — full quality (depth never drops, only chatter drops) |

**Critical:** Expert mode cuts *interaction overhead*, NOT document quality or the state-machine gates. Files are still written, PROJECT-STATE.md is still updated, validation checkpoints still run (condensed).

---

## Auto-Detection (run once, silently)

Read the user's FIRST substantive message. Score these signals.

**Expert signals (technical fluency):**
- Names a stack/tools precisely: "Next.js + tRPC + Drizzle", "FastAPI + Postgres", "RSC", "Kubernetes"
- Uses architecture vocabulary unprompted: "multi-tenant", "event-driven", "idempotency", "p95 latency"
- Provides a spec-like brief (entities, endpoints, NFRs)
- Says they're a dev / "I'll build it myself" / mentions a team of engineers
- Asks for the docs directly, impatient with process

**Wizard signals (non-technical):**
- Describes only the business idea, no tech
- Asks "что такое API/MVP?" or "я не программист"
- One vague sentence, needs prompting
- Mentions no-code, hiring devs, "не разбираюсь в технологиях"

**Tie / unclear → default Wizard** (safer to over-explain than under-explain).

**Scaffolded project caveat.** In a project built by `bootstrap_project`, the stack sits in
`.claude/CLAUDE.md` and in memory because the agent that ran the scaffold wrote it there —
the user may have said "решай сам". A stack you read from a file is NOT an expert signal:
score only what this user typed in this conversation.

---

## The One-Time Confirmation

After detecting, confirm in ONE line (don't interrogate). Adapt wording to detected guess:

**If Expert detected:**
```
Похоже, ты в теме технически. Включаю Expert-режим: батч-вопросы, без разжёвывания терминов, плотно и быстро. Если хочешь подробный wizard с объяснениями — скажи "wizard". Поехали?
```

**If Wizard detected:**
```
Поведу тебя по шагам, с объяснениями — без технического жаргона. Если ты разработчик и хочешь быстрый режим без воды — скажи "expert". Начинаем?
```

Store the choice in PROJECT-STATE.md (`mode:` field) so it survives context loss.

---

## Switching Mid-Flow

User can switch anytime. Triggers:
- → Expert: "expert", "быстро", "без воды", "я разработчик", "не объясняй термины"
- → Wizard: "wizard", "помедленнее", "объясни", "я не технарь"

On switch: acknowledge in one line, update PROJECT-STATE.md `mode:`, continue from current state (do NOT restart the stage).

---

## Interaction with Quick Start

Mode and Quick Start are orthogonal:
- A detailed brief (any mode) → also load `quick-start.md` to extract answers and skip ahead.
- Expert + detailed brief = fastest path (batch-extract → confirm gaps → generate).
- Wizard + detailed brief = extract, but still explain what each section means as you confirm.
