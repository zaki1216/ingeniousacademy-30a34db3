import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Flame, Sparkles, Trophy, Zap, CalendarDays, BookOpen, Crown, Lock, Coins, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { getDailyQuestsAndStreak } from "@/lib/api/quests.functions";
import { cn } from "@/lib/utils";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";

export const Route = createFileRoute("/app/quests")({ component: QuestsPage });

type Category = "daily" | "weekly" | "chapter" | "special";

const CATEGORIES: { id: Category; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "daily",   label: "Daily",   icon: Sparkles },
  { id: "weekly",  label: "Weekly",  icon: CalendarDays },
  { id: "chapter", label: "Chapter", icon: BookOpen },
  { id: "special", label: "Special", icon: Crown },
];

function QuestsPage() {
  const fn = useServerFn(getDailyQuestsAndStreak);
  const { data, isLoading } = useQuery({ queryKey: ["daily-quests"], queryFn: () => fn() });
  const [tab, setTab] = useState<Category>("daily");
  const [claimed, setClaimed] = useState<Record<string, true>>({});
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);

  function handleClaim(q: { id: string; reward_xp: number; reward_coins: number; title: string }) {
    if (claimed[q.id]) return;
    setClaimed((prev) => ({ ...prev, [q.id]: true }));
    setFloating({ xp: q.reward_xp, coins: q.reward_coins, label: q.title, key: Date.now() });
  }

  // Derive a Weekly view from the existing days array (no API change).
  const weekly = useMemo(() => {
    if (!data) return null;
    const last7 = data.days.slice(-7);
    const xp7 = last7.reduce((s, d) => s + d.xp, 0);
    const active7 = last7.filter((d) => d.xp > 0).length;
    return [
      {
        id: "week-xp",
        title: "Weekly Grind",
        description: "Earn 300 XP this week",
        goal: 300,
        progress: Math.min(xp7, 300),
        reward_xp: 150,
        reward_coins: 75,
        done: xp7 >= 300,
      },
      {
        id: "week-active",
        title: "Daily Disciple",
        description: "Be active 5 days this week",
        goal: 5,
        progress: Math.min(active7, 5),
        reward_xp: 100,
        reward_coins: 50,
        done: active7 >= 5,
      },
    ];
  }, [data]);

  const list = useMemo(() => {
    if (tab === "daily") return data?.quests ?? [];
    if (tab === "weekly") return weekly ?? [];
    return [];
  }, [tab, data, weekly]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-orbitron flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-400" />Quests &amp; Missions
        </h1>
        <p className="text-sm text-muted-foreground">Hunt every category — daily resets, weekly arcs, chapter ops, and special events.</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = tab === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-orbitron uppercase tracking-wider transition",
                active
                  ? "border-primary bg-primary/15 text-primary monarch-glow"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          );
        })}
      </div>

      {isLoading && <Skeleton className="h-40" />}

      {!isLoading && (
        <>
          {list.length > 0 ? (
            <div className="grid gap-2">
              {list.map((q) => (
                <Card key={q.id} className={cn(q.done && "border-emerald-500/60 bg-emerald-500/5 monarch-glow")}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold flex items-center gap-2">
                          {q.done && <Trophy className="h-4 w-4 text-emerald-400" />}
                          {q.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{q.description}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Badge variant="secondary" className="text-amber-400 font-orbitron">
                          <Zap className="h-3 w-3 mr-1" />+{q.reward_xp}
                        </Badge>
                        <Badge variant="secondary" className="font-orbitron">🪙 +{q.reward_coins}</Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={(q.progress / q.goal) * 100} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 font-orbitron">{q.progress}/{q.goal}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <div className="font-orbitron text-sm uppercase tracking-wider text-muted-foreground">
                  {tab === "chapter" ? "Chapter Ops unlock as you progress dungeons." : "Special events arrive during seasons."}
                </div>
                <div className="text-xs text-muted-foreground/80">Check back soon, Hunter.</div>
              </CardContent>
            </Card>
          )}

          {data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 font-orbitron"><Flame className="h-4 w-4 text-orange-500" />Activity (last 90 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <StreakHeatmap days={data.days} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StreakHeatmap({ days }: { days: { date: string; xp: number }[] }) {
  const weeks = useMemo(() => {
    const first = new Date(days[0]?.date ?? new Date().toISOString().slice(0, 10));
    const dow = first.getDay();
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
  const colors = ["bg-muted/40", "bg-emerald-500/25", "bg-emerald-500/50", "bg-emerald-500/75", "bg-emerald-500"];
  const total = days.reduce((s, d) => s + d.xp, 0);
  const activeDays = days.filter((d) => d.xp > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span><b className="text-foreground font-orbitron">{total}</b> XP</span>
        <span><b className="text-foreground font-orbitron">{activeDays}</b> active days</span>
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
