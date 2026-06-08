import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTalentTree, unlockTalentTier } from "@/lib/api/talents.functions";

export const Route = createFileRoute("/app/talents")({
  component: TalentsPage,
});

function TalentsPage() {
  const fetchTree = useServerFn(getTalentTree);
  const unlockFn = useServerFn(unlockTalentTier);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["talent-tree"],
    queryFn: () => fetchTree(),
  });

  const unlock = useMutation({
    mutationFn: (code: string) => unlockFn({ data: { code } }),
    onSuccess: (res) => {
      toast.success(`Unlocked tier ${res.tier}!`);
      qc.invalidateQueries({ queryKey: ["talent-tree"] });
      qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not unlock"),
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground text-sm">Summoning skill tree…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl glass-card p-5 glow-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,#A78BFA_0%,transparent_55%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              Skill Tree
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">Hero Talents</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Earn 1 Talent Point every 5 hero levels. Spend wisely.
            </p>
          </div>
          <div className="text-center shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center glow-primary">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Available</div>
            <div className="text-xl font-extrabold text-amber-300">{data.available}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.talents.map((t, i) => (
          <motion.div
            key={t.code}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-3xl shadow-lg shrink-0`}
                  >
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold leading-tight">{t.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        Tier {t.tier}/{t.maxTier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  </div>
                </div>

                {/* Tier pips */}
                <div className="mt-3 flex gap-1.5">
                  {Array.from({ length: t.maxTier }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-2 rounded-full ${
                        idx < t.tier
                          ? `bg-gradient-to-r ${t.color} shadow-[0_0_8px_rgba(251,191,36,0.5)]`
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {t.maxed ? (
                      <span className="text-emerald-400 font-bold">Maxed out</span>
                    ) : (
                      <>
                        Next tier cost:{" "}
                        <span className="font-bold text-amber-300">
                          {t.nextCost} TP
                        </span>
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      t.maxed ||
                      unlock.isPending ||
                      (t.nextCost ?? Infinity) > data.available
                    }
                    onClick={() => unlock.mutate(t.code)}
                    className="bg-[image:var(--gradient-primary)] text-primary-foreground border-0"
                  >
                    {t.maxed ? (
                      "Max"
                    ) : (t.nextCost ?? 0) > data.available ? (
                      <>
                        <Lock className="h-3.5 w-3.5 mr-1" /> Locked
                      </>
                    ) : (
                      "Unlock"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Effects apply automatically the moment a talent is unlocked.
      </p>
    </div>
  );
}
