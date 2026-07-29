# Validation Checklists

Quality checkpoints after each stage to catch issues early before they cascade to later stages.

**How to use:** After completing each STAGE, present the relevant checklist to the user and wait for confirmation before proceeding.

---

## 🔍 STAGE 0 Checkpoint: PRD Validation

**Trigger:** After generating PRD from user's idea

```
## 📄 PRD готов! Проверь перед продолжением:

### Топ-5 Критичных Проверок:
1. [ ] **Проблема ясна?** Целевая аудитория конкретна?
2. [ ] **MVP features достаточны** для запуска, но не избыточны?
3. [ ] **Бизнес-модель реалистична?** Pricing обоснован?
4. [ ] **Дедлайн достижим?** Бюджет соответствует scope?
5. [ ] **Success metrics измеримы?** Есть план сбора данных?

---

❓ **Хочешь изменить что-то в PRD?**
   [ ] Нет → перехожу к Этапу 2 (выбор стека)
   [ ] Да → скажи, что изменить

💡 **Частые проблемы:** Слишком широкий scope, нереалистичные дедлайны
```

---

## 🔍 STAGE 0.5 Checkpoint: Estimate Sanity Check

**Trigger:** After presenting the complexity/timeline/cost estimate (see `stage0-complexity-estimate.md`), before Stage 1.

```
## 📊 Оценка готова! Быстрая сверка:

### Топ-4 Критичных Проверки:
1. [ ] **Сложность** определена и обоснована драйверами?
2. [ ] **Сроки** даны диапазоном (+20-30% буфер), не одной цифрой?
3. [ ] **Бюджет/инфра** реалистичны и бьются с PRD?
4. [ ] **🔴-расхождения** (scope vs дедлайн/бюджет) подсвечены и обсуждены?

---

❓ **Расхождений нет / решили?**
   [ ] Да → перехожу к Этапу 2 (выбор стека)
   [ ] Нет → режем scope / двигаем срок / меняем бюджет

💡 Это прикидка по PRD — уточним на Этапе 4 (планирование) против детального плана.
```

---

## 🔍 STAGE 1 Checkpoint: Tech Stack Validation

**Trigger:** After user selects and confirms the tech stack

```
## 🛠️ Стек выбран! Критичные вопросы:

### Топ-5 Критичных Проверок:
1. [ ] **Команда знает** выбранный стек? Есть опыт?
2. [ ] **Стек поддерживает** все требования из PRD?
3. [ ] **Масштабируется** до ожидаемой нагрузки?
4. [ ] **Бюджет соответствует?** (hosting, licensing)
5. [ ] **Активное community** и документация?

---

❓ **Стек подходит?**
   [ ] Да → перехожу к Этапу 3 (архитектура)
   [ ] Нет → какой стек рассмотреть?

💡 **Частые ошибки:** Новый стек без опыта, overengineering
```

---

## 🔍 STAGE 2 Checkpoint: Architecture Validation

**Trigger:** After generating ARCHITECTURE.md

```
## 🏗️ Архитектура готова! Критическая проверка:

### Топ-5 Критичных Проверок:
1. [ ] **Security план есть?** Auth, encryption, rate limiting описаны?
2. [ ] **Scalability стратегия?** Справится с ожидаемой нагрузкой?
3. [ ] **Monitoring & logging?** Как узнаем о проблемах?
4. [ ] **Backup strategy?** Что при сбое базы данных?
5. [ ] **Cost estimation realistic?** Соответствует бюджету из PRD?

---

⚠️ **Red Flags (критично!):**
- ❌ "Подумаем об этом потом" (security, monitoring)
- ❌ No disaster recovery plan
- ❌ Missing backup strategy

❓ **Архитектура прошла проверку?**
   [ ] Да → перехожу к Этапу 4 (планирование)
   [ ] Нет → что исправить?

💡 **Совет:** Лучше потратить час на архитектуру, чем 10 часов на рефакторинг
```

---

## 🔍 STAGE 3 Checkpoint: Planning Validation

**Trigger:** After generating PLANNING.md

```
## 📅 План готов! Проверь реалистичность:

### Топ-5 Критичных Проверок:
1. [ ] **Timeline реалистичен?** Соответствует дедлайну из PRD?
2. [ ] **Buffer time есть?** (20% на debugging рекомендуется)
3. [ ] **Dependencies учтены?** Блокирующие задачи в начале?
4. [ ] **Team capacity валидна?** (обычно 20h/week per dev)
5. [ ] **Риски идентифицированы?** Есть mitigation strategies?

---

📊 **Timeline:** X weeks (fits in Y weeks deadline? ✅/❌)

❓ **План выглядит реалистично?**
   [ ] Да → перехожу к Этапу 5 (задачи)
   [ ] Нет → уменьшить scope или увеличить сроки?

💡 **Частые ошибки:** Забыли testing time, не учли integration complexity
```

---

## 🔍 STAGE 4 Checkpoint: Tasks Validation

**Trigger:** After generating TASKS.md

```
## ⚙️ Tasks готовы! Финальная проверка:

### Топ-5 Критичных Проверок:
1. [ ] **Tasks self-contained?** Каждая с полным контекстом?
2. [ ] **Prompts детальные** для Claude Code? Не требуют уточнений?
3. [ ] **Testing instructions** есть для каждой задачи?
4. [ ] **Dependencies ясны?** Нет circular dependencies?
5. [ ] **Setup task (Task #1)** включает ВСЕ dependencies?

---

📋 **Tasks:** X tasks, Y hours total

❓ **Можем стартовать?**
   [ ] Да → начинай с Task #1! 🚀
   [ ] Нет → что непонятно?

🚀 **Следующие шаги:**
1. Открой TASKS.md
2. Скопируй prompt из Task #1
3. Вставь в Claude Code CLI
4. Выполни и протестируй
5. Commit → Task #2

💡 **Pro tips:** Test before moving to next, commit after each task
```

---

## 🎯 How to Use These Checklists

**For Claude (the skill):**

1. **Load the checkpoint** after completing each STAGE
2. **Present the checklist** — Wizard: full block. Expert: condense to 1-2 lines (verdict + any red flag + proceed question).
3. **Wait for confirmation** - DO NOT proceed automatically
4. **If approved** → next STAGE
5. **If changes needed** → iterate

**For Users:**

- Don't skip checkpoints - they save time
- Be honest - ask if unclear
- Think long-term - easy to change now, expensive later

---

## 🚨 Critical Red Flags (Stop and Fix)

If you see these issues, **STOP** and fix before proceeding:

1. ❌ **No Security Plan** - add auth, encryption, rate limiting
2. ❌ **Unrealistic Timeline** - adjust scope or deadline
3. ❌ **Missing Monitoring** - add logging and alerting
4. ❌ **No Backup Strategy** - define disaster recovery
5. ❌ **Team Lacks Skills** - train or adjust tech stack

**These are blockers, not nice-to-haves.**
