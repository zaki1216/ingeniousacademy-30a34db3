import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trophy, Crown, CalendarCheck, Flame, Medal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboard } from "@/lib/api/gamification.functions";
import { getAttendanceLeaderboard } from "@/lib/api/attendance.functions";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "xp"
            ? (period === "all" ? "Your class ranked by XP earned all-time." : `Your class ranked by XP earned in the last ${period === "weekly" ? "7" : "30"} days.`)
            : "Your class ranked by attendance."}
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

      {q.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {rows.length === 0 && !q.isLoading && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No data yet.</CardContent></Card>
      )}

      {mode === "xp" ? (
        <div className="space-y-2">
          {rows.map((r: any) => (
            <Card key={r.user_id} className={cn(r.isMe && "border-primary ring-1 ring-primary")}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                  r.rank === 1 && "bg-amber-500/15 text-amber-600",
                  r.rank === 2 && "bg-slate-400/20 text-slate-600",
                  r.rank === 3 && "bg-orange-500/15 text-orange-600",
                  r.rank > 3 && "bg-muted text-muted-foreground",
                )}>
                  {r.rank === 1 ? <Crown className="h-5 w-5" /> : `#${r.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {r.name}
                    {r.isMe && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">YOU</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Level {r.level}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{r.xp.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">XP</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r: any) => (
            <Card key={r.user_id} className={cn(r.isMe && "border-primary ring-1 ring-primary")}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                  r.rank === 1 && "bg-amber-500/15 text-amber-600",
                  r.rank === 2 && "bg-slate-400/20 text-slate-600",
                  r.rank === 3 && "bg-orange-500/15 text-orange-600",
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
                  <div className="font-bold">{r.present}</div>
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
