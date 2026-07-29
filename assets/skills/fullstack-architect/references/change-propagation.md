# Change Propagation: Going Back & Updating Downstream

**When to load:** Whenever the user wants to revise an ALREADY-COMPLETED stage/document (e.g. "вернёмся к PRD", "поменяй стек", "добавь фичу", "исправь архитектуру").

**Goal:** Let the user edit any earlier document without silently leaving downstream documents stale OR blindly nuking their manual edits. Analyze impact → confirm → regenerate only what's affected.

**Chosen behavior:** Impact analysis → selective regeneration with confirmation. NEVER auto-overwrite downstream docs without showing the impact first.

---

## Dependency Map (what flows downstream)

```
PRD ──► ARCHITECTURE ──► PLANNING ──► TASKS
 │           │              │
 │           │              └─► TASKS (task breakdown, estimates)
 │           └─► PLANNING (sprints, risks) ─► TASKS (file structure, prompts)
 └─► ARCHITECTURE (features, NFRs, scale, budget)
     PLANNING (scope, timeline)
     TASKS (everything, indirectly)

Stack choice ──► ARCHITECTURE (tech sections, diagrams, cost)
                           PLANNING (effort estimates)
                           TASKS (setup task, prompts, commands)
```

**Rule of thumb:** the earlier the doc you change, the more downstream is at risk.

---

## Procedure

### 1. Identify target + change
What document, what specifically changes? Get the concrete delta (e.g. "add feature: in-app chat", "switch DB Postgres→Mongo", "cut deadline to 4 weeks").

### 2. Classify the change
- **Cosmetic** — wording, typo, clarification. → No downstream impact. Just edit + bump version.
- **Structural** — adds/removes a feature, changes stack, scale, budget, deadline, data model, or a key decision. → Downstream impact; continue.

### 3. Compute impact
Walk the dependency map. For each downstream doc, list the SPECIFIC sections affected. Be precise, not "the whole doc".

Example for "add feature: in-app chat" (edited in PRD):
- ARCHITECTURE: System diagram (add WebSocket service), Database schema (messages table), Security (message access), Cost (real-time infra)
- PLANNING: new user story + tasks, sprint reshuffle, risk (real-time complexity)
- TASKS: 2-3 new tasks, dependency graph update

### 4. Present the Impact Report

```
## 🔄 Анализ влияния изменения

**Меняем:** PRD → добавляем фичу "чат внутри приложения"
**Тип:** структурное (затрагивает downstream)

**Что устареет:**
| Документ | Затронутые секции | Действие |
|----------|-------------------|----------|
| ARCHITECTURE.md | System diagram, DB schema, Security, Cost | перегенерить секции |
| PLANNING.md | +1 user story, спринты, риски | перегенерить секции |
| TASKS.md | +2-3 задачи, dependency graph | перегенерить секции |

⚠️ Если в этих секциях есть твои ручные правки — скажи, не затру.

Обновляю всё затронутое? (да / только ARCHITECTURE / давай обсудим)
```

### 5. Confirm
Wait for the user. Offer granularity (all / specific docs / discuss). Respect "оставь PLANNING как есть".

### 6. Apply
- Edit the target document first.
- Regenerate ONLY the affected sections of confirmed downstream docs (use Edit/targeted Write, not full rewrite, unless the change is pervasive).
- Preserve untouched sections and any manual edits. If a manual edit conflicts with the regeneration, ask before overwriting.

### 7. Re-validate
Re-run the validation checkpoint for each regenerated doc (condensed in Expert mode).

### 8. Record
Update PROJECT-STATE.md:
- Bump version of each changed doc (e.g. PRD v1.0 → v1.1).
- Append a changelog entry: what changed, which docs propagated, date.
- Update key decisions if a decision changed.

---

## Guardrails

- ❌ Never regenerate a downstream doc the user didn't approve.
- ❌ Never silently drop manual edits — detect and ask.
- ✅ Prefer section-level edits over full-doc rewrites (cheaper, preserves edits).
- ✅ If the change is large (e.g. stack swap), a full regen of ARCHITECTURE may be honest — say so explicitly and confirm.
- ✅ Keep the user oriented: after propagation, restate current state and what's next.
