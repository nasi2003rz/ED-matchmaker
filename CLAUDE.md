# CLAUDE.md — Class & Course Platform (Educational Matchmaker)

This file is the persistent context for Claude Code when working on this repository.
Read it fully before making any changes. Follow the execution rules in Section 12 strictly.

---

## 1. Product Vision

We are building a platform connecting three user types:

1. **Students / Learners / Parents**
2. **Instructors / Teachers**
3. **Institutes / Academies**

Long-term, this is a two-sided education & activity marketplace with a matchmaking engine.

Core positioning:

- **For students/parents:** *Less search, better match.* Instead of forcing users to browse hundreds of classes, understand their needs and recommend 5–10 highly relevant options.
- **For instructors/institutes:** *Less advertising, more qualified customers.* Give instructors tools to manage existing students first, and eventually generate qualified new leads.

## 2. Product Strategy — Read This Before Building Anything

**Do NOT build the marketplace first.** We are starting from the supply side.

The acquisition loop we are building toward:

```
Instructor joins → Creates classes → Adds/invites students →
Students create accounts → Students use the platform → Parents become users →
Network grows organically → Marketplace launches on top of the network
```

The instructor is the initial customer. Students become the organic acquisition channel.
The invitation link (Section 7) is the single most important growth mechanism in this product — treat it accordingly.

## 3. Product Phases

- **Phase 1 — Instructor OS / Class Management** (current focus — see Section 5 for MVP scope)
- **Phase 2 — Student & Parent Experience** (dashboards, deeper student/parent features)
- **Phase 3 — Marketplace** (discovery, search, filters, categories)
- **Phase 4 — Matchmaker** (the core long-term differentiator — see Section 11)

**Do not build Phase 3 or Phase 4 features now.** Build the architecture so they are not blocked later (see Section 8), but do not implement them.

## 4. Roles & Core Relationship Model

A single `User` entity must support multiple roles. Do NOT create separate authentication systems per role.

```
User
 ├── Instructor
 ├── Student
 └── Parent

Parent   → has many Children (Students)
Instructor → teaches many Classes, may belong to Institute(s) (many-to-many, don't hard-code 1:1)
Institute  → has many Instructors, Courses, Classes, Students
Course   → has many Classes
Class
 ├── Instructor
 ├── Students (via Enrollment — join entity, not a raw FK)
 ├── Sessions
 ├── Assignments
 └── Payments
Student → has many Enrollments
```

Use proper join entities wherever a relationship is many-to-many. Do not use simplistic foreign keys that would block future expansion (e.g., instructor↔institute must not be 1:1).

## 5. Phase 1 Scope (Current MVP)

### 5.1 What Phase 1 Must Deliver

**Instructor can:**
Register → Create profile → Create class → Define schedule → Add students → Invite students →
Manage attendance → Create homework → Review submissions → Give grades/feedback →
Communicate with students/parents → Track basic payments

**Student/Parent can:**
Register → Accept invitation → Join class → View schedule → View homework → Submit homework →
View grades → View attendance → Receive messages → View payment status

If this workflow works reliably end-to-end, Phase 1 has achieved its objective. Nothing more is required for v1.

### 5.2 Core Modules (Phase 1)

