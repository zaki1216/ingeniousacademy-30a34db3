
# Academy Campus Experience

Replace the student's dashboard-based home with a cinematic intro + illustrated campus map. Zero backend/auth/quiz/coin/XP changes — pure frontend redesign of the student entry flow and primary navigation.

## Scope guardrails

- No changes to server functions, DB, auth, quizzes, coins, or XP logic.
- Admins keep their current dashboard + sidebar untouched.
- All existing pages (`/app/journey`, `/app/pvp`, `/app/shop`, `/app/profile`, etc.) remain unchanged — only how students reach them changes.

## 1. Intro Sequence (`/app/welcome`)

New route `src/routes/app.welcome.tsx`, shown once per session after login before the campus.

- Full-screen dark magical background: animated gradient + drifting particle/spark effect (framer-motion + CSS, no external libs).
- Ingenious Academy logo (existing `ingenious-logo.webp` asset) with soft glow.
- Sequenced fade-in text (framer-motion `AnimatePresence`, ~1.6s per line):
  1. "Welcome to Ingenious Academy"
  2. "Every Lecture is a Quest"
  3. "Every Chapter is a Dungeon"
  4. "Every Test is a Boss Battle"
  5. "Your adventure begins now."
- Large glowing "ENTER CAMPUS" button appears after the final line.
- Click → set `sessionStorage.campusIntroSeen = "1"` and navigate to `/app`.
- A "Skip intro" link in the corner for repeat visits.

## 2. Campus Home (`/app/`) — student view rewrite

Rewrite the `StudentDashboard` component inside `src/routes/app.index.tsx` (admin branch preserved as-is). The old dashboard cards (Today's Quests, Active Bonuses, Daily Chest, Continue Adventure, Quick travel grid, Worlds, badges, announcements) are removed from the home. Those features remain accessible via their own routes.

- On mount: if `sessionStorage.campusIntroSeen !== "1"`, redirect to `/app/welcome`.
- Renders a stylized campus map (CSS + SVG, no image asset required):
  - Layered background: sky gradient, distant mountains (SVG), grass field, curved dirt pathway connecting buildings, animated trees/lanterns/banners, drifting particles.
  - 7 building "cards" positioned at map-like coordinates (absolute % positions on desktop, responsive stacked grid on mobile):
    - 🏫 Mathematics Building → `/app/journey` (filter/anchor optional, no route change)
    - 🧪 Science Laboratory → `/app/journey`
    - 📚 Language Library → `/app/journey`
    - ⚔ Arena Coliseum → `/app/pvp`
    - 🛒 Merchant Shop → `/app/shop`
    - 🏆 Hall of Fame → `/app/leaderboard`
    - 🏠 Residence → `/app/profile`
  - Each building = illustrated emoji + gradient card + name banner. `whileHover` scale/glow, `whileTap` press animation.
- Player avatar sprite at the Academy Gate (bottom-center). On building click, framer-motion animates the avatar `x/y` toward that building over ~700ms, then navigates.

Since Mathematics/Science/Library all lead to Journey today, the plan keeps them all pointing to `/app/journey` for now (no route/backend change); each building visual remains distinct so the campus reads correctly.

## 3. Fixed Player Status Bar (top)

The existing `PlayerStatusBar` already shows avatar/name/level/XP/coins. Extend it (frontend only, using data it already has) to also render:
- Current Rank badge (existing `RankBadge` component with `rankByTier`)
- Current Streak (already in `stats.streak_days` from `getGamificationDashboard`)

Keep it sticky at top for all student pages (already wired in `src/routes/app.tsx`).

## 4. Navigation model

- Students: campus is home. Bottom tabs (`BottomTabs` in `app.tsx`) and desktop sidebar (`NavLinks`) are kept as secondary/quick-access nav so students aren't stuck if they close a page — but the "Home" tab returns them to the campus map, not a dashboard. No sidebar changes needed beyond that.
- Admins: unchanged.

## 5. Visual style

- Modern fantasy-academy RPG: rich navy/violet night sky, warm torch/lantern glows, gold accents, subtle particle sparkles. Uses existing design tokens (`--gradient-primary`, `glass-card`, `glow-primary`) — no new color hardcoding.
- Framer-motion for entrance, hover, and walk animations. Pure CSS/SVG for the map illustration (no new binary assets required, keeps repo light).

## Files touched

- Add: `src/routes/app.welcome.tsx` (intro sequence)
- Add: `src/components/campus/CampusMap.tsx` (map + buildings + walking avatar)
- Add: `src/components/campus/Building.tsx` (single building card w/ animations)
- Edit: `src/routes/app.index.tsx` — replace `StudentDashboard` body with `<CampusMap />` + intro-redirect guard. Admin branch untouched.
- Edit: `src/components/rpg/PlayerStatusBar.tsx` — add rank badge + streak.

## Technical notes

- Intro gating via `sessionStorage` so it plays once per browser session; a "Replay intro" link can be added later.
- No new packages; framer-motion and lucide-react already present.
- Building → route mapping is a static map in `CampusMap.tsx`; easy to remap later without backend work.
