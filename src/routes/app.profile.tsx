import { lazy, Suspense, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Home, Settings, ShoppingBag } from "lucide-react";

import { AcademySkeleton } from "@/components/academy/AcademyStates";
import { ContinueLearningCard } from "@/components/learning/ContinueLearningCard";
import { DailyMissions } from "@/components/learning/DailyMissions";
import { DailyChestCard } from "@/components/gamification/DailyChestCard";
import { HeroBanner } from "@/components/hero/HeroBanner";
import { AcademyIdentity } from "@/components/hero/AcademyIdentity";
import { HeroSection } from "@/components/hero/HeroSection";
import { ACHIEVEMENTS, BADGES, evaluateAll } from "@/lib/hero/catalog";
import { useHeroProfile } from "@/lib/hero/useHeroProfile";

const CollectionGrid = lazy(() =>
  import("@/components/hero/CollectionGrid").then((m) => ({ default: m.CollectionGrid })),
);
const AcademyStatistics = lazy(() =>
  import("@/components/hero/AcademyStatistics").then((m) => ({ default: m.AcademyStatistics })),
);
const HeroTimeline = lazy(() =>
  import("@/components/hero/HeroTimeline").then((m) => ({ default: m.HeroTimeline })),
);
const HeroShowcase = lazy(() =>
  import("@/components/hero/HeroShowcase").then((m) => ({ default: m.HeroShowcase })),
);

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Hero Profile — Ingenious Academy" },
      {
        name: "description",
        content:
          "Your Academy Hero Profile — rank, level, achievements, badges, statistics and the story of your learning journey.",
      },
      { property: "og:title", content: "Hero Profile — Ingenious Academy" },
      {
        property: "og:description",
        content: "Celebrate every Quest, Dungeon and Master Trial in your Academy journey.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HeroProfilePage,
});

function SectionFallback({ height = "h-32" }: { height?: string }) {
  return <AcademySkeleton className={height} />;
}

function HeroProfilePage() {
  const { data, isLoading } = useHeroProfile();

  const achievements = useMemo(
    () => (data ? evaluateAll(ACHIEVEMENTS, data.stats, data.journey) : []),
    [data],
  );
  const badges = useMemo(() => (data ? evaluateAll(BADGES, data.stats, data.journey) : []), [data]);

  return (
    <div className="relative">
      <HeroAmbience />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-2xl grid place-items-center"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--monarch) 30%, transparent), color-mix(in oklab, var(--rune) 20%, transparent))",
                boxShadow: "0 0 24px color-mix(in oklab, var(--monarch) 30%, transparent)",
              }}
            >
              <Home className="h-5 w-5 text-white/90" />
            </div>
            <div>
              <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
                Your Identity
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Academy Hero Profile
              </h1>
            </div>
          </div>
          <Link
            to="/app/settings"
            className="rune-border holo-card px-3 py-2 text-xs font-bold flex items-center gap-2 hover:monarch-glow transition-all"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>

        {/* 1 — Hero Banner */}
        {isLoading || !data ? (
          <SectionFallback height="h-64" />
        ) : (
          <HeroBanner identity={data.identity} stats={data.stats} />
        )}

        {/* 8 + 9 — Continue Learning & Daily Missions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <ContinueLearningCard variant="hero" />
          </div>
          <DailyMissions />
        </div>

        {/* 2 — Academy Identity */}
        <HeroSection eyebrow="Where you stand" title="Academy Journey">
          {data ? <AcademyIdentity journey={data.journey} /> : <SectionFallback />}
        </HeroSection>

        {/* 3 — Achievement Gallery */}
        <HeroSection
          eyebrow="Milestones"
          title="Achievement Gallery"
          action={
            data && (
              <span className="text-[11px] font-orbitron text-muted-foreground">
                {achievements.filter((a) => a.unlocked).length}/{achievements.length} unlocked
              </span>
            )
          }
        >
          <Suspense fallback={<SectionFallback />}>
            {data ? <CollectionGrid entries={achievements} /> : <SectionFallback />}
          </Suspense>
        </HeroSection>

        {/* 4 — Badge Collection */}
        <HeroSection
          eyebrow="Collection"
          title="Badge Collection"
          action={
            data && (
              <span className="text-[11px] font-orbitron text-muted-foreground">
                {badges.filter((b) => b.unlocked).length}/{badges.length} earned
              </span>
            )
          }
        >
          <Suspense fallback={<SectionFallback />}>
            {data ? <CollectionGrid entries={badges} showRarity /> : <SectionFallback />}
          </Suspense>
        </HeroSection>

        {/* 5 — Academy Statistics */}
        <HeroSection eyebrow="Chronicles" title="Academy Statistics">
          <Suspense fallback={<SectionFallback />}>
            {data ? <AcademyStatistics stats={data.stats} /> : <SectionFallback />}
          </Suspense>
        </HeroSection>

        {/* 6 — Hero Timeline */}
        <HeroSection eyebrow="Your story" title="Hero Timeline" defaultOpen={false}>
          <Suspense fallback={<SectionFallback />}>
            {data ? <HeroTimeline events={data.timeline} /> : <SectionFallback />}
          </Suspense>
        </HeroSection>

        {/* 7 — Hero Showcase (future ready) */}
        <HeroSection eyebrow="Coming soon" title="Hero Showcase" defaultOpen={false}>
          <Suspense fallback={<SectionFallback />}>
            {data ? <HeroShowcase showcase={data.showcase} /> : <SectionFallback />}
          </Suspense>
        </HeroSection>

        {/* Daily reward */}
        <DailyChestCard />

        {/* Quick actions */}
        <HeroSection eyebrow="Quick actions" title="Continue your Journey">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickLink to="/app" icon={<Home className="h-4 w-4" />} label="Academy" />
            <QuickLink
              to="/app/marketplace"
              icon={<ShoppingBag className="h-4 w-4" />}
              label="Marketplace"
            />
            <QuickLink
              to="/app/progress"
              icon={<GraduationCap className="h-4 w-4" />}
              label="Progress"
            />
            <QuickLink to="/app/content" icon={<BookOpen className="h-4 w-4" />} label="Lessons" />
          </div>
        </HeroSection>
      </div>
    </div>
  );
}

function HeroAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, color-mix(in oklab, #f59e0b 22%, transparent), transparent 55%), radial-gradient(ellipse at 100% 100%, color-mix(in oklab, var(--monarch) 30%, transparent), transparent 60%)",
        }}
      />
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="rune-border holo-card flex items-center gap-2 p-3 hover:monarch-glow transition-all text-sm font-bold"
    >
      {icon} {label}
    </Link>
  );
}
