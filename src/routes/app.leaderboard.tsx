import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trophy, Crown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaderboard } from "@/lib/api/gamification.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/leaderboard")({ component: LeaderboardPage });

function LeaderboardPage() {
  const fn = useServerFn(getLeaderboard);
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("weekly");
  const q = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => fn({ data: { period } }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground">Your class ranked by XP {period === "all" ? "earned all-time" : `earned in the last ${period === "weekly" ? "7" : "30"} days`}.</p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="all">All-time</TabsTrigger>
        </TabsList>
      </Tabs>

      {q.isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {q.data && q.data.rows.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No classmates yet.</CardContent></Card>
      )}

      <div className="space-y-2">
        {q.data?.rows.map((r) => (
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

      {q.data?.myRank && q.data.myRank > 50 && (
        <p className="text-xs text-center text-muted-foreground">Your rank: #{q.data.myRank}</p>
      )}
    </div>
  );
}
