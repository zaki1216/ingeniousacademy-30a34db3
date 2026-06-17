import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Coins,
  Lock,
  Check,
  AlertCircle,
  Clock,
  ShieldCheck,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { getPassShop, purchasePass } from "@/lib/api/passes.functions";
import { PASSES, rarityHex, getPass } from "@/lib/rpg/passes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/passes")({
  component: PassShopPage,
});

function PassShopPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getShop = useServerFn(getPassShop);
  const buy = useServerFn(purchasePass);
  const [confirming, setConfirming] = useState<string | null>(null);

  const shop = useQuery({
    queryKey: ["pass-shop", user?.id],
    enabled: !!user?.id,
    queryFn: () => getShop(),
    staleTime: 15_000,
  });

  const purchase = useMutation({
    mutationFn: (passCode: string) => buy({ data: { passCode } }),
    onSuccess: (res) => {
      const def = getPass(confirming ?? "");
      toast.success(
        def?.name
          ? `✨ ${def.name} ${res.pass.status === "pending_approval" ? "purchased — awaiting teacher approval" : "added to your inventory"}`
          : "Pass purchased!",
      );
      setConfirming(null);
      qc.invalidateQueries({ queryKey: ["pass-shop"] });
      qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
    },
    onError: (err: Error) => toast.error(err.message || "Purchase failed"),
  });

  const coins = shop.data?.coins ?? 0;
  const catalog = shop.data?.catalog ?? PASSES.map((p) => ({ ...p, atLimit: false, canAfford: false, usedInWindow: 0, nextAvailable: null as string | null }));
  const owned = shop.data?.owned ?? [];
  const activeOwned = owned.filter((o) => o.status === "active" || o.status === "pending_approval");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rune-border holo-card relative overflow-hidden p-5">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 15% -10%, color-mix(in oklab,#fbbf24 35%, transparent), transparent 55%), radial-gradient(circle at 100% 110%, color-mix(in oklab,#22d3ee 30%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="grid place-items-center h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_24px_rgba(251,191,36,0.5)]">
            <Ticket className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-orbitron font-bold tracking-[0.22em] text-amber-300">
              ACADEMY PASS BAZAAR
            </div>
            <h1 className="text-2xl font-extrabold">Pass Shop</h1>
            <p className="text-sm text-muted-foreground">
              Spend coins on privileges, protections & boosts. Some passes require teacher approval.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <Coins className="h-4 w-4 text-amber-300" />
            <span className="font-orbitron font-black text-base">{coins.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* Active passes strip */}
      {activeOwned.length > 0 && (
        <section>
          <h2 className="text-[11px] font-orbitron font-bold tracking-widest text-muted-foreground uppercase mb-2">
            Your Active Passes
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeOwned.map((o) => {
              const def = getPass(o.pass_code);
              if (!def) return null;
              const pending = o.status === "pending_approval";
              return (
                <div
                  key={o.id}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/5"
                  style={{
                    borderColor: pending ? "rgba(251,191,36,0.5)" : "rgba(74,222,128,0.5)",
                  }}
                >
                  <span className="text-xl">{def.emoji}</span>
                  <div>
                    <div className="text-xs font-bold leading-tight">{def.name}</div>
                    <div
                      className="text-[10px] font-orbitron tracking-wider uppercase"
                      style={{ color: pending ? "#fbbf24" : "#4ade80" }}
                    >
                      {pending ? (
                        <span className="flex items-center gap-1">
                          <Hourglass className="h-2.5 w-2.5" /> Awaiting Approval
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pass grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalog.map((p) => {
          const color = rarityHex(p.rarity);
          const blocked = p.atLimit || !p.canAfford;
          return (
            <motion.article
              key={p.code}
              layout
              className="relative rounded-2xl border border-white/10 overflow-hidden holo-card"
              style={{ boxShadow: `0 0 20px color-mix(in oklab, ${p.tint} 18%, transparent)` }}
            >
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${p.tint}aa, transparent 60%)`,
                }}
              />

              <div className="relative p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-14 w-14 shrink-0 rounded-xl grid place-items-center text-3xl"
                    style={{
                      background: `linear-gradient(135deg, ${p.tint}33, ${p.tint}11)`,
                      border: `1px solid ${p.tint}55`,
                      boxShadow: `inset 0 0 12px ${p.tint}33`,
                    }}
                  >
                    {p.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-base truncate">{p.name}</h3>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-orbitron font-black tracking-widest"
                        style={{
                          color,
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
                        }}
                      >
                        {p.rarity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/85 mt-1">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.details}</p>
                  </div>
                </div>

                {/* meta chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.limit.kind !== "none" && (
                    <Chip>
                      <Clock className="h-3 w-3" />
                      {p.limit.count}× per {p.limit.kind === "weekly" ? "week" : "month"}
                      {p.usedInWindow > 0 && ` · used ${p.usedInWindow}/${p.limit.count}`}
                    </Chip>
                  )}
                  {p.requiresApproval && (
                    <Chip tone="amber">
                      <ShieldCheck className="h-3 w-3" />
                      Teacher Approval
                    </Chip>
                  )}
                  {p.examBlocked && (
                    <Chip tone="rose">
                      <AlertCircle className="h-3 w-3" />
                      Not during exams
                    </Chip>
                  )}
                  {p.durationHours && (
                    <Chip tone="violet">
                      <Hourglass className="h-3 w-3" />
                      {p.durationHours}h duration
                    </Chip>
                  )}
                </div>

                {/* purchase row */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1.5 font-orbitron font-black text-amber-300">
                    <Coins className="h-4 w-4" />
                    {p.costCoins.toLocaleString()}
                  </div>
                  {p.atLimit ? (
                    <Button size="sm" variant="outline" disabled className="gap-1">
                      <Lock className="h-3 w-3" /> Limit reached
                    </Button>
                  ) : !p.canAfford ? (
                    <Button size="sm" variant="outline" disabled className="gap-1">
                      Need {(p.costCoins - coins).toLocaleString()} more
                    </Button>
                  ) : confirming === p.code ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                        disabled={purchase.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => purchase.mutate(p.code)}
                        disabled={purchase.isPending}
                        className="gap-1 bg-gradient-to-r from-amber-500 to-orange-600"
                      >
                        <Check className="h-3 w-3" />
                        {purchase.isPending ? "Buying…" : "Confirm"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setConfirming(p.code)}
                      className="gap-1 bg-gradient-to-r from-amber-500 to-orange-600"
                      disabled={blocked}
                    >
                      Buy Pass
                    </Button>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Recent purchases history */}
      {owned.length > 0 && (
        <section className="mt-2">
          <h2 className="text-[11px] font-orbitron font-bold tracking-widest text-muted-foreground uppercase mb-2">
            Purchase History
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
            <AnimatePresence>
              {owned.slice(0, 10).map((o) => {
                const def = getPass(o.pass_code);
                return (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="text-xl">{def?.emoji ?? "🎫"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{def?.name ?? o.pass_code}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                    </div>
                    <StatusPill status={o.status} />
                    <div className="text-xs font-orbitron text-amber-300 flex items-center gap-1">
                      <Coins className="h-3 w-3" />-{o.cost_coins}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
}

function Chip({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "rose" | "violet";
}) {
  const map = {
    slate: "rgba(148,163,184,0.5)",
    amber: "rgba(251,191,36,0.5)",
    rose: "rgba(244,63,94,0.5)",
    violet: "rgba(168,85,247,0.5)",
  };
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-orbitron font-bold tracking-wider bg-white/5"
      style={{ border: `1px solid ${map[tone]}` }}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "#4ade80" },
    pending_approval: { label: "Awaiting approval", color: "#fbbf24" },
    approved: { label: "Approved", color: "#22d3ee" },
    used: { label: "Used", color: "#94a3b8" },
    expired: { label: "Expired", color: "#64748b" },
    refunded: { label: "Refunded", color: "#a855f7" },
    rejected: { label: "Rejected", color: "#f43f5e" },
  };
  const m = map[status] ?? { label: status, color: "#94a3b8" };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-[10px] font-orbitron font-bold tracking-wider uppercase",
      )}
      style={{
        color: m.color,
        background: `color-mix(in oklab, ${m.color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${m.color} 40%, transparent)`,
      }}
    >
      {m.label}
    </span>
  );
}
