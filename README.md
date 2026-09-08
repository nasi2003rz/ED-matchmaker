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
- Role-gated routes use `JwtAuthGuard` + `RolesGuard` (`@Roles(RoleName.INSTRUCTOR)`). The JWT payload itself carries only `{ sub: userId }` — `JwtStrategy.validate()` re-resolves the user's current roles from the database on every request, so a role change or revocation takes effect on the very next request rather than lingering until a stale access token expires (corrected here during the Step 19 audit — this line previously and inaccurately said roles were "embedded in the JWT payload").

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

## Student dashboard (CLAUDE.md Section 5.2)

- `GET /api/dashboard/student` answers "what do I have today?" in one call: `nextSession`/`todaySessions` (new — no student-facing schedule existed before this step), `pendingHomework`/`pendingHomeworkCount`, `recentGrades`, `unreadMessagesCount`.
- Built by **reusing** `AssignmentsService.listMine`, `GradesService.listMine`, and `ConversationsService.listForStudentOrParent` (each module now `exports` its service) rather than re-querying the same data — CLAUDE.md Section 12: "reuse existing infrastructure, do not duplicate it." Only the next-class/today's-classes query is genuinely new.
- "Pending" homework = `ASSIGNED` or `MISSING` (needs the student to act) — `SUBMITTED`/`LATE`/`REVIEWED` are excluded since the ball is already in the instructor's court.
- Frontend lives at `/home`, matching the pre-wired `STUDENT` nav entry (`components/layout/nav-config.ts`).
- **Known inconsistency, left for Step 20 (UX polish) rather than fixed here:** an `AppShell`/`PageHeader`/`Section`/`StatCard` component set exists (used only by the Instructor's `/dashboard`) but every other page built since — including this one — uses a simpler standalone `max-w-md` layout instead. Retrofitting the shell everywhere is a cross-cutting change out of scope for a single step; `docs/ui-ux-plan.md` should be revisited then.

## Parent dashboard (CLAUDE.md Section 5.2)

- **Parent–child linking** (a real prerequisite CLAUDE.md never specifies a mechanism for): a parent links an *existing* Student account by email — `POST /api/children { email }` sets `Student.parentId`, mirroring the Instructor roster's "add by email" from Step 7 (same Phase 1 simplification: no child-side confirmation). Rejects linking a student already claimed by a different parent (`409`) or one that isn't a student account at all (`400`). `GET/DELETE /api/children` round it out.
- `GET /api/dashboard/parent` returns **multiple children, switchable** (CLAUDE.md's exact phrase) as an array — one summary per child (next session, today's sessions, pending homework count, recent grades) — plus one parent-level `unreadMessagesCount` (Conversations are per-relationship, not per-child — Step 14, so this isn't split by child). Per-child homework/grades reuse `AssignmentsService`/`GradesService` via new `listForStudent(studentId)` methods (split out of each service's existing `listMine(userId)`, itself now just a thin resolve-then-delegate wrapper) — Section 12: reuse, don't duplicate.
- **Family calendar**: `GET /api/schedule/family` (new method on the existing `ScheduleService`, alongside the instructor's `listForInstructor`) fans every child's sessions into one combined, chronologically merged list, each entry tagged `student: {id, name}` — the entire point of a *family* calendar over a per-child one. Frontend at `/calendar` reuses the same day/week/month view components as the Instructor's `/schedule` page, with a name badge per session instead of a class-type badge.
- Frontend: `/home` now branches by role (`STUDENT` → Step 16's dashboard, `PARENT` → the child-switcher view above); `/children` manages the roster; `/calendar` is parent-only for now — a plain personal calendar for students isn't named in either Step 16 or 17's brief, so it's left unbuilt rather than added speculatively.

## Notifications (CLAUDE.md Section 5.2)

- **Event-driven, not tightly coupled to individual modules** — CLAUDE.md's exact requirement. Producing services (Join, Assignments, Grades, Messaging, Classes) emit a plain domain event via `EventEmitter2` (`@nestjs/event-emitter`, globally registered in `AppModule`) and never import `NotificationsService` or know it exists. `NotificationsListener` is the *only* subscriber, turning each event into a `Notification` row. A producer can be tested or reused with zero notification-related imports.
- Covers all 8 event types from Section 5.2: `INVITATION_ACCEPTED`, `NEW_ASSIGNMENT`, `ASSIGNMENT_REVIEWED`, `NEW_GRADE`, `NEW_MESSAGE`, `SCHEDULE_CHANGE` are emitted synchronously at the point of action; `CLASS_REMINDER` and `PAYMENT_REMINDER` are time-based rather than action-triggered, so they run on their own `@Cron` schedule (`RemindersService`, `@nestjs/schedule`) instead — every 15 min for sessions starting within the next hour, hourly for invoices due within 24h. A `reminderSentAt` timestamp on `ClassSession`/`Payment` stops a tick from re-sending the same reminder; verified by temporarily shortening both crons to 10s during testing; each reminder fired exactly once across two ticks, then reverted.
- In-app only for Phase 1 (Section 5.2: "in-app to start") — `Notification.link` is an in-app path a click routes to, nothing external.
- `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` — available to any authenticated role (a notification belongs to a `User`, not a role's feature set). Frontend at `/notifications`, with an unread-badge entry point added to the Instructor's `/dashboard` and the Student/Parent `/home`.
- **Bug found and fixed during testing:** `unread-count` originally returned a bare `Promise<number>`; NestJS serves a bare primitive as `text/html`, not `application/json`, which the frontend's JSON-only fetch wrapper silently treated as no body — the badge always showed empty even with real unread notifications. Fixed by wrapping the response as `{ count }`, consistent with every other endpoint in this codebase that already avoids returning bare primitives.

## Security audit (CLAUDE.md Section 12, Step 19)

A systematic review of everything built in Steps 1–18, not a new feature — every controller/service was re-read against CLAUDE.md Section 9 ("every multi-tenant resource must be authorization-checked server-side") and standard web-app risk categories.

**Two real issues found and fixed:**

1. **Stored-XSS-capable avatar upload.** `POST /api/instructors/me/avatar` validated the declared `file.mimetype` against an allowlist (jpg/png/webp) but then named the *saved* file using the extension from the client-supplied `file.originalname` — e.g. a request declaring `Content-Type: image/png` while naming the file `evil.svg` passed the filter, and the server saved it as `…-<timestamp>.svg`, served statically with `Content-Type: image/svg+xml` (SVG can carry an embedded `<script>`/`onload`, executed if a browser is pointed straight at that URL — a well-known real-world vulnerability class). **Fixed** by deriving the saved extension from a server-side map keyed on the *validated* mimetype (`image/png` → `.png`, etc.), never from `originalname` — confirmed by actually uploading an SVG-with-`<script>` payload declared as `image/png`: it's saved as `.png` and served back with `Content-Type: image/png` (+ the pre-existing `X-Content-Type-Options: nosniff`), so a browser never attempts to render it as anything but a (broken) image.
2. **No rate limiting on `/api/auth/login` or `/api/auth/register`.** `@nestjs/throttler` still has no release supporting `@nestjs/common@^12` (rechecked during this audit — same gap noted in the README since Step 4). Added a minimal in-memory sliding-window `AuthThrottleGuard` (10 requests / 15 min, keyed by IP + path) on both endpoints instead of leaving the gap undocumented-and-unmitigated. Known Phase-1 limitation, consistent with other single-instance simplifications already accepted (e.g. local-disk avatar storage): resets on process restart, doesn't share state across multiple instances — a real distributed limiter is a `@nestjs/throttler`-or-equivalent upgrade once it supports Nest 12. Verified live: 10 requests succeed, the 11th returns `429`, and the limit is scoped per-endpoint (hitting it on `/auth/login` doesn't affect `/auth/register` or any authenticated route).

**Reviewed and confirmed already sound (no change needed):**
- **Authorization:** every controller re-checked for `@UseGuards`/`@Roles`; every service method that takes a resource ID re-checked for an explicit ownership comparison (`ForbiddenException` on mismatch) rather than trusting the caller's claimed identity — no gaps found across Classes, Attendance, Assignments, Grades, Payments, Messaging, Children, or Proposals.
- **Password hashing:** `argon2.hash()` defaults to Argon2id in the installed `argon2` version (verified from the package source, not assumed) — matches the README's existing claim.
- **Refresh tokens:** stored only as a SHA-256 hash (never plaintext), `httpOnly` + `sameSite: lax` + path-scoped cookie, rotated every use, and reuse of an already-rotated token revokes every session for that user (compromise response, not just single-token invalidation).
- **Access tokens:** kept only in a React ref (never `localStorage`/`sessionStorage` — confirmed no such call exists anywhere in the frontend), so they don't persist across reloads or become readable via unrelated storage-inspection vectors.
- **Input validation:** the global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` plus a typed DTO on every single `@Body()` (no untyped/`any` bodies anywhere) rejects unexpected fields — mitigates mass-assignment.
- **SQL injection:** no `$queryRaw`/`$executeRaw` anywhere in application code — every query goes through Prisma's parameterized query builder.
- **XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` anywhere in the frontend.
- **Secrets:** `.env` correctly gitignored (Step 15's git setup), `.env.example` holds only placeholders, the real local `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are 96-character random values, not defaults.
- **CORS:** locked to a single configured origin with credentials, not a wildcard.
- **Error responses:** Nest's default exception filter never includes stack traces in the HTTP response (dev or prod) — only server-side console logs do.

**Documented gaps, deliberately not built now (out of a security *audit's* scope — these are missing features, not vulnerabilities in existing code):** no forgot-password/reset flow (not in Section 5.1's Phase 1 workflow); `JWT_REFRESH_SECRET` is defined in `.env.example` but unused by any code (refresh tokens are opaque random strings, not JWTs) — harmless dead config, left as-is rather than churned.

## UX polish (CLAUDE.md Section 12, Step 20)

Mechanical rollout plus two real bugs surfaced (and fixed) as a byproduct of it.

**AppShell rollout.** `docs/ui-ux-plan.md` (an earlier design pass) specified a shared `AppShell` layout — sidebar nav on desktop, bottom tab bar on mobile, a thin sticky header — but only the instructor dashboard had actually adopted it. Wrapped every remaining authenticated page in it (`classes`, `students`, `schedule`, `home`, `homework`, `grades`, `payments`, `messages` + its thread view, `proposals`, `children`, `notifications`, `calendar`, plus the new `my-classes`) so navigation and chrome are consistent everywhere a logged-in user lands. Public/pre-auth pages (`/`, `/login`, `/register`, `/join/class/[id]`, `/style-guide`) are deliberately left unwrapped — they render before a role is known. The conversation-thread page (`messages/[id]`) needed its full-viewport chat layout's height recalculated against AppShell's own header/bottom-nav chrome rather than a flat `100vh`; verified at both desktop and mobile widths with a multi-message thread to confirm the message list scrolls internally instead of pushing the composer off-screen.

**`/calendar` was broken for two of three roles.** `nav-config.ts` pointed every role's "تقویم" tab at `/calendar`, but that page only ever implemented the parent's family calendar (gated `PARENT`-only) — the instructor's real calendar lives at `/schedule`, and the student had no calendar at all (the tab 404'd against a page that immediately redirected them out). Fixed instructor's nav entry to point at `/schedule` (its correct existing page), and made `/calendar` itself role-aware: added `ScheduleService.listForStudent` + `GET /schedule/mine` (STUDENT-scoped to the caller's own active enrollments, mirroring the instructor's `/schedule` shape) on the backend, and the page now branches on role — parent keeps the existing combined family view (with the per-child badge), student sees their own sessions (no badge, since there's nothing to disambiguate) — sharing the same day/week/month view components either way.

**`/my-classes` didn't exist.** `nav-config.ts` linked students to it, but the page and its backing endpoint had never been built (a direct hit 404'd). Added `ClassesService.listForStudent` + `GET /enrollments/mine` (STUDENT-scoped to active enrollments; kept off the `classes` prefix since `ClassesController` is instructor-only and already owns a bare `GET classes/:id` — a sibling static route there would collide with that param route) and a minimal list page matching the instructor's `/classes` visual pattern.

**Session bug found during this step's own browser testing, not a UX item but fixed alongside it.** Repeated rapid page reloads while logged in intermittently logged the user straight back out. Root cause: refresh tokens rotate on every use, and reusing an already-rotated one is (correctly, per the Step 19 security audit) treated as a compromise signal that revokes every session for that user. `AuthProvider`'s mount-time `POST /auth/refresh` had no guard against firing twice concurrently with the same cookie — which React's dev-only Strict Mode double effect-invocation does on every single page load, and two overlapping reloads can too — so the loser of that race got treated as token theft and logged everyone out. Fixed by caching the in-flight refresh promise so a second concurrent call reuses it instead of firing a second request; verified by hitting `/` five times in rapid succession post-login (previously reproduced the logout within 2–3) and confirming the session now survives. The backend's rotation/revocation logic itself was correct and untouched — a genuine multi-tab race (two separate browser tabs refreshing at the exact same instant) remains a known Phase-1 limitation, since two JS contexts can't share an in-flight promise; a production fix would need a short server-side grace window on rotation.

Verified end-to-end for this step: registered a fresh instructor/student/parent, created an active class with generated sessions, joined the student via the invitation link, linked the parent to the student, then exercised `/schedule/mine` and `/enrollments/mine` directly (200 for the owning student, 403 for the parent, 401 unauthenticated) and walked the actual pages in-browser across all three roles (student's `/my-classes` and `/calendar`, parent's `/calendar` and `/children`, instructor's `/classes/[id]` and `/schedule`, a multi-message `/messages/[id]` thread at desktop and mobile widths) before cleaning up the test accounts.

## Notes

- Frontend dev/build use `--webpack` because Serwist (PWA/service-worker generation) does not yet support Turbopack.
- Prisma is pinned to `7.10.0` (a stable release) — the `latest` npm dist-tag currently points to an `8.0.0-rc` release candidate; do not blindly `npm update` this dependency.
- `@nestjs/throttler` is not yet compatible with the installed `@nestjs/common@12`; rate-limiting on auth endpoints is deferred until it catches up (or can be handled at the reverse-proxy level).
