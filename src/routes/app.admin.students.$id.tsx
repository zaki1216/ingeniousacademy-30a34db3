import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Coins, Award, Crown, Ticket, Ghost, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { rankFromLevel } from "@/lib/rpg/ranks";
import {
  adminGetStudentCommandCenter, adminAwardCoins, adminAwardBadge, adminAwardTitle,
  adminGrantPass, adminUnlockShadow,
} from "@/lib/api/admin-rewards.functions";

export const Route = createFileRoute("/app/admin/students/$id")({ component: StudentCommandCenter });

function StudentCommandCenter() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const qc = useQueryClient();
  const dataFn = useServerFn(adminGetStudentCommandCenter);

  const q = useQuery({
    queryKey: ["admin-cc", id],
    queryFn: () => dataFn({ data: { userId: id } }),
    enabled: role === "admin",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-cc", id] });

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  if (q.isLoading || !q.data) return <Skeleton className="h-64" />;

  const d = q.data;
  const rank = rankFromLevel(d.stats?.level ?? 1);

  return (
    <div className="space-y-4">
      <Link to="/app/students" className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to students
      </Link>

      <Card>
        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold">
            {(d.profile?.name ?? "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold">{d.profile?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{d.profile?.email}</div>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge>Lv {d.stats?.level ?? 1}</Badge>
              <Badge variant="secondary">{rank?.name ?? "—"} Rank</Badge>
              <Badge variant="secondary">💰 {d.stats?.coins ?? 0}</Badge>
              <Badge variant="secondary">🔥 {d.stats?.streak_days ?? 0}d</Badge>
              <Badge variant="outline">
                📅 {d.attendance.present}/{d.attendance.total}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuickActions userId={id} onDone={refresh} />

      <div className="grid md:grid-cols-2 gap-3">
        <StatList title="Achievements" empty="No badges yet">
          {d.achievements.map((a: any, i) => (
            <div key={i} className="text-sm flex items-center gap-2">
              <span>{a.achievement?.icon ?? "🏆"}</span>
              <span>{a.achievement?.name}</span>
            </div>
          ))}
        </StatList>

        <StatList title="Titles" empty="No titles yet">
          {d.titles.map((t: any, i) => (
            <div key={i} className="text-sm flex items-center gap-2">
              <Crown className="h-3 w-3" /> {t.title?.name}
              <Badge variant="outline" className="text-[10px] ml-auto">{t.title?.rarity}</Badge>
            </div>
          ))}
        </StatList>

        <StatList title="Passes" empty="No passes">
          {d.passes.map((p: any) => (
            <div key={p.id} className="text-sm flex items-center justify-between">
              <span>{p.pass_code}</span>
              <Badge variant={p.status === "approved" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
            </div>
          ))}
        </StatList>

        <StatList title="Shadow Collection" empty="No shadows unlocked">
          {d.shadows.map((s: any, i) => (
            <div key={i} className="text-sm flex items-center gap-2">
              <Ghost className="h-3 w-3" /> {s.shadow?.name}
              <Badge variant="outline" className="text-[10px] ml-auto">{s.shadow?.rarity}</Badge>
            </div>
          ))}
        </StatList>
      </div>
    </div>
  );
}

function StatList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasContent = arr.filter(Boolean).length > 0;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 max-h-48 overflow-y-auto">
        {hasContent ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function QuickActions({ userId, onDone }: { userId: string; onDone: () => void }) {
  const awardCoins = useServerFn(adminAwardCoins);
  const awardBadge = useServerFn(adminAwardBadge);
  const awardTitle = useServerFn(adminAwardTitle);
  const grantPass = useServerFn(adminGrantPass);
  const unlockShadow = useServerFn(adminUnlockShadow);

  const [coinAmt, setCoinAmt] = useState(50);
  const [badgeId, setBadgeId] = useState("");
  const [titleCode, setTitleCode] = useState("");
  const [passCode, setPassCode] = useState("");
  const [shadowCode, setShadowCode] = useState("");

  const badges = useQuery({ queryKey: ["all-achievements"], queryFn: async () => (await supabase.from("achievements").select("id,name,code")).data ?? [] });
  const titles = useQuery({ queryKey: ["all-titles"], queryFn: async () => (await supabase.from("titles").select("code,name")).data ?? [] });
  const shadows = useQuery({ queryKey: ["all-shadows"], queryFn: async () => (await supabase.from("shadows").select("code,name")).data ?? [] });

  async function safe(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); onDone(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs">Coins</Label>
            <Input type="number" value={coinAmt} onChange={(e) => setCoinAmt(Number(e.target.value))} className="w-24" />
          </div>
          <Button size="sm" onClick={() => safe(() => awardCoins({ data: { userId, amount: coinAmt, reason: "admin_award" } }), "Coins awarded")}>
            <Plus className="h-3 w-3 mr-1" /><Coins className="h-3 w-3 mr-1" />Award
          </Button>
          <Button size="sm" variant="outline" onClick={() => safe(() => awardCoins({ data: { userId, amount: -Math.abs(coinAmt), reason: "admin_deduct" } }), "Coins removed")}>
            <Minus className="h-3 w-3 mr-1" />Remove
          </Button>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Badge</Label>
            <Select value={badgeId} onValueChange={setBadgeId}>
              <SelectTrigger><SelectValue placeholder="Pick badge" /></SelectTrigger>
              <SelectContent>{(badges.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!badgeId} onClick={() => safe(() => awardBadge({ data: { userId, achievementId: badgeId } }), "Badge awarded")}>
            <Award className="h-3 w-3 mr-1" />Award Badge
          </Button>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Title</Label>
            <Select value={titleCode} onValueChange={setTitleCode}>
              <SelectTrigger><SelectValue placeholder="Pick title" /></SelectTrigger>
              <SelectContent>{(titles.data ?? []).map((t) => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!titleCode} onClick={() => safe(() => awardTitle({ data: { userId, titleCode } }), "Title awarded")}>
            <Crown className="h-3 w-3 mr-1" />Award Title
          </Button>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Pass code</Label>
            <Input value={passCode} onChange={(e) => setPassCode(e.target.value)} placeholder="e.g. reroll_pass" />
          </div>
          <Button size="sm" disabled={!passCode} onClick={() => safe(() => grantPass({ data: { userId, passCode } }), "Pass granted")}>
            <Ticket className="h-3 w-3 mr-1" />Grant Pass
          </Button>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Shadow</Label>
            <Select value={shadowCode} onValueChange={setShadowCode}>
              <SelectTrigger><SelectValue placeholder="Pick shadow" /></SelectTrigger>
              <SelectContent>{(shadows.data ?? []).map((s) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!shadowCode} onClick={() => safe(() => unlockShadow({ data: { userId, shadowCode } }), "Shadow unlocked")}>
            <Ghost className="h-3 w-3 mr-1" />Unlock Shadow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
