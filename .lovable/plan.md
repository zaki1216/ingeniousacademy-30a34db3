# 🏛 Academy Office — Redesign Plan

Transforms the existing admin panel into the **Academy Office**, presenting the same functionality as a Headmaster's command center. **No database changes** — everything reuses existing tables, server functions, and pages.

## Scope

Presentation and navigation only:
- Rename "Admin" → "Academy Office" in nav, headings, page titles
- Reduce sidebar to exactly 6 hubs
- Build a new **Command Center** dashboard (Home)
- Reorganize existing pages under the 6 hubs (no page deleted, no feature lost)
- Redesign the student detail page as **Player Profile**
- Add a **Lumi Manager** UI that edits the existing `src/lib/lumi/knowledge.ts` entries via localStorage overrides (no backend changes)

Out of scope for this pass (existing functionality remains where it lives; can be tackled in follow-ups):
- New "bulk actions" that don't already exist as server fns
- Any new database tables or columns

## 6-Hub Structure

```
🏛 Command Center       /app/admin              → new dashboard
👨‍🎓 Cadets              /app/admin/cadets       → merges Students + Attendance + Passes admin
📚 Academy Content     /app/admin/content      → Subjects/Chapters/Lectures/Notes + Analytics
📝 Assessments         /app/admin/assessment   → Quizzes, Quiz Import, Offline Tests
🎮 Academy Systems     /app/admin/systems      → Gamification, Spin, Talents, Passes rules, Lumi Manager, Announcements
⚙  Academy Settings    /app/admin/settings     → Existing settings
```

Old routes stay reachable (redirected/aliased) so nothing breaks; sidebar surfaces only the 6 hubs.

## Command Center (new)

New route `src/routes/app.admin.index.tsx` (replaces the current admin landing). Sections:

- **Live pulse row**: Today's Attendance %, Students Online (best-effort from recent activity), Active Quests (in-progress lecture count), Pending Pass Requests, Pending Quiz Reviews, Upcoming Offline Tests, Season Progress
- **Quick Actions**: Create Lecture · Upload Notes · Create Quiz · Add Offline Test · Approve Pass · Send Announcement (each links to the relevant hub in a pre-opened state via search params)
- **Today's Top Cadets**: reuses `getLeaderboard` (weekly)
- **Recently Earned Badges**: reuses `user_achievements` recent rows
- Cinematic Headmaster header with academy banner, golden lighting, floating particles

## Cadets Hub

New wrapper page `app.admin.cadets.tsx` with tabs that mount the existing student list, attendance table, and passes admin. Clicking a Cadet opens the existing `app.admin.students.$id.tsx` — this page gets a **Player Profile** redesign:
- Hero header: avatar, level, XP bar, Hunter Rank, Scholar Rank, title, badge count
- Sections: Attendance & Streak · Dungeon Progress · Achievements/Badges/Titles · Passes · Inventory · Shadows · Pets · Arena Stats · Offline Test Results
- **Headmaster Actions** side panel using existing server fns: Give/Remove Coins & XP, Grant/Revoke Pass, Award Badge/Title, Unlock Shadow/Pet, Reset Quest/Chapter, Unlock/Lock Dungeon/Lecture (only wire the actions whose server fns already exist; the rest render as disabled with a "Coming soon" tag rather than throwing)

## Academy Content Hub

Wrapper on top of the existing content admin, showing the Subject → Chapter → Lecture → Quiz → Boss hierarchy in a single tree UI. Reuses existing CRUD server fns. Lecture Analytics tab reuses `admin.lecture-views.tsx`.

## Assessments Hub

Tabs for: Lecture Quizzes (existing), Quiz Import (existing), Offline Tests (existing). Adds a small "Question Analytics" card panel that reuses whatever question-stats data is already computed; if none exists it shows an empty state (no new backend work).

## Academy Systems Hub

Tabs for: Coins/XP rules · Passes · Titles/Badges · Shadows/Pets · Spin · Season Rewards · Merchant Items · **Lumi Manager** · **Announcements**.

- **Lumi Manager** (new UI, local-only): lists entries from `src/lib/lumi/knowledge.ts`, lets admin edit dialogue overrides stored in `localStorage` (namespaced key), and the `LumiProvider` reads overrides on top of the static knowledge base. Preview mode renders the message in a Lumi bubble.
- **Announcements**: renames existing announcements admin, adds a category dropdown (General/Events/Season/Urgent/Maintenance) stored in the existing announcements table's existing text column — no schema change.

## Academy Settings Hub

Existing settings page, rebranded and reorganized into collapsible sections (Classes, Subjects, Academic Year, Ranks, Coin Rules, XP Rules, Pass Rules, Quiz Rules, Season Settings, Reward Rules). Values that are already configurable stay configurable; values that were hard-coded remain hard-coded and are marked "Read-only" rather than adding new persistence.

## Visual Language

- Golden/marble Headmaster theme on `/app/admin/*` (matches Hall of Fame)
- Sidebar reduced to 6 items with icon + label; collapsible on mobile
- Every hub page has a header banner + Lumi whisper describing its purpose
- All existing shadcn primitives; framer-motion for entrance animations only

## Files

**New:**
- `src/routes/app.admin.index.tsx` (Command Center)
- `src/routes/app.admin.cadets.tsx` (wrapper hub)
- `src/routes/app.admin.systems.tsx` (wrapper hub)
- `src/components/admin/HeadmasterHeader.tsx`
- `src/components/admin/LumiManager.tsx`
- `src/lib/lumi/overrides.ts` (localStorage override layer)

**Edited:**
- `src/routes/app.tsx` (sidebar labels/order, brand string "Academy Office")
- `src/routes/app.admin.students.$id.tsx` (Player Profile redesign + Headmaster Actions panel)
- `src/routes/app.admin.content.tsx` (hierarchy tree layout)
- `src/routes/app.admin.assessment.tsx` (tabs wrapper for quizzes/import/offline)
- `src/routes/app.admin.settings.tsx` (grouped sections)
- `src/lib/lumi/LumiProvider.tsx` (apply overrides)

No files deleted. All existing admin routes remain accessible.

## Non-goals / assumptions

- If a Headmaster action (e.g. "Reset Chapter") has no existing server fn, it renders disabled with a tooltip — I will not invent new backend endpoints in this pass.
- Season/Rank/Pass rule editing surfaces only what's already writable via existing tables/policies.
- No changes to student-facing routes.
