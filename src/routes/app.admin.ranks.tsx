import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trophy, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import {
  adminListAcademyRanks, adminUpsertAcademyRank, adminDeleteAcademyRank,
} from "@/lib/api/ranks.functions";
import type { AcademyRank } from "@/lib/rpg/academyRanks";
import { getIcon } from "@/lib/gamification/icons";

export const Route = createFileRoute("/app/admin/ranks")({
  head: () => ({ meta: [{ title: "Academy Ranks — Academy Office" }] }),
  component: RanksAdmin,
});

type FormState = {
  id?: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  xp_required: number;
  message: string;
  sort_order: number;
  enabled: boolean;
};

const emptyForm: FormState = {
  code: "", name: "", icon: "Award", color: "#fbbf24",
  gradient: "linear-gradient(135deg,#78350f,#f59e0b)",
  xp_required: 0, message: "", sort_order: 1, enabled: true,
};

function RanksAdmin() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListAcademyRanks);
  const upsertFn = useServerFn(adminUpsertAcademyRank);
  const deleteFn = useServerFn(adminDeleteAcademyRank);

  const q = useQuery({
    queryKey: ["admin-academy-ranks"],
    queryFn: () => listFn(),
    enabled: role === "admin",
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-academy-ranks"] });
    qc.invalidateQueries({ queryKey: ["academy-ranks"] });
  };

  const upsert = useMutation({
    mutationFn: (payload: FormState) => upsertFn({ data: {
      ...payload,
      message: payload.message.trim() ? payload.message.trim() : null,
    } }),
    onSuccess: () => {
      toast.success("Rank saved");
      setOpen(false); setForm(emptyForm); invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Rank deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  const openCreate = () => {
    const nextOrder = (q.data?.reduce((m, r) => Math.max(m, r.sort_order), 0) ?? 0) + 1;
    setForm({ ...emptyForm, sort_order: nextOrder });
    setOpen(true);
  };

  const openEdit = (r: AcademyRank) => {
    setForm({
      id: r.id, code: r.code, name: r.name, icon: r.icon, color: r.color,
      gradient: r.gradient, xp_required: r.xp_required, message: r.message ?? "",
      sort_order: r.sort_order, enabled: r.enabled,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Trophy className="h-7 w-7" />}
        title="Academy Ranks"
        tagline="Configure the long-term promotion ladder every Cadet climbs."
        lumi="XP thresholds decide when a Cadet is promoted. Keep the ladder motivating — small early steps, grand later ones."
      />

      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Rank</Button>
      </div>

      <div className="grid gap-3">
        {(q.data ?? []).map((r) => {
          const Icon = getIcon(r.icon);
          return (
            <Card key={r.id} className={r.enabled ? "" : "opacity-60"}>
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="h-14 w-14 rounded-2xl grid place-items-center text-white shrink-0"
                  style={{ background: r.gradient, boxShadow: `0 0 20px -4px ${r.color}` }}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-bold text-lg">{r.name}</div>
                    <Badge variant="outline" className="text-[10px]">{r.code}</Badge>
                    {!r.enabled && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Requires {r.xp_required.toLocaleString()} XP · Order #{r.sort_order}
                  </div>
                  {r.message && <div className="text-xs italic mt-0.5 line-clamp-1">{r.message}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => upsert.mutate({
                      id: r.id, code: r.code, name: r.name, icon: r.icon, color: r.color,
                      gradient: r.gradient, xp_required: r.xp_required, message: r.message ?? "",
                      sort_order: r.sort_order, enabled: !r.enabled,
                    })}
                    aria-label={r.enabled ? "Disable" : "Enable"}
                  >
                    {r.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => confirm(`Delete rank "${r.name}"?`) && del.mutate(r.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Rank" : "New Rank"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="apprentice" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Apprentice" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Icon (lucide)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="BookOpen" />
              </div>
              <div>
                <Label>Color</Label>
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="#fbbf24" />
              </div>
            </div>
            <div>
              <Label>Gradient (CSS background)</Label>
              <Input value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} placeholder="linear-gradient(135deg,#0891b2,#22d3ee)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>XP Required</Label>
                <Input type="number" value={form.xp_required} onChange={(e) => setForm({ ...form, xp_required: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Motivational Message (optional)</Label>
              <Textarea rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="You are learning the ways of the Academy." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <Label>Enabled</Label>
            </div>
            <div className="rounded-xl border p-3 flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-xl grid place-items-center text-white"
                style={{ background: form.gradient, boxShadow: `0 0 16px -4px ${form.color}` }}
              >
                {(() => { const I = getIcon(form.icon); return <I className="h-6 w-6" />; })()}
              </div>
              <div className="text-sm">
                <div className="font-bold">{form.name || "Preview"}</div>
                <div className="text-xs text-muted-foreground">Preview</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save Rank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
