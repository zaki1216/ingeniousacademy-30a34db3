
# Simplify Ingenious Academy

Preserve: Academy theme, World/Building/Curriculum/Adventure engines, auth, XP, coins, Guardian Battles, Daily Chest, Achievements, responsive layouts.

## 1. Features to Remove (student + admin)

Delete routes, components, server functions, nav entries, and dead helpers for:

- **PvP** — `app.pvp.*`, `pvp-*.functions.ts`, PvP DB references in UI (tables kept, unused)
- **Pets** — `app.pets.tsx`, `rpg/pets.ts`, `PetCompanion`
- **Inventory** — `app.inventory.tsx`
- **Collections** — `app.collection.tsx`, `rpg-collection.functions.ts`
- **Talents** — `app.talents.tsx`, `app.admin.talents.tsx`, `talents*.functions.ts`, `gamification/talents.ts`
- **Passes / Battle Pass** — `app.passes.tsx`, `app.admin.passes.tsx`, `passes*.functions.ts`, `rpg/passes.ts`
- **Spin Wheel** — `app.spin.tsx`, `app.admin.spin.tsx`, `spin.functions.ts`
- **Shop** — `app.shop.tsx`, `shop.functions.ts` (keep coins)
- **Active Bonuses panel** — `ActiveBonusesCard`
- **Game Stats panel** — `GameStatsCard`

DB rows/tables remain untouched (no destructive migrations); code just stops referencing them.

## 2. Student Navigation (6 tabs)

```text
Home  Academy  Learn  Progress  Profile  Settings
```

- Home → `/app` (index)
- Academy → `/app/journey` (world map / campus entrance)
- Learn → `/app/content` (lectures + notes browser)
- Progress → new `/app/progress` (merges attendance + leaderboard widget + achievements summary)
- Profile → `/app/profile` (residence, trimmed)
- Settings → `/app/settings`

Remove Announcements/Attendance/Leaderboard/Notes/Achievements/Coins/Guidebook from primary nav (routes may remain or be merged; announcements → Home, attendance → Progress, leaderboard → Progress widget, notes → inside lesson view).

## 3. Home Screen (`app.index.tsx`)

Single focused stack:
- Hero: avatar + welcome message
- "Today's Adventure" card with **Continue Learning** CTA (deep-links to recommended lecture)
- Current subject + progress bar
- XP + Coins compact chips
- Daily Chest card (existing)
- Latest announcement (1 item, from `announcements` table)

Remove ActiveBonuses, GameStats, extra CTA grids.

## 4. Progress Page (new)

Consolidates:
- Attendance summary (from existing attendance data)
- Adventure/chapter completion overview
- Leaderboard top-5 widget (XP hall only)
- Achievements list

## 5. Admin Cleanup

Keep hubs: Students, Content (subjects/classes/lessons), Attendance, Rewards, Announcements, Analytics, Settings. Remove: Passes, Talents, Spin, Lumi manager (optional keep), Gamification (if tied to removed systems — verify), Lecture-quizzes (already gone), PvP admin (none exists).

## 6. Code Cleanup

- Delete removed route files (TanStack regenerates `routeTree.gen.ts`).
- Delete their `*.functions.ts` and pure helpers.
- Remove imports in `app.tsx` nav arrays, HUD, Lumi knowledge references, campus building links pointing to removed pages.
- Verify typecheck passes.

## Technical Notes

- Coin earning paths in `gamification.functions.ts`, `chest.functions.ts`, `attendance.functions.ts` unchanged.
- Guardian Battles = boss lecture nodes in DungeonPath — untouched.
- `profiles.equipped_avatar/frame/title` columns remain but no UI edits them (Profile shows current values read-only).
- No DB migrations. Orphan tables (pvp_*, user_passes, user_talents, shop_items, etc.) stay; only code references removed.
- Verify with `tsgo` after edits.
