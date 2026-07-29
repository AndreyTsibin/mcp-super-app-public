# COMPLETE State: Final Handoff

**When to load:** After TASKS.md is approved and the final validation checkpoint passes. All documents exist.

**Before showing the wrap-up:** ensure the README index and PROJECT-STATE.md are written/updated (see `context-management.md`).

---

## CLI Environment

```
🎉 Полный комплект документации готов!

Файлы в текущей директории:
```
ls -lh README.md PRD.md ARCHITECTURE.md PLANNING.md TASKS*.md PROJECT-STATE.md
```

✅ PRD.md — что и зачем строим
✅ ARCHITECTURE.md — техническая архитектура + диаграммы
✅ PLANNING.md — дорожная карта (спринты)
✅ TASKS.md — готовые задачи для Claude Code
✅ PROJECT-STATE.md — точка возврата для новой сессии
✅ README.md — индекс

**Сохрани работу (контекст сессии ограничен!):**
```
git init && git add . && git commit -m "docs: full architecture set"
# или просто
mkdir -p backup && cp *.md backup/
```

**Что дальше?**
1. Отдай документацию разработчикам — всё готово к реализации.
2. Или разрабатывай с Claude Code: открывай TASKS.md, копируй промпт Task #1, выполняй последовательно.
3. Новая сессия / потерян контекст? Открой PROJECT-STATE.md — продолжим с места.
4. Нужны правки? Скажи что менять — пройдусь по downstream-докам через анализ влияния.

Что выберешь?
```

---

## Desktop Environment

```
🎉 Полный комплект документации готов! Все документы — в артефактах выше.

✅ PRD.md  ✅ ARCHITECTURE.md  ✅ PLANNING.md  ✅ TASKS.md
✅ PROJECT-STATE.md (точка возврата)  ✅ README.md (индекс)

⚠️ **Скачай все артефакты как .md** — сессия и контекст ограничены, не теряй работу.

Каждый артефакт можно: скачать, отредактировать здесь, поделиться с командой.

**Что дальше?**
1. Отдай файлы разработчикам.
2. Или используй Claude Code CLI: копируй промпты из TASKS.md.
3. Возврат в новой сессии: загрузи PROJECT-STATE.md + нужные доки, я продолжу.
4. Правки? Скажи что менять — обновлю с анализом влияния на downstream.

Что выберешь?
```

---

## Expert Mode Variant

Condense to essentials — no celebration block:
```
Готово: PRD, ARCHITECTURE, PLANNING, TASKS, README, PROJECT-STATE (все в файлах).
Бэкап: git add . && git commit -m "docs: architecture set".
Старт разработки → TASKS.md, Task #1. Резюм новой сессии → PROJECT-STATE.md.
Правки? Назови — прогоню downstream с анализом влияния.
```

---

## Post-COMPLETE Behavior

After COMPLETE, the skill stays available for:
- **Q&A** on any document/section.
- **Revisions** → load `change-propagation.md`, run impact analysis.
- **Resume** in a new session → load `project-state-template.md` recovery flow.
- **Deep-dive** → e.g. expand a single task, add ADRs, generate API spec.

Always keep PROJECT-STATE.md and README index in sync with any post-COMPLETE change.
