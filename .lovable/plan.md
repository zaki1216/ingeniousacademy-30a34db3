# Adventure Dashboard + Quiz Removal

Two parallel workstreams. Preserve Academy World, HUD, Building Engine, Curriculum Engine, routes (except quiz), progress, XP/coins, Guardian system.

## Part A — Building Adventure Dashboard

Extend the Generic Building Engine so every building interior (Math/Science/Library and any future building) renders a reusable dashboard above the existing wing/dungeon content.

### New components (in `src/components/building/adventure/`)
- `AdventureHero.tsx` — building name, icon, mentor avatar, subtitle, overall completion %, student's rank within the building.
- `TodaysAdventureCard.tsx` — computes next action from progress: Continue previous quest / Start next unlocked / Continue campaign / Prepare for Guardian. Renders the primary CTA (`Continue Adventure` / `Begin Quest` / `Challenge Guardian` / `Resume Campaign`) that deep-links into the correct dungeon + quest.
- `ObjectivePanel.tsx` — three objective rows driven by data: "Watch today's lesson", "Earn XP (today)", "Defeat Guardian" (only when a boss is available/unlocked). Each shows status + progress.
- `RewardsPreview.tsx` — upcoming XP, coins, chapter/building completion rewards, guardian reward, next achievement progress.
- `ProgressPanel.tsx` — reusable animated bars/rings for building, wing, campaign, current quest.
- `MentorGuidance.tsx` — mentor portrait + contextual message chosen from config rules based on progress state.

### Data layer
- New selector hook `src/lib/building/useAdventureState.ts` — builds a normalized `AdventureState` from existing `useBuildingData` + gamification + lecture progression (no new server fns unless needed). Determines: nextQuest, currentCampaign, guardianAvailable, buildingCompletionPct, wingPct, mentorMessageKey.
- Extend `BuildingRenderConfig` in `src/lib/curriculum/types.ts` with:
  - `mentor.guidance: Record<GuidanceKey, string>` (config-driven messages).
  - `subtitle`, `heroBadge`, optional `rewardHints`.
- Extend `src/lib/curriculum/config.ts` with guidance strings per building.

### Integration
- Update `HallRenderer.tsx` and `SimpleRenderer.tsx` to render `<AdventureDashboard />` above their existing wing/dungeon UI. Dashboard is a single composed component that arranges the six pieces responsively (desktop grid, tablet stack with hierarchy, mobile ordered: Hero → Today's Adventure → Objectives → Rewards → Progress). No changes to routes or engine dispatch.

## Part B — Remove Quiz System

### Student side
- Delete routes: `app.tests.tsx`, `app.tests.$testId.tsx`.
- Remove quiz CTAs/sections from `DungeonPath.tsx`, `app.journey.$worldId.$dungeonId.tsx`, `app.profile.tsx`, `app.coins.tsx`, and any other student surface referencing tests/quizzes.
- Replace "quiz-gated" lecture unlock with a simple "Mark lecture complete" flow. Use existing `video_completions` as the completion signal; add a `markLectureComplete` server fn if not already present.
- Rewrite `src/lib/api/lecture-progression.functions.ts` so `isLectureUnlocked` requires only that the previous lecture is marked complete (or manual override). Drop all quiz checks.

### Admin side
- Delete routes: `app.admin.lecture-quizzes.tsx`, `app.admin.quiz-import.tsx`, `app.admin.assessment.tsx` (assessment == quiz management here — verify and delete or trim).
- Remove quiz nav entries from `app.tsx` sidebar and `app.admin.dashboard.tsx` tiles.
- Delete server fns: `lecture-quiz.functions.ts`, `lecture-quiz-admin.functions.ts`, `quiz-import.functions.ts`.
- Trim quiz sections from `app.admin.students.$id.tsx`, `app.admin.settings.tsx`, `app.admin.content.tsx`, `admin-rewards.functions.ts`, `gamification.functions.ts`.
- Remove quiz references from `lumi/knowledge.ts`, `entry/tips.ts`, `passes.ts`, `pets.ts`, `talents.ts` (text-only).

### Database (migration)
- Drop tables: `quiz_attempts`, `questions`, `tests`, `results` (results is quiz results — verify usage; if used elsewhere, keep).
- Drop dependent foreign keys first. Preserve `chapter_completions`, `video_completions`, XP/coin transactions.
- Keep `offline_tests` / `offline_marks` (physical offline tests, not app quizzes).

### Chapter completion
- Update `submitLectureQuiz` logic that awards chapter completion → move equivalent logic into `markLectureComplete`: when all lectures in a chapter are marked complete, award chapter XP/coins (idempotent via `chapter_completions`).

## Notes / risks
- `tests` also stores `is_boss` — Guardian battles currently piggy-back on the tests table. Since the spec says preserve Guardian system but remove quizzes, the "Guardian Battle" becomes a narrative/visual milestone tied to chapter completion (no quiz). CTA `Challenge Guardian` will trigger the chapter completion celebration when all lectures in the chapter are marked complete.
- Existing student progress (chapter_completions, XP, coins, video_completions) is preserved. Only quiz-attempt history is dropped.
