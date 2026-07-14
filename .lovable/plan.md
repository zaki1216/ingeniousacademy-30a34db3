
# RPG Campaign Mode — Journey Redesign

Pure frontend/presentation redesign. Zero backend changes.

- Reuse existing tables: `subjects`, `chapters`, `lectures`, `tests` (`kind = lecture_quiz`), `video_completions`, `chapter_completions`, `quiz_attempts`, `manual_unlocks`.
- Reuse existing server fn `getLectureProgress` for gating and progression aggregates.
- No changes to auth, quiz submit, XP, coins, chest, or rewards logic.

## Terminology mapping (UI only)

| RPG term | Existing entity |
|---|---|
| World | Subject |
| Dungeon | Chapter |
| Quest | Lecture |
| Quiz Gate | Lecture assessment (`tests.lecture_quiz`) |
| Boss Battle | Chapter final challenge (`chapter_completions`) |

## 1. Campus → Building routing

Update `src/components/campus/CampusMap.tsx` so each Subject building routes to a **real subject world**, not the generic `/app/journey`.

- Fetch the student's `standard_id` and `subjects` list once (react-query, keyed by user).
- Match buildings to actual subjects by name heuristic (Mathematics, Science, Language/English). Any building without a matching subject falls back to `/app/journey`.
- Non-subject buildings (Arena, Shop, Hall of Fame, Residence) unchanged.
- Avatar walk-in animation preserved; final navigate goes to `/app/journey/$worldId` (subject) or existing target.
- Also render a "More Subjects" small doorway that opens `/app/journey` (world picker) so extra subjects remain reachable.

## 2. World picker (`/app/journey/`)

Kept as a fallback/all-worlds view. Restyled lightly to match RPG tone but not the primary entry.

## 3. Building Interior — World view (`/app/journey/$worldId/`)

Rewrite `src/routes/app.journey.$worldId.index.tsx`.

Layout:

```
[ ← Back to Campus ]
──────────────────────────────────
  MATHEMATICS BUILDING           (banner w/ crest, torch glow)
  "Master logic, numbers and problem solving."
──────────────────────────────────
  Progress 42%   ▓▓▓▓▓░░░░░
  Dungeons  2 / 5      Quests 12 / 30      Bosses 2
  Current Objective: ⚔ Algebra Dungeon → Quest 03
──────────────────────────────────
  DUNGEON LIST (RPG cards, all visible, all enterable)
    ⚔ Algebra Dungeon      ★☆☆   2/5 quests   Boss: Locked
       reward strip: +XP  +Coins  Badge  Shadow
    ⚔ Geometry Dungeon    ★★☆   0/4 quests   Boss: Locked
    ...
```

- Subtitle mapped per subject (small local map). Fallback: "Chart your path through this world."
- Data: existing world query + join `getLectureProgress` for per-chapter aggregates (`chapters[]` from that fn already gives `total`, `completed`, `passed`, `next_to_unlock`).
- Current Recommended Dungeon = the first chapter with `next_to_unlock !== null`.
- Difficulty stars derived from chapter index (deterministic, cosmetic).
- Reward preview shows `completion_xp` / `completion_coins` from `chapters` (already selected upstream) + static badge/shadow icons.

## 4. Dungeon Gate transition

When the student clicks a Dungeon card, play a short (~700ms) framer-motion overlay:

- Dark stone-gate SVG splits open, torches flare, dungeon name fades in, then the route pushes to `/app/journey/$worldId/$dungeonId`.
- Implemented as a local overlay component `DungeonGate` inside the world route; no new route.

## 5. Dungeon Map — quest path (`/app/journey/$worldId/$dungeonId`)

Rewrite the visual layer of `src/routes/app.journey.$worldId.$dungeonId.tsx`. Data hooks, mutations, and quiz submission stay identical.

Replace the current vertical list with a **stone-path Dungeon Map**:

