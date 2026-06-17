import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Gift, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  adminListSpinPrizes,
  adminUpdateSpinPrize,
  adminBulkUpdateWeights,
} from "@/lib/api/spin.functions";

export const Route = createFileRoute("/app/admin/spin")({ component: AdminSpinPage });

const RARITY_CHIP: Record<string, string> = {
  common: "bg-slate-700 text-slate-100",
  rare: "bg-sky-600 text-sky-50",
  epic: "bg-fuchsia-600 text-white",
  legendary: "bg-amber-400 text-amber-950",
};

type Row = {
  id: string;
  code: string;
  label: string;
  icon: string;
  color: string;
  reward_type: string;
  reward_value: string;
  reward_amount: number;
  rarity: string;
  weight: number;
  enabled: boolean;
  sort_order: number;
};

function AdminSpinPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListSpinPrizes);
  const updateOne = useServerFn(adminUpdateSpinPrize);
  const bulk = useServerFn(adminBulkUpdateWeights);

  const q = useQuery({ queryKey: ["admin-spin-prizes"], queryFn: () => list() });
  const rows = (q.data ?? []) as Row[];

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, number> = {};
    rows.forEach((r) => (next[r.id] = Number(r.weight)));
    setWeights(next);
  }, [q.data]);

  const totalWeight = useMemo(
    () => rows.reduce((s, r) => s + (r.enabled ? Number(weights[r.id] ?? r.weight) : 0), 0),
    [rows, weights],
  );

  function pct(r: Row): number {
    if (!r.enabled) return 0;
    const w = Number(weights[r.id] ?? r.weight);
    return totalWeight > 0 ? (w / totalWeight) * 100 : 0;
  }

  async function toggle(r: Row, enabled: boolean) {
    try {
      await updateOne({ data: { id: r.id, enabled } });
      toast.success(`${r.label} ${enabled ? "enabled" : "disabled"}`);
      await qc.invalidateQueries({ queryKey: ["admin-spin-prizes"] });
      await qc.invalidateQueries({ queryKey: ["spin-status"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function saveAmount(r: Row, value: number) {
    try {
      await updateOne({ data: { id: r.id, reward_amount: value } });
      toast.success(`${r.label} amount → ${value}`);
      await qc.invalidateQueries({ queryKey: ["admin-spin-prizes"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function saveAllWeights() {
    setSaving(true);
    try {
      const updates = rows
        .filter((r) => Number(weights[r.id] ?? r.weight) !== Number(r.weight))
        .map((r) => ({ id: r.id, weight: Number(weights[r.id] ?? r.weight) }));
      if (!updates.length) {
        toast.info("No weight changes to save");
        return;
      }
      await bulk({ data: { updates } });
      toast.success(`Saved ${updates.length} weight change${updates.length === 1 ? "" : "s"}`);
      await qc.invalidateQueries({ queryKey: ["admin-spin-prizes"] });
      await qc.invalidateQueries({ queryKey: ["spin-status"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function resetWeights() {
    const next: Record<string, number> = {};
    rows.forEach((r) => (next[r.id] = Number(r.weight)));
    setWeights(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold">Admin</div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Gift className="h-6 w-6 text-fuchsia-400" /> Spin Wheel Configuration
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Adjust prize weights, toggle prizes, and edit reward amounts. Probabilities update live.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetWeights}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={saveAllWeights} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> Save weights
          </Button>
        </div>
      </div>

      <div className="rounded-2xl glass-card p-3 text-xs text-muted-foreground">
        Total active weight: <b className="text-foreground">{totalWeight.toFixed(2)}</b>. Each prize's odds = its weight ÷ total weight.
      </div>

      <div className="rounded-2xl glass-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[auto_1.5fr_1fr_1fr_1.4fr_auto_auto] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-white/10">
          <div>Icon</div>
          <div>Prize</div>
          <div>Reward</div>
          <div>Amount</div>
          <div>Weight / Odds</div>
          <div>Rarity</div>
          <div>On</div>
        </div>

        <div className="divide-y divide-white/5">
          {rows.map((r) => (
            <div
              key={r.id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1.5fr_1fr_1fr_1.4fr_auto_auto] gap-2 items-center px-3 py-3",
                !r.enabled && "opacity-50",
              )}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-xl ring-2 ring-white/10"
                style={{ background: r.color }}
              >
                {r.icon}
              </div>

              <div className="min-w-0">
                <div className="font-bold truncate">{r.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
              </div>

              <div className="hidden md:block text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold uppercase tracking-wider text-[9px]">
                  {r.reward_type}
                </span>
              </div>

              <div className="hidden md:flex items-center gap-1">
                <Input
                  type="number"
                  defaultValue={r.reward_amount}
                  min={0}
                  className="h-8 w-24"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== r.reward_amount) saveAmount(r, v);
                  }}
                />
              </div>

              <div className="hidden md:flex items-center gap-2 min-w-0">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={weights[r.id] ?? r.weight}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [r.id]: Number(e.target.value) || 0 }))
                  }
                  className="h-8 w-20"
                />
                <div className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[image:var(--gradient-primary)]"
                      style={{ width: `${pct(r)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    {pct(r).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <span className={cn("text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded", RARITY_CHIP[r.rarity])}>
                  {r.rarity}
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r, v)} />
              </div>

              {/* Mobile compact panel */}
              <div className="md:hidden col-span-3 flex items-center gap-2">
                <span className={cn("text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded", RARITY_CHIP[r.rarity])}>
                  {r.rarity}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase">{r.reward_type}</span>
                <span className="text-xs">×{r.reward_amount}</span>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={weights[r.id] ?? r.weight}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [r.id]: Number(e.target.value) || 0 }))
                  }
                  className="h-7 w-16 ml-auto"
                />
                <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
                  {pct(r).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
