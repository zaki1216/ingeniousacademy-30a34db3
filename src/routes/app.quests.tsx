import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Flame, Sparkles, Trophy, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { getDailyQuestsAndStreak } from "@/lib/api/quests.functions";

export const Route = createFileRoute("/app/quests")({ component: QuestsPage });

function QuestsPage() {
  const fn = useServerFn(getDailyQuestsAndStreak);
  const { data, isLoading } = useQuery({ queryKey: ["daily-quests"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-amber-500" />Daily Quests</h1>
        <p className="text-sm text-muted-foreground">Reset every day · keep your streak alive</p>
      </div>

      {isLoading && <Skeleton className="h-40" />}

      {data && (
        <>
          <div className="grid gap-2">
            {data.quests.map((q) => (
              <Card key={q.id} className={q.done ? "border-emerald-500/50 bg-emerald-500/5" : ""}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-2">
                        {q.done && <Trophy className="h-4 w-4 text-emerald-500" />}
                        {q.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{q.description}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="secondary" className="text-amber-600"><Zap className="h-3 w-3 mr-1" />{q.reward_xp}</Badge>
                      <Badge variant="secondary">🪙 {q.reward_coins}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={(q.progress / q.goal) * 100} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{q.progress}/{q.goal}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" />Activity (last 90 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <StreakHeatmap days={data.days} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StreakHeatmap({ days }: { days: { date: string; xp: number }[] }) {
  // Build weeks. days are oldest→newest, 90 days.
  const weeks = useMemo(() => {
    // Pad the start so first column aligns to Sunday
    const first = new Date(days[0]?.date ?? new Date().toISOString().slice(0, 10));
    const dow = first.getDay(); // 0 Sun – 6 Sat
    const padded: ({ date: string; xp: number } | null)[] = [];
    for (let i = 0; i < dow; i++) padded.push(null);
    padded.push(...days);
    const cols: ({ date: string; xp: number } | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7));
    return cols;
  }, [days]);

  const max = Math.max(1, ...days.map((d) => d.xp));
  const level = (xp: number) => {
    if (xp <= 0) return 0;
    const r = xp / max;
    if (r < 0.25) return 1;
    if (r < 0.5) return 2;
    if (r < 0.75) return 3;
    return 4;
  };
  const colors = [
    "bg-muted/40",
    "bg-emerald-500/25",
    "bg-emerald-500/50",
    "bg-emerald-500/75",
    "bg-emerald-500",
  ];

  const total = days.reduce((s, d) => s + d.xp, 0);
  const activeDays = days.filter((d) => d.xp > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span><b className="text-foreground">{total}</b> XP</span>
        <span><b className="text-foreground">{activeDays}</b> active days</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((w, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, ri) => {
                const cell = w[ri];
                if (!cell) return <div key={ri} className="h-3 w-3" />;
                return (
                  <div
                    key={ri}
                    className={`h-3 w-3 rounded-sm ${colors[level(cell.xp)]}`}
                    title={`${cell.date}: ${cell.xp} XP`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Less</span>
        {colors.map((c, i) => <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}