```text
        ● Quest 01  (unlocked / completed)
        │
        │  stone path segment
        │
        ● Quest 02  🔒 (chain overlay)
        │
        ● Quest 03  🔒
        │
        ● Quest 04  🔒
        │
        👑 BOSS BATTLE  🔒
```

- Zig-zag path: alternate node x-position left/right, connected by SVG stroke-dasharray "cobblestone" segments; small torch/rune sprites between nodes.
- Each node = circular medallion showing quest number, colored by state:
  - Completed → gold with checkmark, glow.
  - Unlocked → blue with pulse.
  - Locked → grey with chain SVG + padlock.
- Tapping a node opens the existing Quest Card panel (right side on desktop, bottom sheet on mobile) with:
  - Quest number + title
  - Estimated time (derived from YouTube duration if present, else "≈ 10 min")
  - XP reward (from existing lecture reward config; fallback flat 50)
  - Completion status
  - Quiz status: Not attempted / Best X/Y / Passed
  - Unlock requirement (e.g. "Pass Quest 02 quiz with ≥ 6/10")
  - Buttons: **Watch Quest**, **Attempt Quiz** (already wired) — behavior unchanged.
- Locked nodes show a read-only lock panel: "Chain sealed — clear the previous quest's quiz to break it."
- Boss node at the tail:
  - Locked until every quest quiz is passed.
  - Opens the existing chapter-completion / claim flow (`chapter_completions` claim). No backend change.

## 6. Cinematic popups (frontend only)

Reuse existing `RewardPopup` + `FloatingReward`, add two thin wrappers:

- **QUEST COMPLETED** — shown after `completeVideo` success:
  - "QUEST COMPLETED" · +XP · "Lecture Mastered" · "Proceed to Quiz →" CTA.
- **QUEST FAILED** — shown after a quiz submit where `score < passing`:
  - "QUEST FAILED" · Current Score · Required Score · **Retry Quiz** · "Next Quest Remains Locked".
- **DUNGEON CLEARED** — shown after boss/chapter completion:
  - "DUNGEON CLEARED" · reward list · badge/shadow · **Return to Building** CTA → `/app/journey/$worldId`.

All three are new components under `src/components/rpg/`, driven by local state in the dungeon route — no server function changes.

## 7. Lock behavior confirmation

Progression already enforces: Quest 01 unlocked by default; each subsequent quest unlocks only when the previous quest's quiz is passed (unlimited retries). This is done server-side in `computeUnlockState` in `lecture-progression.functions.ts`. UI mirrors this via the existing `states[]` — no client-side unlock logic added.

## 8. Visual style

- Fantasy-academy palette using existing tokens: `--gradient-primary`, `glass-card`, `glow-primary`, plus per-dungeon accent gradients already defined in `DUNGEON_THEMES`.
- Framer-motion for gate open, node pulse, path draw-in, quest-panel slide.
- Torches, banners, chains, cobblestone path all done via inline SVG (no new binary assets).
- Existing hover/scale utility classes reused.

## Files touched

Edit:
- `src/components/campus/CampusMap.tsx` — building → subject-world routing.
- `src/routes/app.journey.$worldId.index.tsx` — Building Interior redesign.
- `src/routes/app.journey.$worldId.$dungeonId.tsx` — Dungeon Path + Quest Panel + boss node (visual layer only; data + mutations unchanged).
- `src/routes/app.journey.index.tsx` — minor restyle as fallback world picker.

Add:
- `src/components/rpg/DungeonGate.tsx` — gate open transition overlay.
- `src/components/rpg/DungeonPath.tsx` — SVG path + quest nodes renderer.
- `src/components/rpg/QuestPanel.tsx` — right/bottom quest detail card.
- `src/components/rpg/QuestCompletedPopup.tsx`
- `src/components/rpg/QuestFailedPopup.tsx`
- `src/components/rpg/DungeonClearedPopup.tsx`

## Non-goals

- No schema, RLS, or server-fn changes.
- No changes to quiz scoring, unlock rules, coin/XP payouts, chest, PvP, shop, admin panel.
- No new assets beyond inline SVG/emoji.
