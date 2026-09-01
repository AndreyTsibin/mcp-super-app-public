# Tasks: two layouts

**Scaffolded project (mcp-super-app skeleton — see STEP B2): use the tracker section below
and stop there.** The rest of this file is the classic TASKS.md format, for projects without
a skeleton.

---

## Scaffolded project → fill `docs/_dev/tracker.md`

The project already has a task list that every session reads and that `CLAUDE.md` points at.
A separate TASKS.md would compete with it — and the tracker always wins, because all the
signposts lead there. So Stage 5 fills the tracker instead of writing a new document.

**Format — one line per task, grouped by sprint:**

```markdown
## В работе

### Спринт 1 — Фундамент
- ⬜ **1.1** Каркас приложения и подключение БД — детали: `docs/_dev/PLANNING.md` §Sprint 1.
  Готово: `npm run dev` поднимается, миграция применяется на чистой базе.
- ⬜ **1.2** Аутентификация — детали: `docs/architecture/ARCHITECTURE.md` §Auth.
  Готово: регистрация, вход и выход работают, сессия переживает перезагрузку.

### Спринт 2 — ...
```

**Rules for these lines:**

1. **Terse on purpose.** The tracker is read every session and has a ~4k token budget. The
   details are already written in PLANNING and ARCHITECTURE — the line points at them
   instead of repeating them.
2. **Every line carries three things:** what to do, where the detail lives, and how we know
   it's done. Nothing else.
3. **Order = execution order.** Dependencies are expressed by position; call one out in the
   line only when it is not the obvious neighbour ("после 2.3").
4. **No prompts to copy, no branch-per-task ritual, no test commands.** The agent works
   inside this project and opens those docs directly — a prompt copied to itself is a step
   that nobody performs.
5. **Sprints beyond the first can stay coarse.** Detail the current sprint; later ones get
   one line each until their turn comes. Planning depth decays with distance — a detailed
   plan for what will change anyway is wasted work.

Then update `PROJECT-STATE.md` and stop: STATE = COMPLETE.

---

# Tasks for Claude Code CLI (classic layout)

> **Large projects (Complex+ or >600 lines):** do NOT put all tasks in one file. Generate sprint by sprint — `TASKS-sprint1.md`, `TASKS-sprint2.md`, … — with `TASKS.md` as the index/overview. Save + update PROJECT-STATE after each sprint; if context runs low, mark the partial (sprint + last finished task) and stop honestly. See `context-management.md` (Rule 3 split, Rule 4 section-by-section). The structure below applies inside each per-sprint file.

## Task Execution Rules

**IMPORTANT:** Read these rules before starting any task:

1. ✅ **Sequential Execution:** Complete tasks in numerical order (Task #1 → Task #2 → ...)
2. ✅ **Verify Dependencies:** Check that prerequisite tasks are completed before starting
3. ✅ **Git Workflow:** Create a separate branch for each task (`git checkout -b feature/task-1-setup`)
4. ✅ **English Code Comments:** All code comments must be in English (industry standard)
5. ✅ **Testing Required:** Test each task before marking as complete

---

## Task Structure Template

Each task should follow this structure:

```markdown
## TASK #X: [Task Name]

**Priority:** P0 (Blocking) / P1 / P2
**Estimated Time:** [X hours]
**Dependencies:** [Task numbers or "None"]
**Status:** Pending / In Progress / Completed

### Context
[2-3 sentences explaining what this task achieves and why it's needed]

### Acceptance Criteria
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]

### File Structure
```
[Expected directory structure after completion]
```

### Prompt for Claude Code

```
[Concise prompt with:
- What to build (not how - let Claude Code decide implementation)
- Key requirements and constraints
- Expected deliverables
- Testing instructions
]
```

### Testing Instructions

```bash
# Command 1: [What it tests]
[command]

# Command 2: [What it tests]
[command]

# Expected output: [What success looks like]
```
```

---

> ⚠️ **The two examples below show the task FORMAT for a self-hosted Node-API stack (Docker + Redis + hand-rolled JWT). They are a structural template, NOT a default to copy.** Generate the real Task #1/#2 from the CHOSEN stack:
> - **Next.js + Better Auth (serverless default):** Task #1 = scaffold the Next.js app + Drizzle schema + `drizzle-kit` migrate + env wiring (NO Docker Compose, NO Redis unless justified). Task #2 = configure Better Auth (providers, session, middleware) — NOT manual `/api/auth/register` + bcrypt + JWT endpoints.
> - **Supabase:** Task #2 = wire Supabase Auth + RLS policies, not custom token logic.
> - **Separate API needing Docker/Redis/JWT:** the examples below apply closely.
>
> Match every task's prompt, file structure, and testing commands to the stack confirmed at Stage 1 + ARCHITECTURE.md. Don't emit Docker/Redis/JWT tasks for a serverless project.

## Example Task #1: Setup Development Environment (self-hosted stack — format reference)

**Priority:** P0 (Blocking)
**Estimated Time:** 4 hours
**Dependencies:** None
**Status:** Pending

### Context

Create a Docker Compose development environment for the full-stack application. This establishes the foundation for all subsequent development by providing consistent local development setup with all required services.

### Acceptance Criteria

- [ ] `docker-compose up` successfully starts all services
- [ ] PostgreSQL accessible on port 5432
- [ ] Redis accessible on port 6379
- [ ] Backend starts with hot-reload enabled
- [ ] Frontend starts with hot-reload enabled
- [ ] README.md contains clear setup instructions

### File Structure

```
project-root/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
```

### Prompt for Claude Code

```
Create a production-ready Docker Compose development environment:

## Services Required:
1. PostgreSQL 15 (port 5432, volume for data)
2. Redis 7 (port 6379)
3. Backend (Node.js 20, hot-reload, depends on DB)
4. Frontend (React/Next.js, hot-reload)

## Requirements:
- All services on custom network "app-network"
- Health checks for all services
- .env.example with all required variables
- README.md with setup instructions (Prerequisites, Quick Start, Commands)
- .dockerignore files (exclude node_modules, .git, .env)

## Standards:
- All Docker comments in ENGLISH
- Multi-stage builds for optimization
- Named volumes for databases
```

### Testing Instructions

```bash
# 1. Start all services
docker-compose up -d

# 2. Check service status
docker-compose ps
# Expected: All services show "Up" or "Up (healthy)"

# 3. Test backend health endpoint
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# 4. Test database connection
docker-compose exec postgres psql -U admin -d appdb -c "SELECT 1;"
# Expected: Returns "1"

# 5. Test Redis
docker-compose exec redis redis-cli ping
# Expected: PONG

# 6. Clean up
docker-compose down
```

---

## Example Task #2: Implement Authentication (self-hosted stack — format reference)

**Priority:** P0 (Blocking)
**Estimated Time:** 8 hours
**Dependencies:** Task #1
**Status:** Pending

### Context

Implement secure JWT-based authentication with registration, login, and token refresh. This enables user identity management and protects application resources.

### Acceptance Criteria

- [ ] User can register with email/password
- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] Login returns access token (15min) + refresh token (7d)
- [ ] Protected routes require valid JWT
- [ ] Rate limiting: 5 login attempts per 15 minutes

