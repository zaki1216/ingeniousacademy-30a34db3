import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Coins, Award, Crown, Minus, Plus, ChevronDown, ChevronRight, ListChecks, KeyRound, Power } from "lucide-react";
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
} from "@/lib/api/admin-rewards.functions";
import { adminGetStudentAdminInfo, adminSetStudentsActive, adminResetStudentPassword } from "@/lib/api/students.functions";

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
      <Link to="/app/admin/students" className="text-xs text-muted-foreground inline-flex items-center gap-1">
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
              <Badge variant="secondary">{rank?.label ?? "—"}</Badge>
              <Badge variant="secondary">💰 {d.stats?.coins ?? 0}</Badge>
              <Badge variant="secondary">🔥 {d.stats?.streak_days ?? 0}d</Badge>
              <Badge variant="outline">
                📅 {d.attendance.present}/{d.attendance.total}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <StudentRecord userId={id} />

      <AccountActions userId={id} onDone={refresh} />
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

      </div>

    </div>
  );
}

function StudentRecord({ userId }: { userId: string }) {
  const fn = useServerFn(adminGetStudentAdminInfo);
  const q = useQuery({ queryKey: ["admin-student-record", userId], queryFn: () => fn({ data: { userId } }) });
  if (q.isLoading || !q.data) return <Skeleton className="h-40" />;
  const d = q.data as any;
  const p = d.profile ?? {};
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Personal & Parent</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row k="Full name" v={p.name} />
          <Row k="Username" v={p.username ? `@${p.username}` : "—"} />
          <Row k="Roll number" v={p.roll_number} />
          <Row k="Admission date" v={p.admission_date} />
          <Row k="Student mobile" v={p.phone} />
          <Row k="Parent name" v={p.parent_name} />
          <Row k="Parent mobile" v={p.parent_phone} />
          <Row k="Parent WhatsApp" v={p.parent_whatsapp} />
          <Row k="Email" v={p.email} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Academic</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row k="Standard" v={d.standardName} />
          <Row k="Subjects" v={(d.subjects ?? []).map((s: any) => s.subject_name).join(", ") || "—"} />
          <Row k="Current lesson" v={d.recentVideos?.[0]?.title ?? "—"} />
          <div className="pt-2 text-xs text-muted-foreground">Recent activity</div>
          {(d.recentVideos ?? []).slice(0, 5).map((v: any, i: number) => (
            <div key={i} className="text-xs truncate">• {v.title} — {new Date(v.at).toLocaleDateString()}</div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Administrative</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row k="Account status" v={p.is_active === false ? "🔴 Inactive" : "🟢 Active"} />
          <Row k="Login blocked" v={d.banned ? "Yes" : "No"} />
          <Row k="Last sign-in" v={d.lastSignInAt ? new Date(d.lastSignInAt).toLocaleString() : "—"} />
          <Row k="Last active" v={d.stats?.last_active_date ?? "—"} />
          <Row k="Account created" v={d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"} />
          <Row k="Username locked" v={p.username_locked ? "Yes" : "No"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="text-xs text-right break-words min-w-0">{v || "—"}</span>
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

  const [coinAmt, setCoinAmt] = useState(50);
  const [badgeId, setBadgeId] = useState("");
  const [titleCode, setTitleCode] = useState("");

  const badges = useQuery({ queryKey: ["all-achievements"], queryFn: async () => (await supabase.from("achievements").select("id,name,code")).data ?? [] });
  const titles = useQuery({ queryKey: ["all-titles"], queryFn: async () => (await supabase.from("titles").select("code,name")).data ?? [] });

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

      </CardContent>
    </Card>
  );
}

function AccountActions({ userId, onDone }: { userId: string; onDone: () => void }) {
  const setActive = useServerFn(adminSetStudentsActive);
  const resetPwd = useServerFn(adminResetStudentPassword);
  const [pwd, setPwd] = useState("");

  async function safe(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok); onDone(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Account Actions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => safe(() => setActive({ data: { ids: [userId], isActive: true } }), "Account activated")}>
            <Power className="h-3 w-3 mr-1" />Activate
          </Button>
          <Button size="sm" variant="outline" onClick={() => safe(() => setActive({ data: { ids: [userId], isActive: false } }), "Account deactivated")}>
            <Power className="h-3 w-3 mr-1" />Deactivate
          </Button>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">New password</Label>
            <Input type="text" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Temporary password" />
          </div>
          <Button size="sm" disabled={pwd.length < 6} onClick={() => safe(async () => { await resetPwd({ data: { id: userId, password: pwd } }); setPwd(""); }, "Password reset")}>
            <KeyRound className="h-3 w-3 mr-1" />Reset password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
