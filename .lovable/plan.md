## Goal

Cleanly split the app into two parallel tracks:

- **Hunter track (game)** — attendance, lecture watches, lecture quizzes, XP, coins, quests, arena, badges, titles. Never affects academics.
- **Scholar track (academics)** — only teacher-entered offline test marks. Drives the Report Card and Scholar leaderboard.

Existing in-app tests (`tests` / `questions` / `results`) become **Lecture Quizzes** in the game track — coins-per-correct-answer, no academic impact. Boss tests stay as a game feature.

No new top-level pages. Everything slots into the 5 existing primary hubs.

---

## 1. Database (one migration)

### Lecture quizzes (repurpose existing schema, no destructive change)
- Add `tests.lecture_id uuid null` referencing `lectures(id)`. A quiz is "attached" to a lecture when set. Keep `chapter_id` for boss/chapter-wide quizzes.
- Add `tests.kind text` enum-ish: `'lecture_quiz' | 'boss'`. Default `'lecture_quiz'`.
- New table `quiz_attempts` (separate from `results` to avoid the unique `(student, test)` constraint — students can replay for revision):
  - `student_id`, `test_id`, `lecture_id`, `correct_count`, `total_questions`, `coins_awarded`, `created_at`.
  - RLS: student reads/inserts own; admin reads all.

### Academic (offline) tests — brand new tables, fully separate from `tests`
- `offline_tests`: `subject_id`, `chapter_id` (nullable for cross-chapter), `title`, `max_marks`, `test_date`, `created_by`, timestamps.
- `offline_marks`: `offline_test_id`, `student_id`, `marks_obtained`, `remarks` text. Unique `(offline_test_id, student_id)`.
- `report_card_remarks`: `student_id`, `term` text, `remarks` text, `updated_by`, timestamps. (Teacher remarks for the report card.)
- RLS: admin full CRUD; students SELECT only their own rows. GRANTs to `authenticated` + `service_role`.

### Existing `results` table
- Leave intact (data preserved) but stop writing to it from new lecture-quiz flow. New quiz attempts go to `quiz_attempts`. Old `results` rows remain readable for legacy boss test history.

---

## 2. Server functions (`src/lib/api/`)

- `lecture-quiz.functions.ts`
  - `submitLectureQuiz({ testId, answers })` — grades on server, awards `correctCount` coins via `coin_transactions`, inserts `quiz_attempts`. No XP, no `results` write.
  - `getQuizForLecture({ lectureId })` — fetches the lecture's quiz + questions (no answers).
- `academic.functions.ts`
  - Admin: `createOfflineTest`, `updateOfflineTest`, `deleteOfflineTest`, `listOfflineTests`, `bulkUpsertMarks({ offlineTestId, marks: [{studentId, marks_obtained}] })`, `setReportCardRemarks`.
  - Student: `getMyReportCard()` returns subject-wise totals/percentages, chapter-wise breakdown, academic rank within standard, remarks.
- `leaderboard-scholar.functions.ts` — `getScholarLeaderboard({ period })` aggregates `offline_marks` percentages per student in caller's standard. Hunter leaderboard reuses existing `getLeaderboard`.

All server-side, `requireSupabaseAuth`, admin-only paths assert `has_role`.

---

## 3. Routes (no new primary nav)

### Journey hub — game lectures + quizzes
- `app.lectures.tsx`: after a student claims lecture XP, surface a **"Start Quiz"** button if the lecture has a quiz. Quiz renders in a dialog/modal; on submit shows `+N coins earned`. Quiz is replayable.
- Existing `app.tests.tsx` (boss tests) stays under Journey, renamed UI label "Boss Quizzes" — still game track, still awards coins/XP, no academic effect.

### Profile hub — Scholar / Report Card
- New route `app.report-card.tsx` linked from Profile menu ("Academic Report Card"). Shows subject-wise marks, chapter-wise breakdown, percentage, academic rank, teacher remarks.

### Arena hub — dual leaderboards
- `app.leaderboard.tsx` gets a third tab: **Hunter** (XP — existing), **Attendance** (existing), **Scholar** (offline marks). Already linked from Arena, no new route.

### Admin — under existing Assessment hub
- `app.admin.offline-tests.tsx` — list/create/edit offline tests, open a marks-entry sheet that lists all students in the standard with an input per student. Linked from `app.admin.assessment.tsx` alongside existing Tests/Results.
- Existing admin Tests page renamed in UI to "Lecture & Boss Quizzes" (game).

---

## 4. UI copy & framing

- Lecture quiz dialog: "Revision Quiz · Earn 1 coin per correct answer · Does not affect your report card."
- Report Card page header: "Academic Report Card — based on teacher-entered offline tests only."
- Leaderboard tabs labeled **Hunter Rank**, **Attendance**, **Scholar Rank**.

---

## 5. Out of scope (intentionally)

- No migration of existing `results` rows into `quiz_attempts` (kept as historical boss data).
- No changes to attendance/coins/XP economy beyond adding the quiz-coin path.
- No new top-level navigation items.

---

## Technical notes

- `quiz_attempts` is intentionally separate from `results` so unique `(student_id, test_id)` doesn't block replays, and so academic vs game data never share a table.
- Coin awards funnel through the same `coin_transactions` insert pattern used elsewhere (see `gamification.functions.ts`) so balances stay consistent.
- Academic rank = dense rank by total percentage across all offline tests within the student's `standard_id`.
- All new public-schema tables ship with `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` per project rules. RLS enabled, policies scoped to `auth.uid()` or `has_role(..., 'admin')`.
