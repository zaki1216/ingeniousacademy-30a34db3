import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  Coins,
  Flame,
  KeyRound,
  LogOut,
  Play,
  Settings,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { levelProgress } from "@/lib/gamification/leveling";
import { rankFromLevel } from "@/lib/rpg/ranks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type MapNode = {
  id: string;
  label: string;
  to: string;
  x: number;
  y: number;
  color: string;
};

const MAP_NODES: MapNode[] = [
  { id: "home", label: "Courtyard", to: "/app", x: 50, y: 82, color: "#f59e0b" },
  { id: "journey", label: "Journey", to: "/app/journey", x: 50, y: 42, color: "#22d3ee" },
  { id: "arena", label: "Arena", to: "/app/pvp", x: 22, y: 60, color: "#f97316" },
  { id: "shop", label: "Merchant", to: "/app/shop", x: 50, y: 55, color: "#c084fc" },
  { id: "hall", label: "Hall of Fame", to: "/app/leaderboard", x: 78, y: 60, color: "#fcd34d" },
  { id: "residence", label: "Residence", to: "/app/profile", x: 78, y: 30, color: "#a78bfa" },
  { id: "library", label: "Library", to: "/app/content", x: 22, y: 30, color: "#38bdf8" },
];

function useCurrentNode(path: string): string {
  return useMemo(() => {
    const match = MAP_NODES.slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) => (n.to === "/app" ? path === "/app" : path === n.to || path.startsWith(n.to + "/")));
    return match?.id ?? "home";
  }, [path]);
}

