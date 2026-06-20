## Lecture Progression & Unlock System

A sequential unlock flow where students watch Lecture N → pass Quiz N → unlock Lecture N+1, per chapter. Quiz settings are admin‑controlled per lecture quiz, with coin rewards on pass.

### 1. Database changes (single migration)

**`tests` table — add quiz config columns (lecture_quiz only):**
- `marks_per_question int default 1`
- `passing_marks int default 0`
- `time_limit_seconds int null`
- `total_questions int null` (target count for admin reference)

**`chapters` table — add completion rewards:**
- `completion_xp int default 100`
- `completion_coins int default 50`

**New table `chapter_completions`** (user_id, chapter_id, completed_at) — RLS: user reads own; insert by service role.

**New view / RPC `get_lecture_unlock_state(_user_id, _standard_id)`** (security definer) that returns, per lecture in the student's standard:
- `unlocked` (bool), `quiz_passed` (bool), `previous_lecture_id`, `previous_quiz_id`, `previous_passing_marks`

Logic: For each chapter ordered by `lecture_number`, lecture 1 unlocked. Lecture N unlocked iff the lecture N‑1's quiz has a `quiz_attempts` row with `correct_count * marks_per_question >= passing_marks` for that user.

**RLS / GRANTS** on new table; reuse `private.has_role` for admin overrides.

### 2. Server functions

`src/lib/api/lecture-progression.functions.ts` (new):
- `getLectureProgress({ standardId? })` — calls the RPC, returns map keyed by lecture id with unlock + pass status, plus per‑chapter aggregates (lectures_completed, total, pass_rate, percent, next_to_unlock).
- `getChapterProgress({ chapterId })` — same data scoped to one chapter.

`src/lib/api/lecture-quiz.functions.ts` (update):
- `getQuizForLecture` also returns `passing_marks`, `marks_per_question`, `time_limit_seconds`, and the caller's best previous attempt.
- `submitLectureQuiz` computes `score = correct * marks_per_question`, `passed = score >= passing_marks`. Coins still = 1 per correct, awarded regardless (per spec: "1 correct = 1 coin"). Returns `{ correct, total, score, passingMarks, passed, coinsAwarded, nextLectureUnlocked }`. On pass, if this is the final lecture of the chapter, insert `chapter_completions` and award chapter XP/coins (idempotent).

`src/lib/api/lecture-quiz-admin.functions.ts` (new, admin-gated via `assertAdmin`):
- `adminListLectureQuizzes({ subjectId?, chapterId? })` — lecture → quiz config + question count + attempt stats (attempts, pass %, most‑failed question).
- `adminUpsertLectureQuiz({ lectureId, title, marks_per_question, passing_marks, time_limit_seconds })` — creates the `tests` row of kind `lecture_quiz` if missing, else updates.
- `adminGetQuizQuestions({ testId })` / `adminUpsertQuestion(...)` / `adminDeleteQuestion(...)` — full question editor (text, options[], correct_option).
- `adminGetLectureProgress({ studentId? })` — per‑student progress matrix.
- `adminOverrideUnlock({ studentId, lectureId, unlocked })` — writes to a new `manual_unlocks` table (user_id, lecture_id, unlocked bool) that the RPC also honors.

### 3. Student UI

**`src/routes/app.lectures.tsx`** — lectures list rewritten to:
- Group by subject → chapter, sorted by `lecture_number`.
- Each lecture row reads unlock state from `getLectureProgress`.
- Locked rows: lock icon, dim style, subtitle "Pass Quiz {N‑1} ({passing_marks}/{total_marks}) to unlock".
- `openLecture` blocks opening when locked (toast).
- Quiz panel shows time limit, passing target, prior best, and after submit: PASS/FAIL state, coins earned, "Lecture N+1 unlocked" or retry CTA. On chapter completion → reward popup (badge + XP + coins).

**New `src/components/lectures/ChapterProgress.tsx`** — per‑chapter card: completed/total, pass rate %, progress %, next lecture to unlock.

### 4. Admin UI

**New route `src/routes/app.admin.lecture-quizzes.tsx`** (admin‑only):
- Subject + chapter pickers → list lectures with quiz config inline (edit marks per question, passing marks, time limit).
- "Edit questions" dialog reusing existing question shape.
- Stats column: attempts, pass %, most failed question id.
- "Student progress" tab → table of students × lectures with pass/fail dots and a "Manual unlock" toggle.

**Add tile to `src/routes/app.admin.content.tsx`** linking to the new route.

### 5. Memory

Add `mem://features/lecture-progression` describing the unlock invariant + admin override behavior; reference it from `mem://index.md`.

### Technical notes

- Unlock state is server‑computed (RPC) so the client can't bypass by mutating local state; `submitLectureQuiz` is the only path that records a pass, and it grades server‑side using `correct_option` (already the case).
- Chapter completion award is idempotent via `chapter_completions` unique (user_id, chapter_id) + ledger check.
- Existing `completeVideo` (+50 XP) remains the watch reward; quiz rewards stay coin‑only (no XP), per spec.
- Coins awarded per correct answer remain unchanged; the only new gate is unlocking the next lecture, which requires `score >= passing_marks`.
- `manual_unlocks` allows admin to unlock without breaking the score gate.
