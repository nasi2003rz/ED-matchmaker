# Class & Course Platform (ED-Matchmaker)

Educational matchmaker platform — Phase 1 (Instructor OS / Class Management). See [CLAUDE.md](./CLAUDE.md) for full product context and execution rules.

## Structure

```
backend/    NestJS + TypeScript API (Prisma ORM, PostgreSQL)
frontend/   Next.js (App Router) + TypeScript + Tailwind, PWA (Serwist)
```

## Prerequisites

- Node.js LTS
- Docker (for local PostgreSQL)

## Local setup

1. Start the database:
   ```
   docker compose up -d
   ```
2. Backend:
   ```
   cd backend
   cp .env.example .env
   npm install
   npx prisma generate
   npm run start:dev
   ```
   Runs on http://localhost:4000/api
3. Frontend:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Runs on http://localhost:3000 — proxies `/api/*` to the backend (see `next.config.ts`), so the browser only ever talks to one origin and auth cookies stay first-party.

## Authentication

- JWT access token (15 min, returned in the response body, kept client-side in memory) + refresh token (30 days, `httpOnly` cookie scoped to `/api/auth`, rotated on every use, revoked on logout or on reuse of an already-rotated token).
- Passwords hashed with Argon2id.
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- A `User` can hold multiple roles at once (`UserRole`), each backed by a minimal 1:1 profile table (`Instructor`/`Student`/`Parent`). Cross-role fields (avatar, phone, bio) live on `Profile`.
- Role-gated routes use `JwtAuthGuard` + `RolesGuard` (`@Roles(RoleName.INSTRUCTOR)`), checked server-side from roles embedded in the JWT payload.

## Instructor onboarding

- `GET/PATCH /api/instructors/me` — experience, delivery mode (online/offline/both), city (`Location`), teaching categories (`Category`, many-to-many), free-text subjects.
- `POST /api/instructors/me/avatar` — multipart upload (jpg/png/webp, 2MB max), stored on local disk under `backend/uploads/avatars/` and served at `/uploads/avatars/...` (proxied through the frontend like `/api/*`). Local disk storage is a Phase 1 simplification — swap for object storage (S3-compatible) before scaling past a single instance.
- `GET /api/categories`, `GET /api/locations` — reference data, seeded via `npx prisma db seed` (run automatically by `prisma migrate dev`).

## Student management

- An instructor's roster (`InstructorStudent`) is independent of any Class/Enrollment (those come with Class management) — it's the instructor's own list of students they work with.
- `GET /api/students?status=ACTIVE|ARCHIVED`, `POST /api/students` (`{ email }`), `PATCH /api/students/:id` (`{ note?, status? }`) — all under `@Roles(RoleName.INSTRUCTOR)`, ownership checked server-side (an instructor only ever sees/edits their own roster rows).
- "Add" only links an **existing** Student account by email — there is no ghost/lead record without a `User`. Adding students who haven't registered yet is the invitation-link flow (Section 5.3), built in a later step.

## Class management

- `Course` (id, title, categoryId, instructorId) is created transparently behind every `Class` — instructors only ever fill out one "create class" form (CLAUDE.md Section 4's Course→Class relationship, without adding a UI step).
- Category-specific custom fields (CLAUDE.md Section 5.5) are a real, data-driven mechanism, not hardcoded columns: `CategoryFieldDefinition` (field_key/label/type/required/options) is owned by `Category`, and each `Class` stores its values in `ClassAttribute`. Adding a field to a category is a seed-data change, not a migration. Wired end-to-end for 3 categories (sports/music/academic) — see `prisma/seed.ts`.
- `POST/PATCH /api/classes` validates `attributes` against the class's category field-definitions server-side: rejects unknown keys, enforces `required`, and type-checks TEXT/NUMBER/BOOLEAN/SELECT(options)/DATE.
- `seatsLeft`/`enrolledCount` on a class are always computed from real `Enrollment` rows (CLAUDE.md Section 8.2 — never a manually-entered number).
- Enrollment only accepts students already in the instructor's active roster (Section 7's `InstructorStudent`) — `POST/DELETE /api/classes/:id/enrollments/:studentId`.

## Invitations (the primary growth loop — CLAUDE.md Section 5.3)

