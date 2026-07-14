
# Cinematic Academy Entry Experience

Redesigns only the path from opening the app to landing in `/app`. Authentication, backend, and in-app routes are untouched — only presentation.

## Flow

```text
Open app  →  Splash (2s)  →  Story Intro (skippable)  →  Academy Gate
             →  Registration (student) / Headmaster Auth (admin)
             →  Loading Sequence with Lumi tips  →  Fade into /app
```

## New / edited files

**New**
- `src/components/entry/EntryStage.tsx` — full-screen dark stage with particle field, moving cloud layer, warm vignette. Wraps every entry step so transitions share one background.
- `src/components/entry/ParticleField.tsx` — reusable CSS/framer particle layer (perf-capped, respects `prefers-reduced-motion`).
- `src/components/entry/SplashScene.tsx` — emblem + "INGENIOUS ACADEMY / The Academy of Endless Learning", 2s auto-advance.
- `src/components/entry/StoryIntroScene.tsx` — 5 sentences fade in sequentially, "Skip" button top-right, "Continue" once complete.
- `src/components/entry/AcademyGateScene.tsx` — SVG stone gate with two doors, banners, torches, trees, clouds; "ENTER THE ACADEMY" CTA; on click animates doors opening + camera-push (scale + brightness) then advances.
- `src/components/entry/RegistrationScene.tsx` — student registration form (email + password fields relabeled "Academy ID" + "Password"), Lumi orb + speech bubble; primary CTA "ENTER THE ACADEMY". Reuses the exact `supabase.auth.signInWithPassword` + `is_active` logic from current `login.tsx`.
- `src/components/entry/HeadmasterAuthScene.tsx` — admin variant: marble/gold Academy Office aesthetic, no student artwork, primary CTA "ENTER THE ACADEMY OFFICE". Same auth call.
- `src/components/entry/LoadingScene.tsx` — floating Lumi (`LumiAvatar` size xl) + rotating tip carousel (5 tips from the brief), animated arcane ring progress. Duration ~2.2s then camera-push fade into `/app`.
- `src/components/entry/GateTransition.tsx` — shared "camera moves through gate" transition (scale/blur/fade) used before Registration and before /app.
- `src/lib/entry/tips.ts` — array of loading tips (extensible).
- `src/lib/entry/sfx.ts` — no-op stubs `playSfx('gate-open' | 'click' | 'chime' | 'success' | 'loading')` so future audio hooks land in one place.
- `src/lib/entry/useEntryFlow.ts` — small state machine hook: `splash → story → gate → auth → loading → done`. Session-scoped `sessionStorage` flag (`entry.seen.v1`) so a returning tab with a fresh page load still gets a short version (skips straight to gate). Full flow always shown when logged out and no flag.

**Edited**
- `src/routes/login.tsx` — replace body with `<EntryFlow initialMode="student" />`. Keep `beforeLoad` (session/setup redirects) and auth call — logic imported from a small `useAcademyLogin` hook in the same file. Mode toggle becomes two crest tabs: "Cadet" / "Headmaster".
- `src/routes/index.tsx` — unchanged (still redirects to `/login` or `/app`), but `/login` now hosts the whole cinematic entry.
- `src/styles.css` — add font import for a premium display face (Cinzel for the emblem/gate signage) via `<link>` in `__root.tsx` head (per Tailwind v4 rules), plus tokens: `--gate-stone`, `--gate-gold`, `--gate-glow`, `--gate-torch`, `--academy-marble`, `--academy-office-gold`. Reused by all entry scenes; no in-app tokens changed.
- `src/routes/__root.tsx` — add Google Fonts `<link>` for Cinzel + existing body font. No layout change.

## Behavior details

- **Splash**: emblem uses existing `ingenious-logo.webp` asset with a golden glow ring; 2s fixed, no skip needed.
- **Story Intro**: staggered fade (0.9s per line, 0.6s hold), "Skip" and (after last line) "Continue" both advance. `prefers-reduced-motion` collapses to a single static block with Continue.
- **Academy Gate**: rendered as inline SVG (stone arch, two door panels, banners, hanging lanterns) layered over particle/cloud stage. Framer variants animate door hinges opening `rotateY(±80deg)` + scale on the "camera" wrapper, then triggers `onEntered`.
- **Registration**: form validates same as today, on success runs the Loading scene before `navigate({ to: "/app" })`. Errors show inline via `toast` (current pattern) and stay on the form.
- **Headmaster Auth**: same auth call, different theme wrapper (`bg-academy-marble` gradient, gold accents, no forest/gate imagery). Chosen via top tab; deep link `/login?mode=admin` also selects it.
- **Loading**: shown regardless of role. Cycles 5 tips every ~1.1s, minimum on-screen time 2s so the sequence is felt but never blocks a slow login (auth already resolved before entering it).
- **Transition to /app**: uses `GateTransition` — a fixed overlay that scales + fades over 700ms, then `navigate({ to: "/app" })`. Overlay unmounts on next route.
- **Session behavior**: first visit shows full sequence. `sessionStorage['entry.seen.v1']` set after Story completes; subsequent reloads in same tab jump to Gate. Logout clears it.

## Preserved

- `supabase.auth.signInWithPassword`, `is_active` check, forgot-password link, setup redirect, `beforeLoad` gates — all identical.
- `/reset-password`, `/forgot-password`, `/setup` routes untouched.
- All `/app/*` routes and Lumi provider untouched.

## Performance / a11y

- Particle count capped at 24 on mobile (matchMedia `(max-width: 640px)`), 48 on desktop.
- `prefers-reduced-motion`: disables particle motion, gate door animation (fades instead), and story stagger.
- Fonts loaded via `<link rel="preload">` to avoid FOUT on the emblem.
- All scenes are single-column, keyboard-navigable, focus lands on primary CTA on scene enter.

## Out of scope

- No audio playback (only stub hooks).
- No changes to in-app UI, no new backend, no schema changes.
- No new dependencies — reuses framer-motion, existing shadcn components, existing `LumiAvatar`.
