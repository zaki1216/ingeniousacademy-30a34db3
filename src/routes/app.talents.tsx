import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTalentTree, unlockTalentTier } from "@/lib/api/talents.functions";
import { SKILL_TREES, type SkillTreeMeta } from "@/lib/rpg/talent-trees";

export const Route = createFileRoute("/app/talents")({
  component: TalentsPage,
});

type TalentRow = {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: number;
  maxTier: number;
  nextCost: number | null;
  maxed: boolean;
};

function TalentsPage() {
  const fetchTree = useServerFn(getTalentTree);
  const unlockFn = useServerFn(unlockTalentTier);
  const qc = useQueryClient();
  const [activeTree, setActiveTree] = useState<SkillTreeMeta["key"]>("math");

  const { data, isLoading } = useQuery({
    queryKey: ["talent-tree"],
    queryFn: () => fetchTree(),
  });

  const unlock = useMutation({
    mutationFn: (code: string) => unlockFn({ data: { code } }),
    onSuccess: (res) => {
      toast.success(`Skill node forged — Tier ${res.tier}!`, {
        description: "+1 path unlocked",
      });
      qc.invalidateQueries({ queryKey: ["talent-tree"] });
      qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "The shadows resist…"),
  });

  if (isLoading || !data) {
    return <p className="text-muted-foreground text-sm">Summoning skill trees…</p>;
  }

  const byCode = new Map<string, TalentRow>(
    (data.talents as TalentRow[]).map((t) => [t.code, t]),
  );
  const active = SKILL_TREES.find((t) => t.key === activeTree) ?? SKILL_TREES[0];
  const activeTalent = byCode.get(active.talentCode);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl glass-card p-5 relative overflow-hidden border border-white/5">
        <div className="absolute inset-0 opacity-50 pointer-events-none bg-[radial-gradient(circle_at_80%_20%,#A78BFA_0%,transparent_55%),radial-gradient(circle_at_10%_90%,#38BDF8_0%,transparent_50%)]" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold">
              Monarch's Skill Trees
            </div>
            <h1 className="text-2xl font-extrabold leading-tight font-[Orbitron,system-ui]">
              Awaken Your Powers
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              4 disciplines. Forge each node by spending Talent Points.
            </p>
          </div>
          <div className="text-center shrink-0">
            <div className="h-16 w-16 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-[0_0_24px_rgba(167,139,250,0.55)]">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Talent Points
            </div>
            <div className="text-xl font-extrabold text-amber-300">{data.available}</div>
          </div>
        </div>
      </div>

      {/* Tree selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SKILL_TREES.map((tree) => {
          const t = byCode.get(tree.talentCode);
          const progress = t ? t.tier / t.maxTier : 0;
          const isActive = tree.key === activeTree;
          return (
            <button
              key={tree.key}
              onClick={() => setActiveTree(tree.key)}
              className={`relative text-left rounded-2xl p-3 border transition-all overflow-hidden ${
                isActive
                  ? `bg-white/[0.06] border-white/15 ring-1 ${tree.ring}`
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
              }`}
              style={isActive ? { boxShadow: `0 0 24px ${tree.shadow}` } : undefined}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tree.accent} flex items-center justify-center text-lg font-black text-white shadow-lg`}
                >
                  {tree.sigil}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold leading-tight truncate">
                    {tree.name.replace(" Tree", "")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t ? `${t.tier}/${t.maxTier}` : "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tree.accent}`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Active tree canvas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="overflow-hidden border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div
                    className={`inline-block text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r ${active.accent} bg-clip-text text-transparent`}
                  >
                    {active.name}
                  </div>
                  <h2 className="text-lg font-extrabold leading-tight">
                    {activeTalent?.name ?? active.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    {active.tagline}
                  </p>
                </div>
                {activeTalent && (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Mastery
                    </div>
                    <div className="text-xl font-extrabold text-amber-300">
                      {activeTalent.tier}
                      <span className="text-sm text-muted-foreground">
                        /{activeTalent.maxTier}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {activeTalent && (
                <SkillPath
                  meta={active}
                  talent={activeTalent}
                  available={data.available}
                  isPending={unlock.isPending}
                  onUnlock={() => unlock.mutate(activeTalent.code)}
                />
              )}

              {activeTalent && (
                <div className="mt-5 rounded-xl border border-white/5 bg-black/30 p-3 flex items-start gap-3">
                  <div
                    className={`h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br ${active.accent} flex items-center justify-center text-xl`}
                  >
                    {activeTalent.icon}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-semibold">Effect:</span>{" "}
                    {activeTalent.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      <p className="text-[11px] text-center text-muted-foreground">
        Skill effects activate the instant a node awakens.
      </p>
    </div>
  );
}

function SkillPath({
  meta,
  talent,
  available,
  isPending,
  onUnlock,
}: {
  meta: SkillTreeMeta;
  talent: TalentRow;
  available: number;
  isPending: boolean;
  onUnlock: () => void;
}) {
  const nodes = Array.from({ length: talent.maxTier }).map((_, i) => {
    const tierIdx = i + 1;
    const status: "unlocked" | "available" | "locked" =
      tierIdx <= talent.tier
        ? "unlocked"
        : tierIdx === talent.tier + 1
          ? "available"
          : "locked";
    return {
      tierIdx,
      status,
      label: meta.nodeLabels[i] ?? `Tier ${tierIdx}`,
    };
  });

  const canAfford = !talent.maxed && (talent.nextCost ?? Infinity) <= available;

  return (
    <div>
      {/* Connector + nodes */}
      <div className="relative py-2">
        {/* vertical spine */}
        <div className="absolute left-7 top-4 bottom-4 w-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-x-0 top-0 bg-gradient-to-b ${meta.accent}`}
            initial={{ height: 0 }}
            animate={{
              height: `${(talent.tier / Math.max(talent.maxTier, 1)) * 100}%`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ boxShadow: `0 0 12px ${meta.shadow}` }}
          />
        </div>

        <ul className="space-y-3 relative">
          {nodes.map((node, i) => (
            <motion.li
              key={node.tierIdx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="relative shrink-0">
                <div
                  className={`relative z-10 h-14 w-14 rounded-2xl flex items-center justify-center text-base font-black border-2 transition-all ${
                    node.status === "unlocked"
                      ? `bg-gradient-to-br ${meta.accent} text-white border-white/30`
                      : node.status === "available"
                        ? `bg-black/60 text-white border-amber-300/80 animate-pulse`
                        : "bg-black/40 text-white/30 border-white/10"
                  }`}
                  style={
                    node.status === "unlocked"
                      ? { boxShadow: `0 0 20px ${meta.shadow}` }
                      : node.status === "available"
                        ? { boxShadow: "0 0 18px rgba(252,211,77,0.55)" }
                        : undefined
                  }
                >
                  {node.status === "unlocked" ? (
                    <Check className="h-5 w-5" />
                  ) : node.status === "available" ? (
                    <Zap className="h-5 w-5 text-amber-300" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      Tier {node.tierIdx}
                    </span>
                    {node.status === "available" && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/90 px-1.5 py-0.5 rounded bg-amber-300/10">
                        Awaiting
                      </span>
                    )}
                    {node.status === "unlocked" && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/90 px-1.5 py-0.5 rounded bg-emerald-300/10">
                        Forged
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-sm font-bold leading-tight truncate ${
                      node.status === "locked" ? "text-white/40" : "text-white"
                    }`}
                  >
                    {node.label}
                  </div>
                </div>
                {node.status === "available" && (
                  <Button
                    size="sm"
                    disabled={!canAfford || isPending}
                    onClick={onUnlock}
                    className={`shrink-0 bg-gradient-to-r ${meta.accent} text-white border-0 font-bold`}
                  >
                    {canAfford ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {talent.nextCost} TP
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        {talent.nextCost} TP
                      </>
                    )}
                  </Button>
                )}
                {node.status === "locked" && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    Forge prior nodes first
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      {talent.maxed && (
        <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center">
          <div className="text-emerald-300 font-extrabold text-sm">
            Tree Mastered — All nodes forged
          </div>
        </div>
      )}
    </div>
  );
}
