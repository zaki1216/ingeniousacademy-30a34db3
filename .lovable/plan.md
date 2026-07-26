
# Adventure Dashboard + Quiz System Removal

## Scope
Preserve all current architecture (HUD, Academy World, curriculum, Building Engine, Journey, Residence, etc.). Two workstreams:

### A. Remove the Quiz System (student + admin + DB)
- **Student surfaces removed**
  - `src/routes/app.tests.tsx`, `src/routes/app.tests.$testId.tsx`
  - `src/routes/app.results.tsx`, `src/routes/app.analytics.tsx`, `src/routes/app.analytics.$testId.tsx`
  - `QuestQuizPanel` and the Boss dialog inside `src/routes/app.journey.$worldId.$dungeonId.tsx`
- **Admin surfaces removed**
  - `src/routes/app.admin.lecture-quizzes.tsx`
  - `src/routes/app.admin.quiz-import.tsx`
  - `src/routes/app.admin.assessment.tsx` (folded into Content)
  - Quiz cards from `app.admin.dashboard.tsx`, `app.admin.content.tsx`, `app.admin.settings.tsx`
  - "Quiz History" section from `app.admin.students.$id.tsx`
- **APIs removed**
  - `src/lib/api/lecture-quiz.functions.ts`
  - `src/lib/api/lecture-quiz-admin.functions.ts`
  - `src/lib/api/quiz-import.functions.ts`
  - `submitTest`, `checkChapterBoss` from `academy.functions.ts` / `gamification.functions.ts`
  - Quiz history block from `admin-rewards.functions.ts`
- **Progression rewrite** (`lecture-progression.functions.ts`)
  - Unlock next lecture when the previous is marked complete (video watched → `video_completions`), or via admin `manual_unlocks`.
  - Chapter completion + boss reward triggers automatically after final lecture is marked complete (moved into `completeVideo`).
- **DB**: Keep `tests` / `questions` / `quiz_attempts` / `results` tables (PvP arena still queries `questions`). Only delete the `lecture_quiz` rows so no quiz content appears anywhere:
  ```sql
  DELETE FROM quiz_attempts USING tests WHERE quiz_attempts.test_id = tests.id AND tests.kind = 'lecture_quiz';
  DELETE FROM results USING tests WHERE results.test_id = tests.id AND tests.kind = 'lecture_quiz';
  DELETE FROM questions USING tests WHERE questions.test_id = tests.id AND tests.kind = 'lecture_quiz';
  DELETE FROM tests WHERE kind = 'lecture_quiz';
  ```
- **Nav / links**: Sidebar entries for Tests, Results, Analytics, Quiz Rules, Quiz Import removed.

### B. Adventure Dashboard (per building)
New reusable component `src/components/building/AdventureDashboard.tsx` mounted at the top of both `HallRenderer` and `SimpleRenderer`, driven by `useBuildingData` + `getLectureProgress`. Sections:

1. **Adventurer Overview** — cadet name, class, building name, personal rank badge, XP into level bar.
2. **Today's Adventure** — the next unlocked/unfinished lecture (`next_to_unlock`), with dungeon name, quest title, "Enter Quest" CTA that deep-links to `/app/journey/$worldId/$dungeonId`.
3. **Building Objectives** — 3 chip goals: "Clear a Quest", "Finish a Dungeon", "Weekly streak" with progress state.
4. **Rewards Preview** — XP, coins, and chapter-completion bonuses for the current dungeon.
5. **Recent Progress** — last 3 cleared lectures (from `video_completions`).
6. **Mentor Guidance** — dynamic line from existing `mentor.line()` config.
7. **Motivator Footer** — short quote pulled from a small rotating list.

Loading: skeleton tiles. Empty: "Your adventure is about to begin — no dungeons yet." Fully theme-tokenised (uses building `theme` accents already in config).

## Technical notes
- Handlers that used to award boss rewards in `submitLectureQuiz` are moved into `completeVideo`: after inserting a `video_completions` row, if every lecture in the chapter is now completed and `chapter_completions` doesn't exist, insert it and grant the chapter XP/coins bonus.
- `LectureUnlockState` shape trimmed: `quiz_passed` is replaced with `completed` (video_completions). All consumers updated (`DungeonPath`, dungeon route).
- Route tree regenerates automatically after files are deleted.

## Out of scope
- Redesigning any surviving UI.
- Touching PvP, Attendance, Shop, Passes, Talents, Spin, Chest.
- Migrating the `tests`/`questions` schema (kept for PvP).
