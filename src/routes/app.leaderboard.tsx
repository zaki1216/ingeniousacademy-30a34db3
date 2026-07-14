import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Crown, CalendarCheck, Flame, Medal, Sparkles, TrendingUp,
  Swords, Coins, Award, Lock, Star, ShieldCheck, ArrowUp, ArrowDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getLeaderboard } from "@/lib/api/gamification.functions";
import { getAttendanceLeaderboard } from "@/lib/api/attendance.functions";
import { getScholarLeaderboard } from "@/lib/api/academic.functions";
import { cn } from "@/lib/utils";
import { rankFromLevel } from "@/lib/rpg/ranks";
import { RankBadge } from "@/components/rpg/RankBadge";

export const Route = createFileRoute("/app/leaderboard")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Ingenious Academy" },
      { name: "description", content: "The prestigious Hall of Fame — where the greatest Cadets of Ingenious Academy are honoured." },
    ],
  }),
  component: HallOfFamePage,
});

type HallId = "hunter" | "scholar" | "consistency" | "arena" | "wealth" | "achievement";

const HALLS: Array<{
  id: HallId;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  lumi: string;
  accent: string;
  glow: string;
  available: boolean;
}> = [
  {
    id: "hunter", name: "Hunter Rankings",
    icon: <Swords className="h-4 w-4" />,
    tagline: "Warriors of experience — measured in XP earned.",
    lumi: "This hall celebrates Cadets whose relentless practice has forged them into elite hunters.",
    accent: "from-amber-500/25 via-amber-500/10 to-transparent",
    glow: "#fbbf24", available: true,
  },
  {
    id: "scholar", name: "Scholar Rankings",
    icon: <Award className="h-4 w-4" />,
    tagline: "Masters of the offline examinations.",
    lumi: "This hall honours those who mastered their offline examinations with unwavering focus.",
    accent: "from-sky-400/25 via-sky-400/10 to-transparent",
    glow: "#38bdf8", available: true,
  },
  {
    id: "consistency", name: "Consistency",
    icon: <Flame className="h-4 w-4" />,
    tagline: "Highest attendance & longest streaks.",
    lumi: "This hall celebrates Cadets who never miss an opportunity to learn.",
    accent: "from-orange-500/25 via-orange-500/10 to-transparent",
    glow: "#fb923c", available: true,
  },
  {
    id: "arena", name: "Arena Champions",
    icon: <ShieldCheck className="h-4 w-4" />,
    tagline: "Duel victors and season champions.",
    lumi: "The gates of the Arena Hall open soon — sharpen your blade, Cadet.",
    accent: "from-rose-500/25 via-rose-500/10 to-transparent",
    glow: "#fb7185", available: false,
  },
  {
    id: "wealth", name: "Wealth",
    icon: <Coins className="h-4 w-4" />,
    tagline: "Coins hoarded, treasures collected.",
    lumi: "Fortune favours the diligent. This vault will soon reveal the Academy's wealthiest Cadets.",
    accent: "from-yellow-400/25 via-yellow-400/10 to-transparent",
    glow: "#facc15", available: false,
  },
  {
    id: "achievement", name: "Achievements",
    icon: <Medal className="h-4 w-4" />,
    tagline: "Badges, titles and rare collections.",
    lumi: "Every trophy tells a story. This hall will chronicle the Academy's most decorated Cadets.",
    accent: "from-violet-400/25 via-violet-400/10 to-transparent",
    glow: "#a78bfa", available: false,
  },
];

