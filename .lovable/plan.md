
# Phase 1 — RPG Shell: "Solo Leveling Monarch" Edition

Pure presentation upgrade. Zero data changes. Zero removed functionality. All existing routes, server functions, attendance/coin logic, leaderboard calculation, and admin tools stay exactly as they are.

Aesthetic: dark cosmic (#06060a / #0f1226) with monarch purple (#6d4cff) and rune cyan (#22d3ee). Glowing edges, animated gradients, particle accents, glassy cards.

---

## 1. Design system (`src/styles.css`)

- Add Monarch palette tokens: `--bg-void`, `--bg-rift`, `--monarch`, `--monarch-glow`, `--rune`, `--rune-glow`, `--rank-e/d/c/b/a/s/national/monarch` color tokens, `--gradient-xp`, `--gradient-rank`, `--shadow-monarch`, `--shadow-rune`.
- Add display font **Orbitron** (HUD/ranks) + body **Rajdhani** via `<link>` in `__root.tsx`; register in `@theme`.
- New `@utility` classes: `rune-border`, `monarch-glow`, `holo-card`, `xp-bar-glow`, `rank-badge-{tier}`.
- New keyframes: `pulse-glow`, `shimmer-sweep`, `rune-rotate`, `float-up`, `particle-rise`, `level-up-flash`.

## 2. Global Player HUD (new component, mounted in `src/routes/app.tsx`)

`<PlayerStatusBar />` fixed-top on every `/app/*` route:
- Avatar (with equipped frame) + pet thumbnail beside it
- Level + animated XP bar (current/next from existing `gamification_stats`)
- Rank tier badge (derived from existing leaderboard score → E/D/C/B/A/S/National/Monarch)
- Coin counter (existing `coins`)
- Streak flame 🔥 (existing streak from quests data)
- Active title pill under name
- Reuses existing data — no new queries

Mobile: compact single-row HUD; Desktop: expanded with labels.

## 3. Home Screen redesign (`src/routes/app.index.tsx`)

Rebuild presentation, keep existing data hooks:
- **Player Card hero** — large monarch-themed card with avatar, level, XP bar, rank, coins, streak, "Next Unlock" teaser (computed from next level milestone)
- **Today's Quests** — pulls existing `getDailyQuestsAndStreak`; rendered as glowing RPG quest cards with reward chips (+XP, +Coins) and progress bars
- **Continue Journey** — new card that finds last incomplete lecture from existing `video_completions` and links into it
- **Quick Tiles** — Worlds, Dungeons, Arena, Leaderboard, Shop entrances styled as RPG portals

## 4. Worlds → RPG Worlds (`src/routes/app.worlds.tsx`)

Reskin existing subjects as worlds:
- Math Kingdom ⚔, Science Realm ⚡, Language Empire 📜, Reasoning Citadel 🧠 (auto-mapped from existing subject names with fallback)
- Each card: completion %, recommended level, quests done, "boss remaining" badge (derived from chapter count vs completed tests)
- Full-bleed gradient cards with particle backgrounds

## 5. Chapters → Dungeons (presentation in `src/routes/app.content.tsx` + lectures)

- Chapter name shown as "{Chapter} Dungeon/Fortress/Citadel" (rotating suffix)
- Each shows difficulty stars, XP/coin rewards, lock state, boss-battle button (links to existing chapter test)
- No data change — purely label + visual

## 6. Lectures (`src/routes/app.lectures.tsx`, `app.tests.$testId.tsx`)

- Each lecture row shows XP reward, coin reward, est. time, difficulty, completion ✓
- On completion: floating **"QUEST COMPLETE"** popup with +XP/+Coins animation (extend existing `RewardPopup`)

## 7. Quests unification (`src/routes/app.quests.tsx`)

Tabbed view over existing quest data:
- Daily | Weekly | Chapter | Special
- Daily uses existing `getDailyQuestsAndStreak`
- Weekly/Chapter/Special derived from existing data (test scores, lectures, attendance) — no new tables
- Keep streak heatmap, restyled with monarch glow

## 8. Leaderboard tiers (`src/routes/app.leaderboard.tsx`)

**Calculation unchanged** (attendance + lecture completion). Presentation only:
- Map score percentile → rank tier (E/D/C/B/A/S/National/Monarch) with thresholds
- Show: my rank tier card, rank above me, rank below me, weekly delta, motivational message
- Animated rank badges per tier

## 9. Talents → Skill Tree polish (`src/routes/app.talents.tsx`)

Reskin existing talents UI:
- Categorize existing talents into Math/Science/Language/Reasoning trees (via existing talent metadata)
- Visual node graph with locked/unlocked/path states, glowing connectors

## 10. Player Profile page (new `src/routes/app.profile.tsx`)

Aggregates existing data into RPG profile: avatar, level, rank, coins, streak, badges, achievements count, arena wins, lectures completed, attendance %. Linked from HUD avatar tap.

## 11. Navigation cleanup (`src/routes/app.tsx`)

- Primary bottom nav (mobile) / sidebar (desktop): Home, Worlds, Quests, Battles/Arena, Leaderboard, Shop, Profile
- Move to secondary "More" menu: Attendance, Announcements, Notes, Settings, Admin entries
- Nothing deleted — just regrouped

## 12. Reward & feedback FX

- Extend `RewardPopup` with particle burst, rune ring, level-up flash
- Toast variants for: quest complete, rank up, achievement unlock, streak milestone
- `framer-motion` for transitions (already in stack)

---

## Technical details

**Files to create:**
- `src/components/rpg/PlayerStatusBar.tsx`
- `src/components/rpg/PlayerCard.tsx`
- `src/components/rpg/QuestCard.tsx`
- `src/components/rpg/WorldCard.tsx`
- `src/components/rpg/DungeonCard.tsx`
- `src/components/rpg/RankBadge.tsx`
- `src/components/rpg/XPBar.tsx`
- `src/components/rpg/ParticleField.tsx`
- `src/components/rpg/QuestCompleteOverlay.tsx`
- `src/lib/rpg/ranks.ts` (tier thresholds + helpers)
- `src/lib/rpg/worlds.ts` (subject → world mapping)
- `src/lib/rpg/dungeons.ts` (chapter → dungeon naming)
- `src/routes/app.profile.tsx`

**Files to edit (presentation only):**
- `src/styles.css` — tokens, fonts, utilities, keyframes
- `src/routes/__root.tsx` — font links
- `src/routes/app.tsx` — mount HUD, restructure nav
- `src/routes/app.index.tsx` — full redesign
- `src/routes/app.worlds.tsx`, `app.content.tsx`, `app.lectures.tsx`, `app.tests.$testId.tsx`, `app.quests.tsx`, `app.leaderboard.tsx`, `app.talents.tsx`
- `src/components/gamification/RewardPopup.tsx` — particle FX

**Not touched:** any `src/lib/api/*.functions.ts`, attendance logic, leaderboard scoring, RLS, migrations, admin pages.

**Out of scope for Phase 1** (planned for later phases):
- P2: Shadows, Pets, Inventory, Titles catalog, Achievements expansion, Academy Passes
- P3: Guilds, Monthly Seasons, Daily Spin Wheel, Loot Chests
- P4: Boss Battles as distinct entity, Hidden Achievements, Teacher's Choice Badges, Parent Dashboard redesign

After Phase 1 ships and you approve, I'll plan Phase 2.
