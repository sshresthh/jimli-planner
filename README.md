# IB Life Planner

A local-first planner for IB students to track tasks, deadlines, weekly progress, and CAS entries. Built as a Next.js PWA with an in-browser SQLite database (sql.js) persisted to IndexedDB.

**Features**

- Task manager with urgency labels, filters, and smart scoring
- Weekly progress tracking and per-subject workload
- CAS entry tracking with strand totals and CSV export
- Calendar month view of deadlines
- Study planner generator based on available hours
- Offline-first persistence (SQLite WASM + IndexedDB)

## Setup

1. Install dependencies

```
bun install
```

1. Copy SQLite WASM asset

```
bun run copy-wasm
```

1. Run dev server

```
bun run dev
```

Open <http://localhost:3000>

## Data Model (SQLite)

Tables:

- `subjects(id, name, color, difficulty, createdAt, updatedAt)`
- `tasks(id, title, subjectId, type, deadlineDateTime, estimatedHours, priority, status, notes, createdAt, updatedAt, completedAt)`
- `cas_entries(id, strand, dateStart, dateEnd, hours, reflectionText, evidenceUri, createdAt, updatedAt)`
- `settings(key, value)` for planner settings and schema version

Indexes:

- `tasks(deadlineDateTime)`
- `tasks(status)`
- `tasks(subjectId)`
- `cas_entries(dateStart)`

## Smart Priority Algorithm

Inputs:

- Time until deadline in hours
- User priority (1-5)
- Estimated hours
- Subject difficulty (1-5, default 3)

Steps:

1. Clamp hours until deadline `t` to [0, 336]
2. `urgency = 1 - (t / 336)`
3. `priorityNorm = (priority - 1) / 4`
4. `effortNorm = clamp(estimatedHours / 10, 0, 1)`
5. `difficultyNorm = (difficulty - 1) / 4`
6. `score = 0.45*urgency + 0.30*priorityNorm + 0.15*effortNorm + 0.10*difficultyNorm`
7. If overdue, add +0.2 capped at 1.0
8. If status is Done, score = -1 and excluded

## Urgency Labels

- Overdue: deadline < now and status != Done
- Due today: same local calendar day and status != Done
- Due in 1-2 days: within next 48 hours and status != Done
- Due this week: within next 7 days and status != Done
- Normal: everything else

## Notes

If the app shows a database initialization error, confirm that `/public/sql-wasm.wasm` exists and re-run:

```
bun run copy-wasm
```
