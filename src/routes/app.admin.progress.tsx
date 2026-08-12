import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  TrendingUp, Trophy, Coins, Zap, Shield, CalendarCheck, Crown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import { adminListStudents } from "@/lib/api/students.functions";
import { getLeaderboard } from "@/lib/api/gamification.functions";
import { rankFromXp, type AcademyRank } from "@/lib/rpg/academyRanks";
import { adminListAcademyRanks } from "@/lib/api/ranks.functions";

export const Route = createFileRoute("/app/admin/progress")({
  head: () => ({ meta: [{ title: "Progress & Rewards — Academy Office" }] }),
  component: ProgressHub,
});

function ProgressHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  const cadetsFn = useServerFn(adminListStudents);
  const ranksFn = useServerFn(adminListAcademyRanks);
  const boardFn = useServerFn(getLeaderboard);

  const cadetsQ = useQuery({ queryKey: ["admin-cadets"], queryFn: () => cadetsFn() });
  const ranksQ = useQuery({ queryKey: ["admin-academy-ranks"], queryFn: () => ranksFn() });
  const boardQ = useQuery({
    queryKey: ["hof", "hunter", "weekly", "progress"],
    queryFn: () => boardFn({ data: { period: "weekly" } }),
  });

  const cadets = cadetsQ.data?.students ?? [];
  const ranks: AcademyRank[] = (ranksQ.data ?? []) as AcademyRank[];

  const totals = cadets.reduce(
    (acc, c) => {
      acc.xp += c.xp;
      acc.coins += c.coins;
      acc.streak += c.streak_days;
      return acc;
    },
    { xp: 0, coins: 0, streak: 0 },
  );

  const rankDistribution = new Map<string, number>();
  for (const c of cadets) {
    const r = rankFromXp(c.xp, ranks);
    const label = r?.name ?? "Unranked";
    rankDistribution.set(label, (rankDistribution.get(label) ?? 0) + 1);
  }

  const topXp = [...cadets].sort((a, b) => b.xp - a.xp).slice(0, 8);
  const topCoins = [...cadets].sort((a, b) => b.coins - a.coins).slice(0, 8);
  const topStreak = [...cadets].sort((a, b) => b.streak_days - a.streak_days).slice(0, 8);

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<TrendingUp className="h-7 w-7" />}
        title="Progress & Rewards"
        tagline="Academy Progress, XP, Coins, Ranks and Guardian oversight — unified."
        lumi="Every heartbeat of student progression across Ingenious Academy."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={Zap} label="Total XP" value={totals.xp.toLocaleString()} />
        <StatCard icon={Coins} label="Total Coins" value={totals.coins.toLocaleString()} />
        <StatCard icon={CalendarCheck} label="Streak Days" value={totals.streak.toLocaleString()} />
        <StatCard icon={Trophy} label="Ranks Configured" value={ranks.length} />
      </div>

      <Tabs defaultValue="ranks">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ranks"><Trophy className="h-3.5 w-3.5 mr-1" />Ranks</TabsTrigger>
          <TabsTrigger value="xp"><Zap className="h-3.5 w-3.5 mr-1" />XP</TabsTrigger>
          <TabsTrigger value="coins"><Coins className="h-3.5 w-3.5 mr-1" />Coins</TabsTrigger>
          <TabsTrigger value="guardian"><Shield className="h-3.5 w-3.5 mr-1" />Guardian</TabsTrigger>
        </TabsList>

        <TabsContent value="ranks" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rank Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ranksQ.isLoading ? <Skeleton className="h-20" /> :
                [...rankDistribution.entries()].map(([label, n]) => (
                  <Row key={label} label={label} value={n} />
                ))}
              {rankDistribution.size === 0 && <p className="text-sm text-muted-foreground">No cadets yet.</p>}
            </CardContent>
          </Card>
          <RankManager />
        </TabsContent>

        <TabsContent value="xp" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" />Top by XP</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cadetsQ.isLoading ? <Skeleton className="h-20" /> :
                topXp.map((c) => <Row key={c.id} label={c.name ?? c.email ?? "—"} value={`${c.xp.toLocaleString()} XP · Lv ${c.level}`} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Weekly XP Leaders</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {boardQ.isLoading ? <Skeleton className="h-16" /> :
                (boardQ.data?.rows ?? []).slice(0, 5).map((r: any) => (
                  <Row key={r.user_id} label={`#${r.rank} ${r.name}`} value={`${(r.xp ?? 0).toLocaleString()} XP`} />
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coins" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4 text-amber-400" />Top by Coins</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cadetsQ.isLoading ? <Skeleton className="h-20" /> :
                topCoins.map((c) => <Row key={c.id} label={c.name ?? c.email ?? "—"} value={`${c.coins.toLocaleString()} coins`} />)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardian" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Guardian Streaks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {cadetsQ.isLoading ? <Skeleton className="h-20" /> :
                topStreak.map((c) => <Row key={c.id} label={c.name ?? c.email ?? "—"} value={`${c.streak_days}d streak`} />)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-sm gap-2">
      <div className="min-w-0 truncate">{label}</div>
      <Badge variant="secondary" className="shrink-0">{value}</Badge>
    </div>
  );
}