function HallOfFamePage() {
  const [hall, setHall] = useState<HallId>("hunter");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");

  const xpFn = useServerFn(getLeaderboard);
  const attFn = useServerFn(getAttendanceLeaderboard);
  const scholarFn = useServerFn(getScholarLeaderboard);

  const xpQ = useQuery({
    queryKey: ["hof", "hunter", period],
    queryFn: () => xpFn({ data: { period } }),
    enabled: hall === "hunter",
  });
  const attQ = useQuery({
    queryKey: ["hof", "consistency"],
    queryFn: () => attFn(),
    enabled: hall === "consistency",
  });
  const scholarQ = useQuery({
    queryKey: ["hof", "scholar"],
    queryFn: () => scholarFn(),
    enabled: hall === "scholar",
  });

  const q = hall === "hunter" ? xpQ : hall === "consistency" ? attQ : hall === "scholar" ? scholarQ : null;
  const rows: any[] = q?.data?.rows ?? [];
  const active = HALLS.find((h) => h.id === hall)!;

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  const { me, above, growthMsg } = useMemo(() => {
    const meRow = rows.find((r: any) => r.isMe);
    const aboveRow = meRow ? rows.find((r: any) => r.rank === meRow.rank - 1) : undefined;
    let growthMsg = "";
    if (meRow && aboveRow) {
      if (hall === "hunter") {
        const diff = (aboveRow.xp ?? 0) - (meRow.xp ?? 0);
        if (diff > 0) growthMsg = `Only ${diff.toLocaleString()} XP separates you from Rank #${aboveRow.rank}.`;
      } else if (hall === "scholar") {
        const diff = (aboveRow.percentage ?? 0) - (meRow.percentage ?? 0);
        if (diff > 0) growthMsg = `Just ${diff.toFixed(1)}% more to overtake Rank #${aboveRow.rank}.`;
      } else if (hall === "consistency") {
        const diff = (aboveRow.present ?? 0) - (meRow.present ?? 0);
        if (diff > 0) growthMsg = `${diff} more days present to overtake Rank #${aboveRow.rank}.`;
      }
    } else if (meRow && !aboveRow) {
      growthMsg = "You stand at the summit of this hall. Defend your legacy.";
    }
    return { me: meRow, above: aboveRow, growthMsg };
  }, [rows, hall]);

  return (
    <div className="space-y-6 pb-8">
      {/* Cinematic entrance */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-background to-background">
        {/* marble sheen */}
        <div className="absolute inset-0 opacity-40 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(251,191,36,0.25), transparent 60%), radial-gradient(ellipse at bottom, rgba(120,53,15,0.2), transparent 60%)" }} />
        {/* floating particles */}
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-300/70"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -14, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <div className="relative p-6 md:p-8 text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
            className="mx-auto h-16 w-16 md:h-20 md:w-20 rounded-full grid place-items-center bg-gradient-to-br from-amber-400 to-amber-700 shadow-[0_0_40px_-4px_rgba(251,191,36,0.6)]">
            <Trophy className="h-8 w-8 md:h-10 md:w-10 text-amber-950" />
          </motion.div>
          <h1 className="mt-3 text-3xl md:text-4xl font-black font-orbitron tracking-wider bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent">
            Hall of Fame
          </h1>
          <p className="mt-1 text-sm text-amber-200/70 italic max-w-xl mx-auto">
            "Here we honour the greatest Cadets of Ingenious Academy — may their names inspire every hunter who walks these halls."
          </p>
          {/* Banner columns */}
          <div className="mt-4 flex justify-center gap-6 opacity-60">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            <Star className="h-4 w-4 text-amber-400" />
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        </div>
      </div>

      {/* Hall selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {HALLS.map((h) => (
          <button
            key={h.id}
            onClick={() => h.available && setHall(h.id)}
            className={cn(
              "group relative rounded-xl border p-3 text-left transition-all overflow-hidden",
              hall === h.id ? "border-amber-500/70 ring-1 ring-amber-500/40" : "border-border/60 hover:border-amber-500/40",
              !h.available && "opacity-70",
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", h.accent)} />
            <div className="relative flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg grid place-items-center bg-background/60 border border-white/10" style={{ boxShadow: `0 0 12px -2px ${h.glow}` }}>
                {h.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-orbitron uppercase tracking-widest font-bold truncate">{h.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{h.tagline}</div>
              </div>
              {!h.available && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </div>
          </button>
        ))}
      </div>

      {/* Lumi whisper */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-3 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-100/80 italic leading-relaxed">
            <span className="font-orbitron uppercase tracking-wider text-amber-300 not-italic mr-1">Lumi:</span>
            {active.lumi}
          </p>
        </CardContent>
      </Card>

      {!active.available ? (
        <ComingSoonHall name={active.name} />
      ) : hall === "hunter" ? (
        <>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all">All-time</TabsTrigger>
            </TabsList>
          </Tabs>
          <HallBody q={xpQ} rows={rows} podium={podium} rest={rest} me={me} above={above} growthMsg={growthMsg} kind="hunter" />
        </>
      ) : hall === "scholar" ? (
        <HallBody q={scholarQ} rows={rows} podium={podium} rest={rest} me={me} above={above} growthMsg={growthMsg} kind="scholar" />
      ) : (
        <HallBody q={attQ} rows={rows} podium={podium} rest={rest} me={me} above={above} growthMsg={growthMsg} kind="consistency" />
      )}
    </div>
  );
}

function ComingSoonHall({ name }: { name: string }) {
  return (
    <Card className="border-dashed border-amber-500/30">
      <CardContent className="p-8 text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-full grid place-items-center bg-amber-500/10 border border-amber-500/30">
          <Lock className="h-6 w-6 text-amber-400" />
        </div>
        <div className="font-orbitron uppercase tracking-widest text-sm">{name}</div>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The doors to this hall are still being carved. Its trophies will be revealed in a future Season.
        </p>
        <Badge variant="outline" className="border-amber-500/40 text-amber-300">Coming Soon</Badge>
      </CardContent>
    </Card>
  );
}

