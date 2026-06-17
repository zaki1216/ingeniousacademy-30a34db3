
# Learning RPG Upgrade Plan

Goal: simplify navigation, surface progression, and re-skin existing systems as an RPG. **No existing logic, table, or server function will be deleted** — only re-organized and re-presented.

## 1. Navigation Restructure

Reduce primary nav (both desktop sidebar and mobile bottom tabs) to:

```
Home  |  Journey  |  Arena  |  Shop  |  Profile
```

Everything else moves into a "More" overflow menu or becomes a subsection of one of the five primary screens:

| Old item | New location |
|---|---|
| Quests, Missions | Journey → Quests tab |
| Worlds, Lectures, Content, Chapters | Journey → Worlds / Dungeons |
| Tests, Results | Journey → Quests (Chapter Quests) |
| PvP, Battles | Arena |
| Achievements, Badges, Pets, Inventory, Talents | Profile (tabbed) |
| Coins, Spin, Passes | Shop (tabs) |
| Attendance | Profile → Stats |
| Announcements (News) | Home cards |
| Settings, Admin pages | "More" menu (unchanged) |

Admin nav is left as-is (admin needs all tools).

## 2. Home Screen — Game Lobby

Rebuild `app.index.tsx` as a lobby with three sections:

**a) Hero Player Card** — avatar, name + equipped title, Level, XP bar, Rank tier badge, Coin balance, 🔥 streak, attendance %, "Next Unlock" line (next title/shadow/rank).

**b) Today's Quests** — daily checklist with progress bars:
- Attend Class (+2 Coins)
- Watch 1 Lecture (+50 XP)
- Complete 1 Quiz (+100 XP)
- Revise 15 min (+25 XP)

Derives progress from existing tables (`attendance`, `video_completions`, `results`, `xp_transactions`).

**c) Announcement Cards** — reads from existing `announcements` table; replaces the standalone News page. (Route file kept but de-linked.)

## 3. Journey Page (new `app.journey.tsx`)

Single progression hub with tabs:
- **Worlds** — Math Kingdom, Science Realm, Language Empire, Reasoning Citadel. Each card shows completion %, recommended level, bosses/quests remaining.
- **Dungeons** — chapters re-skinned (Algebra Dungeon, Geometry Fortress, …) with XP/Coin/Shadow rewards.
- **Quests** — merged Daily / Weekly / Chapter / Special tabs.
- **Boss Battles** — chapter-end tests.
- **Progress Map** — visual rail of completed → current → locked nodes.

Reuses existing `subjects`, `chapters`, `tests`, `quests` server fns.

## 4. Profile Page Overhaul

Tabbed RPG profile:
- **Overview** — avatar, level, rank, coins, streak, attendance %, arena wins, lectures, quests completed, collection %.
- **Achievements** (merged) — Badges | Titles | Achievements | Collection Progress.
- **Collection** — Shadows | Pets | Titles | Badges | Special Rewards with % bars.
- **Stats** — attendance breakdown + XP/coin history.
- **Talents** — link to existing talents page.

## 5. New Systems (light, data-driven)

**Titles** — `titles` table (key, name, description, requirement_type, requirement_value, rarity) + `user_titles` (unlocked, equipped). Seed with: Rookie Hunter, Dungeon Explorer, Homework Slayer, Quiz Assassin, Algebra Warrior, Science Mage, Rank Climber, Elite Scholar, S-Rank Hunter, Monarch Candidate. Equipped title shows under player name everywhere (PlayerStatusBar, HeroCard, Profile).

**Shadows** — `shadows` table (key, name, subject, rarity, description, unlock_rule) + `user_shadows`. Seed Algebra Knight, Geometry Archer, Motion Warrior, Grammar Sage, Atom Mage. Awarded on chapter completion.

**Seasons** — `seasons` table (key, name, starts_at, ends_at, theme) + `season_progress` (user_id, season_id, points). Attendance/lectures/quizzes/quests contribute points via existing XP hooks (additive trigger). Rewards listed in season config: badges, titles, frames, shadows.

All new tables: GRANT + RLS + `has_role` admin policies per project standards.

## 6. Rank Tier Visuals

New `<RankTier>` component renders E → D → C → B → A → S → National → Monarch with distinct colors/icons. **No change to rank calculation** — only visual. Used in Home hero, Profile, Leaderboard.

## 7. Rankings

Existing `app.leaderboard.tsx` stays as the "Rankings" destination, linked from Profile and Home. Adds: Current Position card, Rank Progress bar to next tier, Top 10 list. Logic untouched.

## 8. Cleanup (no deletions)

- Remove sidebar/bottom-tab links to: Coins, Attendance, News, Inventory, Pets, Talents, Achievements, Quests, Lectures, Tests, Worlds, Content (still reachable via Journey/Profile or direct URL).
- Spin & Passes accessible from Shop tabs.
- All old routes remain functional and unbroken.

## Technical Section

**New files**
- `src/routes/app.journey.tsx` (tabs: Worlds, Dungeons, Quests, Bosses, Map)
- `src/routes/app.collection.tsx` (linked from Profile)
- `src/components/rpg/RankTier.tsx`, `HeroLobbyCard.tsx`, `DailyObjectives.tsx`, `AnnouncementsFeed.tsx`, `WorldCard.tsx`, `DungeonCard.tsx`, `TitleChip.tsx`, `ShadowCard.tsx`, `SeasonProgress.tsx`
- `src/lib/api/journey.functions.ts`, `titles.functions.ts`, `shadows.functions.ts`, `seasons.functions.ts`, `home.functions.ts` (daily-objective aggregator)
- `src/lib/rpg/titles.ts`, `shadows.ts`, `seasons.ts`, `tiers.ts`

**Edited files**
- `src/routes/app.tsx` — slim primary nav to 5 items + "More" overflow; mobile bottom tabs to same 5.
- `src/routes/app.index.tsx` — replace with lobby layout.
- `src/routes/app.profile.tsx` — tabbed RPG profile with Collection.
- `src/routes/app.shop.tsx` — add Passes + Spin tabs.
- `src/components/rpg/PlayerStatusBar.tsx` — show equipped title.

**Migrations (one combined)**
- `titles`, `user_titles`, `shadows`, `user_shadows`, `seasons`, `season_progress` tables
- GRANTs to authenticated + service_role; RLS: users read all catalog rows, read/write own progress rows; admins manage catalog via `has_role`.
- Seed rows for titles, shadows, current month season.

**Preserved**
- All existing tables, server fns, rank/XP/coin/streak logic, attendance rewards, talent tree, PvP, lectures, achievements, badges, spin, passes — untouched. Only re-organized in the UI.

Risks: file scope is wide; will land in two passes — (1) DB migration + nav/home/profile shell, (2) Journey + Collection + Titles/Shadows/Seasons wiring.