- Every class has a public, reusable join link at `/join/class/{classId}` (frontend route + matching `GET /api/join/class/:classId` public preview, no auth). It's a link, not a single-use ticket — many people join through the same one, so the instructor toggles it `ACTIVE`/`REVOKED` on `Class.invitationStatus` rather than each visit consuming it.
- `POST /api/join/class/:classId` (auth required, any role) does the whole "acquisition loop" from Section 2 atomically: auto-assigns the `STUDENT` role if missing, adds the joiner to the instructor's roster (`InstructorStudent`), creates the `Enrollment` (capacity-checked), and logs an `Invitation` row (the accepted-history record, satisfying Section 10 auditability).
- Frontend flow: anonymous visitor sees the class preview → clicks "ثبت‌نام و پیوستن" / "ورود و پیوستن" → `/register` or `/login` carries `?next=/join/class/{id}` → after auth, the join page auto-completes the join (no extra click) and shows a success state.
- Instructor-side: the class detail page's "دعوت" tab shows the copyable link, an active/revoked toggle, and the history of who has joined through it (`GET /api/classes/:id/invitations`).

## Schedule (CLAUDE.md Section 5.2)

- `ClassSession` (a concrete dated occurrence — `startsAt`/`endsAt`) is auto-generated from a GROUP class's recurring `days`/`startTime`/`endTime` pattern (`backend/src/classes/session-generator.ts`), capped by `numberOfSessions`/`endDate` or a default of 12. Regenerated (future `SCHEDULED` sessions only — history is preserved) whenever the instructor edits any schedule field.
- PRIVATE classes never auto-generate sessions — Section 5.2 explicitly says not to force private lessons into a fixed recurring schedule. Instead: instructor creates a `SessionProposal` for a specific enrolled student (`POST /api/classes/:id/proposals`), the student accepts/rejects it (`PATCH /api/proposals/:id/respond`), and accepting atomically creates the confirmed `ClassSession`.
- Student-facing proposal inbox at `/proposals` (list + accept/reject) — a small, focused page distinct from the full Student dashboard (a later step).
- Instructor calendar at `/schedule` (`GET /api/schedule?from&to`) with day/week/month views, all client-side date math in Gregorian but always **displayed** via `toLocaleDateString("fa-IR", …)` for the Jalali calendar — no Jalali conversion library needed.

## Attendance (CLAUDE.md Section 5.2)

- `Attendance` is one row per `(session, student)` — `PRESENT`/`ABSENT`/`LATE`/`EXCUSED`. No row yet means "not marked", kept distinct from any real status rather than defaulting to one.
- `PUT /api/classes/:id/sessions/:sessionId/attendance/:studentId` marks/updates a single student instantly (the UI saves on every click, no separate submit step) — validates the student is actively enrolled in the class.
- `GET /api/classes/:id/attendance-summary` computes the class-level and per-student attendance **rate** from real `Attendance` rows (CLAUDE.md Section 8.2 — never manually entered): `rate = PRESENT / (marked − EXCUSED)`, so an excused absence doesn't count against the student.
- Works uniformly for GROUP and PRIVATE classes since attendance is keyed off `ClassSession` (Step 10), not `Class` directly.

## Homework (CLAUDE.md Section 5.2)

