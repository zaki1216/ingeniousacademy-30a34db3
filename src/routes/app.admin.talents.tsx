import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Shield, History, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listTalentConfigs,
  updateTalentConfig,
  resetTalentConfig,
  getTalentAuditLog,
} from "@/lib/api/talents-admin.functions";

export const Route = createFileRoute("/app/admin/talents")({
  component: AdminTalentsPage,
});

type TalentRow = Awaited<ReturnType<typeof listTalentConfigs>>[number];

function AdminTalentsPage() {
  const listFn = useServerFn(listTalentConfigs);
  const logFn = useServerFn(getTalentAuditLog);

  const list = useQuery({ queryKey: ["admin-talents"], queryFn: () => listFn() });
  const log = useQuery({ queryKey: ["admin-talent-log"], queryFn: () => logFn() });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Talent Admin</h1>
          <p className="text-sm text-muted-foreground">
            Tune tier counts, costs, and effect values. All changes are audited.
          </p>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="config">Configure</TabsTrigger>
          <TabsTrigger value="log"><History className="h-4 w-4 mr-1" /> Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-3 mt-3">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {list.error && (
            <p className="text-sm text-destructive">
              {(list.error as Error).message}
            </p>
          )}
          {list.data?.map((row) => <TalentEditor key={row.code} row={row} />)}
        </TabsContent>

        <TabsContent value="log" className="space-y-2 mt-3">
          {log.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {log.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No changes yet.
            </p>
          )}
          {log.data?.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {r.talent_code}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({r.action})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  by {r.admin_name}
                </div>
                <pre className="text-[10px] bg-muted rounded p-2 overflow-x-auto">
{JSON.stringify({ old: r.old_value, new: r.new_value }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TalentEditor({ row }: { row: TalentRow }) {
  const updateFn = useServerFn(updateTalentConfig);
  const resetFn = useServerFn(resetTalentConfig);
  const qc = useQueryClient();

  const effective = row.override ?? row.defaults;
  const [maxTier, setMaxTier] = useState(effective.maxTier);
  const [costs, setCosts] = useState<number[]>(effective.costPerTier);
  const [perTier, setPerTier] = useState(effective.perTierValue);

  useEffect(() => {
    setCosts((prev) => {
      const next = [...prev];
      if (maxTier > next.length) {
        while (next.length < maxTier) next.push(next[next.length - 1] ?? 1);
      } else if (maxTier < next.length) {
        next.length = maxTier;
      }
      return next;
    });
  }, [maxTier]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          code: row.code,
          maxTier,
          costPerTier: costs.map((n) => Number(n) || 0),
          perTierValue: Number(perTier) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(`${row.name} updated`);
      qc.invalidateQueries({ queryKey: ["admin-talents"] });
      qc.invalidateQueries({ queryKey: ["admin-talent-log"] });
      qc.invalidateQueries({ queryKey: ["talent-tree"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: () => resetFn({ data: { code: row.code } }),
    onSuccess: () => {
      toast.success(`${row.name} reset to defaults`);
      qc.invalidateQueries({ queryKey: ["admin-talents"] });
      qc.invalidateQueries({ queryKey: ["admin-talent-log"] });
      qc.invalidateQueries({ queryKey: ["talent-tree"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{row.icon}</span>
            <div>
              <div className="font-extrabold">{row.name}</div>
              <div className="text-[10px] uppercase text-muted-foreground">
                {row.effectKind} · {row.override ? "custom" : "default"}
              </div>
            </div>
          </div>
          {row.override && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Max tier (1–20)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={maxTier}
              onChange={(e) => setMaxTier(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <Label className="text-xs">
              Per-tier value{" "}
              <span className="text-muted-foreground">
                (default {row.defaults.perTierValue})
              </span>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={perTier}
              onChange={(e) => setPerTier(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Cost per tier (TP)</Label>
          <div className="grid grid-cols-5 gap-1.5 mt-1">
            {costs.map((c, idx) => (
              <Input
                key={idx}
                type="number"
                min={0}
                max={99}
                value={c}
                onChange={(e) => {
                  const next = [...costs];
                  next[idx] = Number(e.target.value) || 0;
                  setCosts(next);
                }}
              />
            ))}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full"
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}