/* -------------------------------- Player HUD ------------------------------- */
export function PlayerHUD() {
  const { user } = useAuth();
  const getDash = useServerFn(getGamificationDashboard);

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDash(),
    staleTime: 30_000,
  });

  const profile = useQuery({
    queryKey: ["profile-cosmetics", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("name, equipped_avatar, equipped_frame, equipped_title")
          .eq("id", user!.id)
          .maybeSingle()
      ).data,
    staleTime: 60_000,
  });

  const stats = dash.data?.stats;
  const p = stats ? levelProgress(stats.xp) : null;
  const rank = stats ? rankFromLevel(stats.level) : null;
  const avatar = (profile.data?.equipped_avatar as string) || "🧑‍🎓";
  const title = (profile.data?.equipped_title as string) || rank?.label || "Cadet";
  const name = profile.data?.name || "Cadet";

  return (
    <Link
      to="/app/profile"
      className="pointer-events-auto group flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-xl px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-[0_10px_40px_-15px_rgba(251,191,36,0.5)] hover:border-amber-300/60 transition"
      style={{ maxWidth: 260 }}
    >
      {/* Portrait */}
      <div className="relative shrink-0">
        <div
          className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl p-[2px]"
          style={{ background: rank?.gradient ?? "linear-gradient(135deg,#78350f,#f59e0b)" }}
        >
          <div className="h-full w-full rounded-[10px] bg-black/80 grid place-items-center text-lg sm:text-2xl">
            {avatar}
          </div>
        </div>
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-4 sm:h-5 min-w-[22px] sm:min-w-[26px] px-1 rounded-md text-[9px] sm:text-[10px] font-black grid place-items-center text-white ring-2 ring-black/80"
          style={{
            background: rank?.gradient ?? "#f59e0b",
            boxShadow: `0 0 10px ${rank?.glow ?? "rgba(251,191,36,0.6)"}`,
          }}
        >
          {stats?.level ?? "—"}
        </div>
      </div>

      {/* Stats — condensed on mobile */}
      <div className="min-w-0 flex-1 hidden xs:block sm:block">
        <div
          className="text-[9px] font-bold tracking-[0.22em] uppercase truncate leading-none"
          style={{ color: rank?.color ?? "#fbbf24", fontFamily: "'Cinzel', serif" }}
        >
          {title}
        </div>
        <div className="text-xs sm:text-sm font-extrabold text-amber-50 leading-tight truncate">{name}</div>
        <div className="mt-1 hidden sm:flex items-center justify-between text-[9px] font-bold text-amber-200/70">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />
            XP {p?.xpIntoLevel ?? 0}/{p?.xpForNextLevel ?? "—"}
          </span>
        </div>
        <div className="mt-1 h-1 sm:h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: "linear-gradient(90deg,#fde68a,#f59e0b,#7c2d12)" }}
            initial={{ width: 0 }}
            animate={{ width: `${p?.progressPct ?? 0}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------- Resource HUD ------------------------------ */
function ResourceChip({
  icon,
  value,
  glow,
}: {
  icon: React.ReactNode;
  value: string;
  glow: string;
}) {
  return (
    <div
      className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 bg-black/55 border border-white/10 backdrop-blur-xl text-xs font-bold text-amber-50"
      style={{ boxShadow: `inset 0 0 10px ${glow}` }}
    >
      {icon}
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function ResourceHUD({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const getDash = useServerFn(getGamificationDashboard);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDash(),
    staleTime: 30_000,
  });
  const stats = dash.data?.stats;

  return (
    <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5">
      <ResourceChip
        icon={<Coins className="h-3.5 w-3.5 text-amber-300" />}
        value={stats ? stats.coins.toLocaleString() : "—"}
        glow="rgba(251,191,36,0.25)"
      />
      <ResourceChip
        icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
        value={`${stats?.streak_days ?? 0}`}
        glow="rgba(251,146,60,0.25)"
      />
      <div className="hidden sm:block">
        <ResourceChip
          icon={<KeyRound className="h-3.5 w-3.5 text-slate-200" />}
          value="0"
          glow="rgba(148,163,184,0.2)"
        />
      </div>
      <button
        className="h-8 w-8 rounded-lg flex items-center justify-center bg-black/55 border border-white/10 backdrop-blur-xl text-amber-100/80 hover:text-amber-100 hover:border-amber-400/40"
        aria-label="Notifications"
      >
        <Bell className="h-3.5 w-3.5" />
      </button>
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetTrigger asChild>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center bg-black/55 border border-white/10 backdrop-blur-xl text-amber-100/80 hover:text-amber-100 hover:border-amber-400/40"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="bg-[#0a0616]/95 backdrop-blur-2xl border-amber-400/20 text-amber-50">
          <div className="pt-6 space-y-4">
            <div>
              <h3
                className="text-lg font-black tracking-[0.2em] bg-gradient-to-b from-amber-100 to-amber-500 bg-clip-text text-transparent"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                CADET MENU
              </h3>
              <p className="text-xs text-amber-200/60 mt-1">Manage your Academy presence.</p>
            </div>
            <div className="space-y-2">
              <Link
                to="/app/settings"
                onClick={() => setSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                <Settings className="h-4 w-4 text-amber-300" /> Settings
              </Link>
              <Link
                to="/app/guidebook"
                onClick={() => setSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                <Sparkles className="h-4 w-4 text-indigo-300" /> Guidebook
              </Link>
              <Link
                to="/app/notes"
                onClick={() => setSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                <Bell className="h-4 w-4 text-cyan-300" /> Notes
              </Link>
              <Link
                to="/app/announcements"
                onClick={() => setSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                <Bell className="h-4 w-4 text-rose-300" /> Announcements
              </Link>
            </div>
            <div className="pt-3 border-t border-white/10">
              <Button
                variant="outline"
                className="w-full border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" /> Leave the Academy
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* --------------------------------- Minimap --------------------------------- */
export function Minimap() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = useCurrentNode(path);

  return (
    <div className="pointer-events-auto relative rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-xl p-2 shadow-[0_10px_40px_-15px_rgba(251,191,36,0.4)]">
      <div className="absolute -top-2 left-3 px-1.5 py-0.5 rounded text-[8px] font-black tracking-[0.25em] text-amber-200 bg-black/70 border border-amber-400/30" style={{ fontFamily: "'Cinzel', serif" }}>
        MAP
      </div>
      <svg viewBox="0 0 100 100" className="w-40 h-28 md:w-52 md:h-36">
        <defs>
          <radialGradient id="mm-bg" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#050214" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#mm-bg)" rx="6" />
        {/* Path lines */}
        <path
          d="M50,82 L50,55 L22,60 M50,55 L78,60 M50,55 L50,42 M22,30 L50,42 L78,30"
          stroke="rgba(251,191,36,0.25)"
          strokeWidth="0.6"
          strokeDasharray="1.2 1.2"
          fill="none"
        />
        {MAP_NODES.map((n) => {
          const active = n.id === current;
          return (
            <g
              key={n.id}
              onClick={() => navigate({ to: n.to as never })}
              className="cursor-pointer"
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={active ? 3.6 : 2.4}
                fill={n.color}
                opacity={active ? 1 : 0.75}
              >
                {active && (
                  <animate attributeName="r" values="3.6;4.6;3.6" dur="2s" repeatCount="indefinite" />
                )}
              </circle>
              {active && (
                <text
                  x={n.x}
                  y={n.y - 5}
                  textAnchor="middle"
                  fontSize="4"
                  fontWeight="900"
                  fill="#fef3c7"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {n.label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------ Adventure Bar ------------------------------ */
export function AdventureBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Hide on world/home to keep it uncluttered
  if (path === "/app") return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-black/70 to-black/85 backdrop-blur-xl px-4 py-2.5 shadow-[0_20px_60px_-20px_rgba(251,191,36,0.5)]"
    >
      <div className="hidden sm:block">
        <div className="text-[9px] font-black tracking-[0.3em] text-amber-300/80" style={{ fontFamily: "'Cinzel', serif" }}>
          CURRENT ADVENTURE
        </div>
        <div className="text-sm font-extrabold text-amber-50 leading-tight">Continue your Journey</div>
      </div>
      <div className="hidden md:block h-1 w-32 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-[62%] bg-gradient-to-r from-amber-300 to-amber-600" />
      </div>
      <Link
        to="/app/journey"
        className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs tracking-[0.18em] text-amber-950 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 hover:brightness-110 shadow-[0_0_30px_-6px_rgba(251,191,36,0.7)]"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        <Play className="h-3.5 w-3.5 fill-current" /> CONTINUE
      </Link>
    </motion.div>
  );
}

/* --------------------------------- Layout ---------------------------------- */
export function AcademyHUD({
  children,
  onSignOut,
}: {
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isWorld = path === "/app";

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Ambient world backdrop always behind chrome */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(88,28,135,0.5), transparent 50%), radial-gradient(circle at 80% 90%, rgba(120,53,15,0.45), transparent 55%), linear-gradient(180deg,#050214 0%, #0a0820 50%, #150a1a 100%)",
        }}
      />
      <FloatingParticles />

      {/* Content area */}
      <main
        className={cn(
          "relative min-h-screen w-full",
          isWorld
            ? "pt-20 pb-24 px-3"
            : "pt-24 pb-32 px-3 md:px-6 max-w-6xl mx-auto",
        )}
      >
        {children}
      </main>

      {/* HUD overlays — fixed to viewport */}
      <div className="fixed top-2 left-2 sm:top-3 sm:left-3 z-40 pointer-events-none max-w-[70vw]">
        <PlayerHUD />
      </div>
      <div className="fixed top-2 right-2 sm:top-3 sm:right-3 z-40 flex flex-col items-end gap-2 pointer-events-none">
        <ResourceHUD onSignOut={onSignOut} />
        <div className="hidden md:block">
          <Minimap />
        </div>
      </div>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <AdventureBar />
      </div>
    </div>
  );
}

function FloatingParticles() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => {
        const left = (i * 53) % 100;
        const dur = 8 + ((i * 5) % 10);
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-200/60"
            style={{
              left: `${left}%`,
              boxShadow: "0 0 8px rgba(253,224,71,0.7)",
            }}
            initial={{ y: "110vh", opacity: 0 }}
            animate={{ y: "-10vh", opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay: (i * 0.6) % 6, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

/* Re-export a stub to silence unused imports if needed */
export const _hidden = X;