function HallBody({
  q, rows, podium, rest, me, above, growthMsg, kind,
}: {
  q: any; rows: any[]; podium: any[]; rest: any[];
  me: any; above: any; growthMsg: string;
  kind: "hunter" | "scholar" | "consistency";
}) {
  if (q?.isLoading) return <p className="text-muted-foreground text-sm text-center py-8">Opening the hall…</p>;
  if (rows.length === 0) return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No legends recorded here yet. Be the first.</CardContent></Card>
  );

  return (
    <>
      {/* Podium */}
      {podium.length > 0 && <Podium rows={podium} kind={kind} />}

      {/* Player position */}
      {me && (
        <Card className="border-primary/50 bg-[image:radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_60%)]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-orbitron uppercase tracking-widest text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Your Standing
              </div>
              <Badge variant="outline" className="font-orbitron">#{me.rank}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <StatMini label="Above" value={above ? `#${above.rank}` : "—"} icon={<ArrowUp className="h-3 w-3" />} tone="up" />
              <StatMini label="You" value={`#${me.rank}`} highlight />
              <StatMini label="Below" value={rows.find((r) => r.rank === me.rank + 1) ? `#${me.rank + 1}` : "—"} icon={<ArrowDown className="h-3 w-3" />} tone="down" />
            </div>
            {growthMsg && (
              <div className="text-xs text-amber-200/90 border-t border-amber-500/20 pt-2 flex items-start gap-1.5 leading-relaxed">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{growthMsg}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rest of hall */}
      <div className="space-y-2">
        {rest.map((r) => (
          <RankRow key={r.user_id} row={r} kind={kind} />
        ))}
      </div>
    </>
  );
}

function Podium({ rows, kind }: { rows: any[]; kind: "hunter" | "scholar" | "consistency" }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights = ["h-24", "h-32", "h-20"];
  const medals = ["🥈", "🥇", "🥉"];
  return (
    <div className="grid grid-cols-3 gap-3 items-end">
      {order.map((r, i) => {
        const isFirst = i === 1;
        return (
          <motion.div
            key={r.user_id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="text-2xl mb-1">{medals[i]}</div>
            <div className={cn(
              "rounded-t-xl border border-b-0 px-2 py-2 flex flex-col items-center justify-end",
              heights[i],
              isFirst
                ? "border-amber-400/70 bg-gradient-to-b from-amber-400/30 to-amber-600/10 shadow-[0_0_30px_-4px_rgba(251,191,36,0.5)]"
                : "border-white/10 bg-gradient-to-b from-white/10 to-transparent",
            )}>
              {isFirst && <Crown className="h-5 w-5 text-amber-300 mb-1" />}
              <div className="text-[11px] font-bold font-orbitron truncate w-full">{r.name}</div>
              <div className="text-[10px] text-muted-foreground truncate w-full">
                {kind === "hunter" && `${r.xp?.toLocaleString?.() ?? 0} XP`}
                {kind === "scholar" && `${r.percentage}%`}
                {kind === "consistency" && `${r.present} days`}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RankRow({ row: r, kind }: { row: any; kind: "hunter" | "scholar" | "consistency" }) {
  return (
    <Card className={cn(r.isMe && "border-primary ring-1 ring-primary monarch-glow")}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center font-bold font-orbitron shrink-0 bg-muted text-muted-foreground",
        )}>
          #{r.rank}
        </div>
        {kind === "hunter" && <RankBadge tier={rankFromLevel(r.level ?? 1).tier} size="sm" />}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate flex items-center gap-2">
            {r.name}
            {r.isMe && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">YOU</span>}
          </div>
          {kind === "hunter" && (
            <div className="text-[11px] text-muted-foreground truncate">
              {rankFromLevel(r.level ?? 1).label} · Lv {r.level}
            </div>
          )}
          {kind === "consistency" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3 text-green-500" />{r.present}</span>
              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />{r.currentStreak}d</span>
              <span className="inline-flex items-center gap-1"><Medal className="h-3 w-3 text-amber-500" />{r.percentage}%</span>
            </div>
          )}
          {kind === "scholar" && (
            <div className="text-[11px] text-muted-foreground truncate">Scholar · {r.obtained}/{r.max} marks</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold font-orbitron">
            {kind === "hunter" && r.xp?.toLocaleString?.()}
            {kind === "scholar" && `${r.percentage}%`}
            {kind === "consistency" && r.present}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {kind === "hunter" ? "XP" : kind === "scholar" ? "Score" : "Present"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatMini({ label, value, icon, tone, highlight }: {
  label: string; value: string; icon?: React.ReactNode;
  tone?: "up" | "down"; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-2 border",
      highlight ? "border-primary/50 bg-primary/10" : "border-border/50",
    )}>
      <div className={cn(
        "text-[10px] font-orbitron uppercase tracking-wider flex items-center justify-center gap-1",
        tone === "up" && "text-emerald-400",
        tone === "down" && "text-rose-400",
        highlight && "text-primary",
      )}>
        {icon}{label}
      </div>
      <div className="font-orbitron font-bold text-sm">{value}</div>
    </div>
  );
}
