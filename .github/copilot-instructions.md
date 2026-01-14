## Duty Roster — Copilot / AI Agent Instructions

Summary
- This repo is a Next.js 14 TypeScript app that implements a military-style duty roster (SQLite + Prisma). The important logic lives in `src/lib/algorithm.ts` (scheduling heuristics) and the database schema is in `prisma/schema.prisma`.

Quick tasks an AI will be asked to do
- Fix or extend the scheduling algorithm: edit `src/lib/algorithm.ts` and update tests/examples.
- Work with DB models: changes must align with `prisma/schema.prisma` and `prisma/seed.ts`.
- Add/mod API endpoints under `src/app/api/*/route.ts` following the existing patterns.

Architecture & why it matters (concise)
- Frontend: Next.js App Router (`src/app`) with RTL Hebrew UI; global layout is `src/app/layout.tsx`.
- API: Serverless route handlers under `src/app/api/*/route.ts`. They talk directly to Prisma client (`src/lib/prisma.ts`).
- DB: Prisma + SQLite (`prisma/dev.db`). Settings are stored as key/value JSON in `Settings` model.
- Scheduling algorithm: stateful but deterministic — preserves locked assignments and only writes unlocked slots. Weights are stored in settings under key `algorithmWeights` and used by `src/app/api/assignments/generate/route.ts`.

Developer workflows & commands
- Install and run locally:
  - `npm install`
  - `npx prisma generate`
  - `npx prisma db push`
  - `npm run db:seed` (this uses `tsx prisma/seed.ts`)
  - `npm run dev` (defaults to port 3000; pass `-- -p 3001` to change port)
- Prisma Studio: `npm run db:studio` to inspect data.
- Tests: `npm run test` (Vitest is installed; there may be no tests initially).

Project-specific conventions & patterns
- Date fields are stored as strings in YYYY-MM-DD format (see `DutySlot.date` and `BlockedDate.date`). Treat these strings consistently — use `date-fns` helpers in `src/lib/utils.ts`.
- Weekend slots: a weekend slot is represented by the Thursday date and `type: "weekend"`. Use `getWeekendDates` in `src/lib/utils.ts` when expanding weekend logic.
- Assignments locking: assignments have `isLocked` flags. The generator respects locked assignments and `regenerate` behavior will delete only unlocked assignments (see `src/app/api/assignments/generate/route.ts`).
- Settings storage: `prisma.settings` stores JSON in `value`. Read/write must JSON.parse/stringify. Example key: `adminPassword` and `algorithmWeights`.
- Prisma client singleton: `src/lib/prisma.ts` attaches the client to `globalThis` in non-production environments. Don’t create multiple PrismaClients in dev.

Key integration points
- `src/lib/prisma.ts` — single source of DB client.
- `src/lib/algorithm.ts` — core scheduling logic. Modifications here require understanding `calculateStats`, `assignRole`, and `generateFullSchedule`.
- API endpoints:
  - `POST /api/assignments/generate` — generates assignments; accepts `{ slotIds?, regenerate? }`.
  - `GET/POST /api/people` — manage persons and blocked dates.
  - `POST /api/auth` — checks admin password; default password `admin123` if none is set in settings.

Examples (use these to build or test changes)
- Generate schedule (JS fetch example):
```
await fetch('/api/assignments/generate', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ regenerate: true })
});
```
- Create a person:
```
await fetch('/api/people', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ name: 'John Doe', isSoldier: true })
});
```

Files to inspect first for most tasks
- `prisma/schema.prisma` — DB shape and constraints
- `prisma/seed.ts` — sample data & developer assumptions
- `src/lib/algorithm.ts` — scheduling rules and weights
- `src/lib/prisma.ts` — prisma client pattern
- `src/app/api/assignments/generate/route.ts` — how generation is invoked & saved
- `src/app/layout.tsx` — RTL/locale configuration

Notes & constraints discovered (do not assume otherwise)
- Dates are strings; do not switch to Date objects without updating DB reads/writes and `utils`.
- Weekend semantics: marking a slot as `weekend` uses the Thursday date; changing this representation requires updates across `utils`, `algorithm`, and UI components.
- Settings keys are JSON strings; mistakes here break runtime parsing.

If you modify DB schema
- Run these locally before pushing changes:
  - `npx prisma generate`
  - `npx prisma db push`
  - `npm run db:seed` (if you need seeded data)

Asking for feedback
- If anything about the high-level architecture or conventions above is unclear or missing, tell me which area to expand (API, DB, algorithm, or dev workflow) and I'll update this file.
