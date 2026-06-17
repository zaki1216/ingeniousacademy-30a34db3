import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Trophy, Crown, CalendarCheck, Flame, Medal, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboard } from "@/lib/api/gamification.functions";
import { getAttendanceLeaderboard } from "@/lib/api/attendance.functions";
import { cn } from "@/lib/utils";
import { rankFromLevel } from "@/lib/rpg/ranks";
import { RankBadge } from "@/components/rpg/RankBadge";

export const Route = createFileRoute("/app/leaderboard")({ component: LeaderboardPage });

function LeaderboardPage() {
  const [mode, setMode] = useState<"xp" | "attendance">("xp");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");

  const xpFn = useServerFn(getLeaderboard);
  const attFn = useServerFn(getAttendanceLeaderboard);

  const xpQ = useQuery({
    queryKey: ["leaderboard", "xp", period],
    queryFn: () => xpFn({ data: { period } }),
    enabled: mode === "xp",
  });

  const attQ = useQuery({
    queryKey: ["leaderboard", "attendance"],
    queryFn: () => attFn(),
    enabled: mode === "attendance",
  });

  const q = mode === "xp" ? xpQ : attQ;
  const rows = q.data?.rows ?? [];
  const myRank = q.data?.myRank ?? null;

  // Neighbors (one rank above / below) — pure presentation derived from rows.
  const { me, above, below, growthMsg } = useMemo(() => {
    const me = rows.find((r: any) => r.isMe);
    const above = me ? rows.find((r: any) => r.rank === me.rank - 1) : undefined;
    const below = me ? rows.find((r: any) => r.rank === me.rank + 1) : undefined;
    let growthMsg = "";
    if (mode === "xp" && me) {
      const diff = above ? above.xp - me.xp : 0;
      if (period === "weekly") {
        growthMsg = diff > 0
          ? `Earn ${diff.toLocaleString()} more XP this week to overtake #${above.rank}.`
          : `You're holding the top of your bracket — keep it up this week!`;
      } else if (period === "monthly") {
        growthMsg = diff > 0
          ? `${diff.toLocaleString()} XP separates you from #${above.rank} this month.`
          : `Apex of the month so far. Defend your throne.`;
      } else {
        growthMsg = diff > 0
          ? `${diff.toLocaleString()} all-time XP to climb to #${above.rank}.`
          : `Legendary all-time placement.`;
      }
    }
    return { me, above, below, growthMsg };
  }, [rows, mode, period]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-orbitron flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "xp"
            ? (period === "all" ? "Hunters of your class — all-time XP." : `Hunters of your class — ${period === "weekly" ? "weekly" : "monthly"} XP.`)
            : "Hunters of your class — attendance honor roll."}
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="xp">XP Rank</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Rank</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "xp" && (
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="all">All-time</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Personal context card: rank above / me / rank below + growth message */}
      {mode === "xp" && me && (
        <Card className="rune-border bg-[image:radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_60%)]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-orbitron uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Your bracket
            </div>
            <NeighborRow label="ABOVE" row={above} icon={<ArrowUp className="h-3 w-3" />} tone="up" />
            <NeighborRow label="YOU"   row={me}    highlight />
            <NeighborRow label="BELOW" row={below} icon={<ArrowDown className="h-3 w-3" />} tone="down" />
            {growthMsg && (
              <div className="text-xs text-muted-foreground border-t pt-2 leading-relaxed">
                {growthMsg}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {q.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {rows.length === 0 && !q.isLoading && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No data yet.</CardContent></Card>
      )}

      {mode === "xp" ? (
        <div className="space-y-2">
          {rows.map((r: any) => {
            const tier = rankFromLevel(r.level ?? 1);
            return (
              <Card key={r.user_id} className={cn(r.isMe && "border-primary ring-1 ring-primary monarch-glow")}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center font-bold font-orbitron shrink-0",
                    r.rank === 1 && "bg-amber-500/15 text-amber-500",
                    r.rank === 2 && "bg-slate-400/20 text-slate-300",
                    r.rank === 3 && "bg-orange-500/15 text-orange-500",
                    r.rank > 3 && "bg-muted text-muted-foreground",
                  )}>
                    {r.rank === 1 ? <Crown className="h-5 w-5" /> : `#${r.rank}`}
                  </div>
                  <RankBadge tier={tier.tier} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate flex items-center gap-2">
                      {r.name}
                      {r.isMe && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">YOU</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {tier.label} · Lv {r.level}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-orbitron">{r.xp.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">XP</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r: any) => (
            <Card key={r.user_id} className={cn(r.isMe && "border-primary ring-1 ring-primary")}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center font-bold font-orbitron shrink-0",
                  r.rank === 1 && "bg-amber-500/15 text-amber-500",
                  r.rank === 2 && "bg-slate-400/20 text-slate-300",
                  r.rank === 3 && "bg-orange-500/15 text-orange-500",
                  r.rank > 3 && "bg-muted text-muted-foreground",
                )}>
                  {r.rank === 1 ? <Crown className="h-5 w-5" /> : `#${r.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {r.name}
                    {r.isMe && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">YOU</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="h-3 w-3 text-green-500" /> {r.present}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" /> {r.currentStreak}d
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Medal className="h-3 w-3 text-amber-500" /> {r.percentage}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-orbitron">{r.present}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Present</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {myRank && myRank > 50 && (
        <p className="text-xs text-center text-muted-foreground">Your rank: #{myRank}</p>
      )}
    </div>
  );
}

function NeighborRow({
  label,
  row,
  icon,
  tone,
  highlight,
}: {
  label: string;
  row: any;
  icon?: React.ReactNode;
  tone?: "up" | "down";
  highlight?: boolean;
}) {
  if (!row) {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
        <span className="w-12 font-orbitron tracking-wider">{label}</span>
        <span>— none —</span>
      </div>
    );
  }
  const tier = rankFromLevel(row.level ?? 1);
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg p-2",
      highlight && "bg-primary/10 ring-1 ring-primary/40",
    )}>
      <span className={cn(
        "w-12 text-[10px] font-orbitron tracking-wider flex items-center gap-1",
        tone === "up" && "text-emerald-400",
        tone === "down" && "text-rose-400",
        highlight && "text-primary",
      )}>
        {icon}{label}
      </span>
      <span className="font-orbitron text-sm text-muted-foreground w-8">#{row.rank}</span>
      <RankBadge tier={tier.tier} size="sm" />
      <span className="flex-1 min-w-0 truncate text-sm font-semibold">{row.name}</span>
      <span className="text-sm font-bold font-orbitron tabular-nums">{row.xp?.toLocaleString?.() ?? row.xp}</span>
    </div>
  );
}
