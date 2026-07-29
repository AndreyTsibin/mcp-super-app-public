# Context Management: Large Docs & Limited Sessions

**When to load:** Before generating any document, and any time the output is large. These rules keep the skill working across context limits — the documentation set can get big (a Complex project's TASKS.md alone can run hundreds of lines).

**Core problem:** The session context is finite. If documents live only in the chat, they get summarized away and the skill loses the plot. Solution: **files are the memory, not the conversation.**

---

## Environment Profiles (storage + resume)

Detected at activation (SKILL STEP B). Determines where docs live and how the user resumes in a new session:

| Profile | Where docs go | New-session resume |
|---------|---------------|--------------------|
| **Claude Code** (terminal/coding, project folder) | `Write` straight to the folder | Reopen the same folder → skill reads PROJECT-STATE.md + docs from disk. Files stay OUT of context until re-read — best for Complex/Very Complex. |
| **Desktop + Project** | artifact → user saves `.md` into the Project's knowledge | New chat in the same Project → knowledge files available. Remind: «добавь .md в knowledge проекта». |
| **Desktop / web, no Project** | artifact in chat | Worst for big projects. User must download `.md`, then attach PROJECT-STATE.md + the unfinished doc in the new session. |

**Implication:** for Complex+ projects, actively recommend Claude Code (or a Desktop Project) over a plain chat — it's the difference between resuming cleanly and losing work to context limits.

### Migrating environments (e.g. desktop-web → Claude Code)

When Stage 0.5 flags Complex+ and the user agrees to switch (the common path for a project that turns out bigger than it sounded), give an explicit hand-off checklist — don't just say "switch":

1. Download every doc produced so far (PRD.md, ARCHITECTURE.md, …) **AND** PROJECT-STATE.md.
2. Put them in one project folder.
3. Open that folder in Claude Code and re-activate the skill → STEP A recovery reads PROJECT-STATE.md and continues from the recorded stage.
4. First action in the new env: update the `environment` field in PROJECT-STATE.md to the new profile.

If a doc was partial at switch time, carry that file too — recovery finishes it per the partial-doc rules below.

---

## Rule 1: Always Write to Files — Write FIRST, Never Dump

- Every document (PRD, ARCHITECTURE, PLANNING, TASKS) is written to disk via the Write tool the moment it's GENERATED — BEFORE asking for approval, not after. Review happens against the file, not a chat paste.
- **Never paste a full document into the chat.** The user's deliverable is FILES, not a transcript. In chat show only a compact summary (title + section list + key decisions) + "сохранено в X.md, открой и проверь".
- Desktop env: write to an artifact AND remind the user to download it (the artifact IS the file — that's fine; a raw chat dump is not).
- Edits after review → use `Edit` on the file in place; don't re-paste the whole doc.
- Fallback: if Write fails or an artifact doesn't render, show the full doc in a collapsible `<details>` block for manual save — never lose it silently.

## Rule 2: Files Are the Source of Truth — Re-Read, Don't Recall

- When you need the content of an earlier doc, READ the file. Do not reconstruct from memory — memory may be stale or summarized.
- After a context compaction, reload `PROJECT-STATE.md` first, then re-read only the doc you're actively working on.
- Before propagating a change, re-read the target doc to edit against its real current content.

## Rule 3: Split Large Documents

If a document would exceed ~**600 lines**, split it and keep an index:

| Doc | Split strategy |
|-----|----------------|
| TASKS.md | Per sprint: `TASKS-sprint1.md`, `TASKS-sprint2.md`, ... + `TASKS.md` as index/overview |
| ARCHITECTURE.md | If data-heavy or >450 lines: `ARCHITECTURE.md` (overview + diagrams) + `ARCHITECTURE-db.md` (full schema) |
| PLANNING.md | Usually fits; split per-sprint only if very large |

State the split to the user and link the parts from the index. Never silently truncate a doc — splitting is explicit and indexed.

## Rule 4: Generate Big Docs Section-by-Section (proactive for Complex+)

Don't wait to hit a wall. If the Stage 0.5 forecast says Complex+ (or any doc will exceed ~600 lines), generate in parts FROM THE START:
- Write section group / sprint → save to file → update PROJECT-STATE → next. Never hold a 1000-line doc in context before the first Write.
- For TASKS: generate and save sprint by sprint (`TASKS-sprintN.md`), not all tasks in one shot.
- Keep each Write self-contained and valid markdown.
- **If context runs low mid-doc:** SAVE what exists as valid markdown up to the last COMPLETE unit (e.g. last whole task — never a half-written one). Mark the partial in PROJECT-STATE with the EXACT resume point — sprint AND last finished task (e.g. "sprint3: tasks 1-6 done, resume at task 7"). Set that sprint to 🔶 in the TASKS.md index too, so the index doesn't falsely read ✅. Refresh the **Resume prompt** block in PROJECT-STATE Next Action (env-aware, copy-pasteable — see `project-state-template.md`); write it at EVERY sprint save, not just here, so it survives a hard cut. On resume: re-read the partial file, continue from the next unit — do NOT regenerate finished tasks or restart the sprint. An honest stop beats a lost doc.

## Rule 5: README Index

Create `README.md` (or `00-INDEX.md`) in the working directory as the entry point. Keep it updated as docs are created.

```markdown
# [Project Name] — Documentation

> Generated by Full-Stack Architect skill. Mode: expert. Stack: Next.js 16 + Supabase.

## Status
| # | Document | Status | File |
|---|----------|--------|------|
| 0 | Product Requirements | ✅ v1.1 | [PRD.md](PRD.md) |
| 1 | Architecture | ✅ v1.0 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| 2 | Planning | 🔄 | [PLANNING.md](PLANNING.md) |
| 3 | Tasks | ⬜ | — |
| — | **Project state (resume here)** | — | [PROJECT-STATE.md](PROJECT-STATE.md) |

## How to use
1. Read PRD → ARCHITECTURE for context.
2. Execute TASKS sequentially with Claude Code.
3. To resume a new session: open PROJECT-STATE.md.
```

## Rule 6: Save / Backup Reminders

Prompt the user to persist work at key moments:
- After each doc (CLI): "Сохранено в X.md. Сделай бэкап: `git add . && git commit -m \"docs: X\"` или `cp *.md backup/`."
- After each doc (Desktop): "Скачай артефакт X.md — сессия не вечная, контекст ограничен."
- At COMPLETE: remind to commit/download the whole set + PROJECT-STATE.md.

## Rule 7: Honest Truncation Signaling

If you ever shorten or defer content to fit, SAY SO explicitly ("сократил список задач Sprint 3, допишу по запросу"). Silent truncation reads as "done" when it isn't.

---

## Quick Checklist (every doc)

- [ ] Written to a file (not just chat)?
- [ ] Added/updated in README index?
- [ ] PROJECT-STATE.md updated?
- [ ] >600 lines → split + indexed?
- [ ] Save/backup reminder given?