- Instructor onboarding (name, photo, phone, email, teaching categories, subjects, short bio, experience, location, online/offline capability — keep it short, no unnecessary fields)
- Student management (add manually / invite / import / view / edit / archive / history)
- Student invitation system (see 5.3 — critical feature)
- Class management (see data fields below)
- Schedule / calendar (day/week/month views; parent sees all children combined)
- Private lessons (propose → accept/reject → confirm; do not force into fixed recurring schedules)
- Attendance (present/absent/late/excused + class-level attendance rate)
- Homework (assign, submit, review, grade, feedback; statuses: assigned/submitted/reviewed/late/missing)
- Grades (numeric/letter/pass-fail/text feedback)
- Communication (class announcements + direct instructor↔student/parent messages; states: sent/delivered/read — keep this a utility layer, not a social network)
- Basic payments (tuition amount, due date, paid amount, remaining, status: paid/partially paid/unpaid/overdue — no accounting system, no payment gateway yet)
- Student dashboard ("what do I have today?": next class, today's classes, pending homework, recent grades, unread messages)
- Parent dashboard (multiple children, switch between them, family calendar)
- Institute entity (support the concept even with limited functionality — name, logo, description, address, location, phone, website, categories, working hours)
- Notifications (in-app to start; design as a reusable service, not tightly coupled to individual modules — events: invitation, new assignment, assignment reviewed, new grade, class reminder, schedule change, new message, payment reminder)

### 5.3 Student Invitation System — Critical Feature

This is the primary organic growth mechanism. Implement carefully.

- Instructor creates a class → system generates a class invitation link: `/join/class/{classId}`
- Recipient sees class name, instructor, schedule, location, and a "Join Class" action
- After registration/login, they become a class member
- Must support: invitation links, invitation status, pending / accepted / revoked invitations

### 5.4 Class Data Model

Fields: name, subject/category, description, instructor, location, online/offline, private/group, capacity, start date, end date, days, start time, end time, price, number of sessions, status.

Statuses: `draft`, `active`, `full`, `completed`, `cancelled`, `archived`.

### 5.5 Category-Specific Extensibility

Different class categories (sports, music, academic tutoring, art, language, kids, professional skills) share the core Class fields (Section 5.4) but each also needs category-specific attributes. **Do not hardcode category-specific columns onto the `Class`/`Course` tables.** Use an extensible schema instead:

- Each `Category` owns a definition of extra fields relevant to it (a JSON schema or key-value field-definition list — e.g. `field_key`, `label`, `type`, `required`).
- Each `Course`/`Class` stores its category-specific values against that schema (e.g. a `custom_fields` JSON column, or a generic `ClassAttribute(class_id, field_key, value)` table).
- Adding a new category or a new attribute to an existing category must be a data change (new field definitions), not a schema migration or new code path.

Illustrative (not exhaustive) examples of category-specific needs, for reference when designing the field-definition system:

| Category | Example category-specific fields |
|---|---|
| Sports (individual/team) | skill level / belt-rank, required equipment, indoor/outdoor, competitive vs. recreational track |
| Music | instrument, practice log, recital/performance schedule, instrument rental |
| Academic / exam prep | textbook/syllabus, mock exam scores, target exam date |
| Art / craft | required materials list, project-based structure (vs. session-based), student work gallery |
| Language | proficiency level (e.g. CEFR), speaking-practice tracking, certification target |
| Kids / early childhood | drop-off/pick-up log, safety/allergy notes, photo-sharing consent |
| Professional skills | project-based cohort structure, completion certificate, portfolio link |

Phase 1 should implement this extensibility mechanism itself, but only wire it up for 2–3 categories end-to-end (e.g. sports, music, academic) to validate the architecture — not all categories at once.

## 6. Phase 1 — Explicitly Out of Scope

Do NOT implement any of the following now. Build so they aren't architecturally blocked, but do not build them:

Full marketplace, advanced search, matchmaker, AI recommendations, AI analytics, advertising system, complex reviews, advanced payment gateway, full LMS, video hosting, live streaming, advanced accounting, complex institute ERP, public course ranking, affiliate system.

## 7. Navigation (Phase 1)

- **Instructor:** Dashboard, Classes, Students, Calendar, Messages, More
  (Dashboard shows: today's classes, upcoming sessions, student count, pending homework, unpaid tuition, unread messages)
- **Student:** Home, My Classes, Calendar, Homework, Messages, More
- **Parent:** Home, Children, Calendar, Messages, More

## 8. Data Model — Design for Future Extension

Implement now: `User`, `Profile`, `Role`, `Parent`, `Student`, `Institute`, `Instructor`, `Course`, `Class`, `ClassSession`, `Enrollment`, `Invitation`, `Attendance`, `Assignment`, `Submission`, `Grade`, `Conversation`, `Message`, `Announcement`, `Payment`, `Review`, `Category`, `Location`.

Do NOT implement yet, but do not architecturally block: `MatchProfile`, `MatchResult`, `Booking`, `Availability`, `Lead`, `DemandSignal`, `Recommendation`.

## 8.1 Discovery Gating (Critical Product Rule)

Public, unauthenticated discovery/search (browsing classes without an invitation) must be **gated by density**, not launched everywhere at once. This prevents the product from becoming a shallow "directory" like existing competitors (see Section 8.2).

- Discovery is **network-internal by default**: an invited/logged-in user (parent/student who already joined a class) may see "other classes near you" recommendations drawn only from real operational data (actual enrollment, attendance, capacity) — not marketing copy.
- Public discovery (open to anonymous/unauthenticated visitors) for a given `(geo, category)` pair only unlocks once that pair crosses a minimum density threshold (e.g., a minimum number of active classes with real enrolled students in that city+category). Track this per `(geo, category)` — do not gate globally on a single flag.
- Do not build the generic public search/browse UI in Phase 1. Build the data model so a `geo x category` density check can gate visibility later (e.g., a `discoverable` boolean or computed density flag on Category×Location, checked server-side before returning public search results).

## 8.2 Competitive Positioning Note

Directory-style "find a tutor" platforms already exist in this market and rely on self-reported instructor profiles with no operational data behind them, and their relationship with the user ends at the referral. This product's differentiation must come from two things baked into the data model, not just the UI:

1. **Operational proof, not self-reported claims** — seats-left counts, attendance rates, completion/retention rates surfaced in discovery must be computed from real `Enrollment`/`Attendance` records, never manually entered marketing stats.
2. **Post-match relationship** — the product's value continues after a match is made (attendance, homework, grades, payment tracking), unlike a lead-gen directory whose value ends at referral. Do not design any feature that treats a "match" as the end of the user relationship.

## 8.3 Lead Entity & Scoring Model (Growth/GTM Reference — Not a Phase 1 UI Feature)

`Lead` is listed in Section 8 as a future entity. It should be designed now as an **internal growth/sales tool** (not user-facing), used to prioritize which instructors/institutes to approach first for the highest conversion into active platform users.

Suggested `Lead` fields:

- `student_count_estimate` — larger existing student rosters feel more management pain and convert better than a solo tutor with a handful of students
- `billing_recurrence` — recurring monthly tuition (sports/music academies) creates more payment-tracking pain than one-off private lessons, and converts better on the Payments module
- `digital_signal_score` — evidence of existing semi-digital workflow (Telegram bot, shared spreadsheet, Instagram booking) signals openness to adopting a tool; a fully paper-based operation is harder to convert
- `geo_cluster_id` — leads should be prioritized in geographic clusters so a `(geo, category)` pair reaches the Discovery Gating threshold (Section 8.1) faster, rather than being spread thin nationally
- `is_multi_instructor` — a lead that is an institute/academy admin managing several instructors has more leverage (one conversion brings many instructors and students) than a single independent tutor

Suggested weighted score (weights are a starting hypothesis, tune after real outreach data):

```
lead_score = 0.30 * student_count_estimate
           + 0.25 * billing_recurrence
           + 0.20 * digital_signal_score
           + 0.15 * geo_cluster_id (proximity/density bonus)
           + 0.10 * is_multi_instructor
```

This model informs outreach prioritization (which leads the growth/sales team contacts first) — it is not a feature to expose in the product UI in Phase 1.

## 9. Authorization Rules (Non-Negotiable)

- An instructor can only access **their own** classes, students, and authorized institute data.
- A parent can only access **their own** children's data.
- A student can only access **their own** academic data.
- Every multi-tenant resource must be authorization-checked **server-side**, never trust client-side role checks alone.

## 10. Auditability

Important actions should eventually produce activity records: student added/removed, class edited, schedule changed, grade created/changed, assignment created, payment recorded, invitation revoked. Not required to be fully built in v1, but don't design data models that make this impossible later.

## 11. Future Matchmaker Architecture (Do Not Build Yet — Design Awareness Only)

When Phase 4 arrives, the matching pipeline will be:

```
User Need Profile → Eligibility Filter → Hard Constraints → Candidate Courses →
Scoring Engine → Ranking → Explainable Match Result
```

Critical distinction to preserve in the data model from day one:

- **Hard constraints** (must-match, disqualifying): age requirement, gender requirement, course level, location radius, available schedule.
- **Soft preferences** (weighted scoring): price, rating, distance, instructor quality, facilities.

A class restricted to ages 8–12 must never be shown to a 35-year-old, regardless of its rating. Keep this separation in mind even in Phase 1 field design (e.g., store class age range as a real filterable field, not free text).

Every match result must eventually be explainable (e.g., "96% Match — Location 100%, Schedule 100%, Budget 100%, Level 100%") — never a black-box score.

## 12. Claude Code Execution Rules

Do not attempt to implement the entire product at once. Work incrementally, in this order:

1. Audit existing repository
2. Establish architecture
3. Establish design system
4. Authentication
5. User / role model
6. Instructor onboarding
7. Student management
8. Class management
9. Invitations
10. Schedule
11. Attendance
12. Homework
13. Grades
14. Messaging
15. Basic payments
16. Student dashboard
17. Parent dashboard
18. Notifications
19. Security audit
20. UX polish
21. End-to-end testing

**For every step:**
- Inspect existing implementation first
- Reuse existing infrastructure where appropriate — do not duplicate components
- Maintain type safety
- Maintain server-side authorization
- Write migrations safely
- Preserve existing functionality
- Test critical workflows
- Do not introduce speculative features
- Do not build placeholder architecture for features that aren't needed yet — build clean extension points instead

## 13. Definition of Done

A feature is not complete merely because the UI exists. Every feature requires:

```
UI + API + Database + Authorization + Validation +
Loading states + Empty states + Error handling +
Mobile responsive behavior + Tests
```

Critical workflows must work end-to-end before a feature is considered shippable.

## 14. Design Principles

- **Platform: Web application, built as a PWA (Progressive Web App)** — installable to home screen, works reasonably offline (cached shell + graceful degradation when offline), responsive across mobile/tablet/desktop. Do not propose a native mobile app track for Phase 1.
- Mobile-first, extremely simple, fast
- RTL-ready, Persian-first
- Responsive, accessible, minimal cognitive load
- Do not create enterprise-looking dashboards — the target instructor is not technically sophisticated
- Common actions should require as few interactions as possible
- Onboarding: register → create first class → add first student → invite student → dashboard. First successful outcome should happen within minutes, not after filling 30 fields.

## 15. Primary Product Principle

Before adding anything, ask:

> **Does this make managing a class and its students significantly easier?**

If not, it does not belong in Phase 1. The marketplace and Matchmaker come only after a real network of instructors, students, parents, classes, schedules, outcomes, and demand data has accumulated.

## 16. Suggested Module Structure

```
auth
users
profiles
parents
students
instructors
institutes
courses
classes
schedules
attendance
assignments
grades
messaging
payments
notifications
invitations
```

Keep business logic server-side. Use strict, server-enforced authorization on every module above.
