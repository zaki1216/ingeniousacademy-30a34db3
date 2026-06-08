import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, Lock } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { getAchievementsGallery } from "@/lib/api/gamification.functions";
import { getIcon } from "@/lib/gamification/icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/achievements")({ component: AchievementsPage });

function AchievementsPage() {
  const fn = useServerFn(getAchievementsGallery);
  const q = useQuery({ queryKey: ["achievements-gallery"], queryFn: () => fn() });

  const unlocked = q.data?.achievements.filter((a) => a.unlocked).length ?? 0;
  const total = q.data?.achievements.length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" /> Achievements
        </h1>
        <p className="text-sm text-muted-foreground">
          {unlocked} of {total} badges unlocked
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {q.data?.achievements.map((a, i) => {
          const Icon = getIcon(a.icon);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={cn(!a.unlocked && "opacity-60")}>
                <CardContent className="p-3 text-center space-y-2">
                  <div className={cn(
                    "mx-auto h-14 w-14 rounded-2xl flex items-center justify-center",
                    a.unlocked ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {a.unlocked ? <Icon className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
                  </div>
                  <div className="font-semibold text-sm leading-tight">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">{a.description}</div>
                  {a.unlocked ? (
                    <div className="text-[10px] text-primary font-semibold uppercase">Unlocked</div>
                  ) : (
                    <div className="text-[10px] text-muted-foreground">+{a.xp_reward} XP · +{a.coin_reward} coins</div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
