# Quick Start: Detailed Brief → Skip Ahead

**When to load:** At activation OR Stage 0, when the user's first message is a rich description (a full paragraph+ that already covers multiple Stage 0 fields), OR the user pastes/uploads an existing PRD/spec.

**Goal:** Don't drag a user who already explained everything through 4 rounds of questions. Extract what's there, surface only the gaps, confirm, jump to PRD generation (or further).

---

## Trigger Detection

Activate Quick Start if the brief covers **≥3** of these fields:

1. Problem / pain point
2. Target audience
3. Current alternatives
4. Unique value / why better
5. Core features (MVP)
6. Post-MVP / nice-to-have
7. Monetization model
8. Price point
9. Competitors
10. Budget
11. Deadline
12. Team / who builds
13. Known tech stack
14. Expected scale / load

If it covers fewer than 3 → fall back to the normal Stage 0 wizard interview.

---

## Step 1: Extract

Parse the brief and map every statement to the 14 fields above. Infer reasonably, but mark inferences as assumptions (not facts).

## Step 2: Show "What I Understood" Table

Present a compact mapping so the user sees you got it. Mark each field:
- ✅ **Stated** — clearly given
- 🟡 **Inferred** — you guessed; needs confirm
- ❌ **Missing** — not covered, must ask

```
## Что я понял из твоего описания

| Поле | Статус | Значение |
|------|--------|----------|
| Проблема | ✅ | ... |
| Аудитория | ✅ | ... |
| Как решают сейчас | 🟡 (предположил) | ... |
| Преимущество | ✅ | ... |
| MVP-функции | ✅ | 1)... 2)... 3)... |
| Монетизация | ❌ | — нужно уточнить |
| Бюджет | ❌ | — нужно уточнить |
| Дедлайн | 🟡 | ... |
| Команда | ❌ | — нужно уточнить |
| Стек (если есть) | ✅ | ... |
```

## Step 3: Ask ONLY the Gaps (batched)

List only ❌ fields and 🟡 fields you can't safely assume. Ask them **all at once** (not sequentially) — the user already showed they can write in bulk.

```
Чтобы собрать PRD, не хватает 3 вещей — ответь одним сообщением:
1. Как зарабатываешь? (подписка / комиссия / freemium / другое)
2. Бюджет и дедлайн на MVP?
3. Кто разрабатывает? (ты / команда / Claude Code)
```

If the brief is a complete PRD/spec with nothing critical missing → skip straight to confirming, run the Stage 0.5 estimate, then offer to jump to **Stage 1** (stack) — don't regenerate the PRD.

## Step 4: Confirm & Jump

Once gaps are filled:
- Wizard mode: briefly restate the full picture, confirm, then generate PRD (Stage 0 Step 5).
- Expert mode: one-line confirm, generate PRD immediately.

Then continue the normal state machine from PRD onward (Stage 0.5 estimate → Stage 1...).

---

## If User Provides an Existing PRD Document

- Do NOT regenerate it from scratch. Read it, normalize to the PRD template structure if needed, save as PRD.md.
- Note any missing sections (success metrics, NFRs, risks) and offer to fill them.
- Set state to STAGE_0.5 and run the complexity estimate against the provided PRD before stack selection.

---

## Fast-Forward Requests

Expert users may say "сделай всё до TASKS" / "прогони все этапы". Honor it:
- Run Stage 0 → 0.5 → 1 → 2 → 3 → 4 back-to-back.
- Still write each file, still update PROJECT-STATE.md after each stage.
- Show condensed checkpoints; pause ONLY on a red flag or a genuine decision (e.g. ambiguous stack, budget conflict).
- Always confirm the stack (Stage 1) before architecture — it's the highest-leverage decision.
