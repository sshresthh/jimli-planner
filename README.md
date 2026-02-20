# IB Life Planner

A local-first planner for IB students to track tasks, deadlines, weekly progress, and CAS entries. Built as a Next.js PWA with an in-browser SQLite database (sql.js) persisted to IndexedDB.

## Features

- Task manager with urgency labels, filters, and smart scoring
- Weekly progress tracking and per-subject workload
- CAS entry tracking with strand totals and CSV export
- Calendar month view of deadlines
- Study planner generator based on available hours
- Offline-first persistence (SQLite WASM + IndexedDB)

## Setup

1. Install bun

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install dependencies

```bash
bun install
```

3. Copy SQLite WASM asset

```bash
bun run copy-wasm
```

4. Run dev server

```bash
bun run dev
```

Open <http://localhost:3000>

## Notes

If the app shows a database initialization error, confirm that `/public/sql-wasm.wasm` exists and re-run:

```bash
bun run copy-wasm
```