- `Assignment` belongs to a `Class`; `Submission` is one row per `(assignment, student)`, created when the student submits. A student's homework status — `ASSIGNED`/`SUBMITTED`/`LATE`/`REVIEWED`/`MISSING` — is always **derived** (no row + past `dueAt` → `MISSING`, no row + not due → `ASSIGNED`, row + past due & unreviewed → `LATE`, row + unreviewed → `SUBMITTED`, `reviewedAt` set → `REVIEWED`), the same computed-not-stored approach used for Attendance.
- Grading/feedback is a simple `score` (0–100) + `feedback` text directly on `Submission` — this satisfies Section 5.2's "review submissions, give grades/feedback" for homework specifically. The richer, multi-type `Grade` entity (numeric/letter/pass-fail/text — CLAUDE.md Section 8) is a separate, more general grade book to be built in Step 13, not tied to homework.
- Instructor side: `POST/GET/PATCH /api/classes/:id/assignments`, `PUT /api/classes/:id/assignments/:assignmentId/submissions/:studentId/review` — all ownership-checked server-side.
- Student side: `GET /api/homework/me` (across all of the student's active enrollments), `PUT /api/homework/:assignmentId/submit` — resubmission is allowed to correct a mistake up until the instructor reviews it, then the submission locks.
- No file uploads in Phase 1 — submissions are free text, consistent with CLAUDE.md's "keep it short, no unnecessary fields" and the explicit no-LMS/no-video-hosting scope (Section 6).

## Grades (CLAUDE.md Section 5.2 / 8)

- `Grade` is a standalone grade book, independent of Homework — Step 12's `Submission` already carries its own simple score/feedback. Each `Grade` is one instructor-authored record against a `(class, student)`: a title (e.g. "امتحان میان‌ترم"), a `type` (`NUMERIC`/`LETTER`/`PASS_FAIL`/`TEXT`), a `value`, and an optional note — not tied to a specific `Assignment`.
- `value` is always stored as text and validated server-side against `type` on both create and update (same approach as `ClassAttribute`, Section 5.5): `NUMERIC` must parse as a number, `LETTER` must be A–F with an optional +/-, `PASS_FAIL` must be exactly `PASS`/`FAIL`, `TEXT` is free text.
- Instructor side: `POST/PATCH/DELETE /api/classes/:id/grades`, `GET /api/classes/:id/grades` (grouped by enrolled student) — ownership-checked server-side, and the target student must be actively enrolled in the class.
- Student side: `GET /api/grades/me` — every grade across all of the student's classes, newest first.

## Messaging (CLAUDE.md Section 5.2)

- `Announcement` is a one-way, class-wide broadcast (`POST/GET /api/classes/:id/announcements`, instructor-only) with no per-recipient read receipts — a deliberately thin "utility layer, not a social network." Students see their own via `GET /api/announcements/me` (aggregated across active enrollments); parents via `GET /api/announcements/me/parent` (aggregated across all children's).
- `Conversation` is one standing thread per **relationship**, not per class or per message: `(instructor, student)` or `(instructor, parent)`, enforced by two partial-unique constraints — starting a "new" conversation with someone you already have a thread with reuses it rather than creating a duplicate. Either side may start a new conversation, gated server-side on an actual roster relationship (`InstructorStudent`, or — for a parent — at least one child on that instructor's roster): `POST /api/conversations/start` (instructor) / `POST /api/conversations/me/start` (student/parent).
- `Message.readAt` unset/set derives the `SENT`/`READ` states from CLAUDE.md's sent/delivered/read list — "delivered" collapses into "sent" since Phase 1 has no push-delivery mechanism (Notifications, Step 18, is in-app only); a real `deliveredAt` is a clean field to add later.
- Access to a conversation's thread (`GET/POST /api/conversations/:id/messages`, `PATCH /api/conversations/:id/read`) is authorized per-conversation, not by role alone: the caller must actually be one of its two parties.
- The Parent role's messaging is fully implemented (including instructor→parent and parent→instructor), but Parent–child linking itself has no UI/API yet (`Student.parentId` — that's Step 17's Parent dashboard); it was verified by setting the link directly in the database.

## Basic payments (CLAUDE.md Section 5.2)

- `Payment` is one tuition invoice per `(class, student)` — an instructor can issue several separate ones over time (e.g. "شهریه‌ی مهر", "شهریه‌ی آبان") rather than a single running balance, matching Section 8.3's awareness of recurring monthly tuition.
- `remaining` and `status` (`PAID`/`PARTIALLY_PAID`/`UNPAID`/`OVERDUE`) are always **derived** from `amount`/`paidAmount`/`dueDate`, never stored — the same computed-not-manually-entered approach as Attendance/Homework (Section 8.2). Priority when several could apply: fully paid → `PAID`; not fully paid and past due → `OVERDUE` (even with a partial payment already in); some payment but not overdue → `PARTIALLY_PAID`; otherwise `UNPAID`.
- Recording a payment (`PUT /api/classes/:id/payments/:paymentId/record`) adds to `paidAmount` and is rejected if it would exceed the invoice's `amount` — explicitly "no accounting system" (Section 6), so overpayment is refused rather than tracked as a credit.
- Instructor side: `POST/PATCH/DELETE /api/classes/:id/payments`, `GET /api/classes/:id/payments` (grouped by enrolled student). Student side: `GET /api/payments/me`. Parent side: `GET /api/payments/me/parent` (aggregated across children, same pattern as Announcements/Grades). No payment gateway — this is tracking only (Section 6).

## Notes

- Frontend dev/build use `--webpack` because Serwist (PWA/service-worker generation) does not yet support Turbopack.
- Prisma is pinned to `7.10.0` (a stable release) — the `latest` npm dist-tag currently points to an `8.0.0-rc` release candidate; do not blindly `npm update` this dependency.
- `@nestjs/throttler` is not yet compatible with the installed `@nestjs/common@12`; rate-limiting on auth endpoints is deferred until it catches up (or can be handled at the reverse-proxy level).
