import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Coins } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ActiveBonusesCard } from "@/components/gamification/ActiveBonusesCard";
import { getCoinHistory } from "@/lib/api/gamification.functions";

export const Route = createFileRoute("/app/coins")({ component: CoinsPage });

const REASON_LABELS: Record<string, string> = {
  video_complete: "Lecture completed",
  quiz_complete: "Quiz completed",
  achievement: "Achievement unlocked",
  boss_quiz: "Boss quiz defeated",
  weekly_streak: "7-day streak bonus",
};

function CoinsPage() {
  const fn = useServerFn(getCoinHistory);
  const q = useQuery({ queryKey: ["coin-history"], queryFn: () => fn() });

  const total = q.data?.transactions.reduce((s, t) => s + t.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-amber-500" /> Coin history
        </h1>
        <p className="text-sm text-muted-foreground">Recent {q.data?.transactions.length ?? 0} transactions</p>
      </div>

      <Card>
        <CardContent className="p-5 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Earned shown below</div>
          <div className="text-4xl font-extrabold text-amber-500 mt-1">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">coins</div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {q.data?.transactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No coins earned yet.</p>
        )}
        {q.data?.transactions.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{REASON_LABELS[t.reason] ?? t.reason}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
              <div className={t.amount >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {t.amount >= 0 ? "+" : ""}{t.amount}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