### Prompt for Claude Code

```
Implement JWT-based authentication system for Node.js + TypeScript backend:

## Endpoints to Create:
- POST /api/auth/register (email, username, password)
- POST /api/auth/login (email, password)
- POST /api/auth/refresh (refreshToken)
- POST /api/auth/logout (refreshToken)
- GET /api/auth/me (protected - requires auth)

## Security Requirements:
- bcrypt password hashing (12 rounds)
- JWT access tokens: 15min expiration
- JWT refresh tokens: 7d expiration, stored in database as hash
- Rate limiting on login endpoint (5 attempts per 15min per IP)
- Input validation (Zod or similar)
- Parameterized database queries (prevent SQL injection)

## Standards:
- All code comments in ENGLISH
- Proper error handling (try-catch)
- Structured logging for auth events
- TypeScript strict mode

Refer to ARCHITECTURE.md for database schema and the libraries' official docs for best practices.
```

### Testing Instructions

```bash
# 1. Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"SecurePass123!"}'
# Expected: 200 with user data and tokens

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
# Expected: 200 with tokens

# 3. Access protected route
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <access-token>"
# Expected: 200 with user data

# 4. Run tests
npm test -- --coverage
# Expected: All tests passing, coverage > 90%
```

---

## Writing Effective Prompts for Claude Code

### DO:
✅ Provide context (what and why, not how)
✅ List requirements clearly (bullet points)
✅ Reference ARCHITECTURE.md and official library docs
✅ Specify testing approach
✅ Mention code standards (English comments, TypeScript, etc.)

### DON'T:
❌ Write full code implementation (let Claude Code decide)
❌ Over-specify implementation details
❌ Forget to mention dependencies
❌ Skip testing instructions

---

## Progress Tracking Template

**Sprint 1: Foundation**
- [ ] Task #1: Setup Development Environment
- [ ] Task #2: Implement Authentication
- [ ] Task #3: Create Database Schema

**Sprint 2: Core Features**
- [ ] Task #4: Build UI Components
- [ ] Task #5: Implement API Endpoints

**Sprint 3: Integrations**
- [ ] Task #6: Payment Gateway
- [ ] Task #7: Email Service

**Sprint 4: Launch**
- [ ] Task #8: Testing & Optimization
- [ ] Task #9: Deployment
- [ ] Task #10: Documentation

---

## How to Use This Document

### For Claude Code CLI:

1. **Copy the task prompt:**
   - Locate the task (e.g., Task #1)
   - Copy everything inside "Prompt for Claude Code" block
   - Paste into Claude Code CLI

2. **Execute and verify:**
   - Claude Code implements the task
   - Run testing instructions to verify
   - Mark task as complete

3. **Move to next task:**
   - Ensure dependencies are met
   - Copy next task prompt

### Important Notes:

- 🔴 **Do NOT skip tasks** - they have dependencies
- 🟡 **Test each task** before moving forward
- 🟢 **Commit after each task** - use feature branches
- 🔵 **All code comments in English**

---

**Status:** Ready for execution

---

**Document End**
