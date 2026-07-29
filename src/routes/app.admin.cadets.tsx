import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Users, ShieldCheck, Search, Trash2, UserCheck, UserX, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

import {
  adminListCadets, adminSetCadetActive, adminDeleteCadet,
} from "@/lib/api/cadets.functions";

export const Route = createFileRoute("/app/admin/cadets")({
  head: () => ({ meta: [{ title: "All Cadets — Academy Office" }] }),
  component: CadetsList,
});

function CadetsList() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCadets);
  const toggleFn = useServerFn(adminSetCadetActive);
  const deleteFn = useServerFn(adminDeleteCadet);

  const q = useQuery({
    queryKey: ["admin-cadets"],
    queryFn: () => listFn(),
    enabled: role === "admin",
  });

  const [search, setSearch] = useState("");
  const [standardId, setStandardId] = useState("all");
  const [status, setStatus] = useState("all");
  const [toDelete, setToDelete] = useState<{ id: string; name: string | null } | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { userId: string; isActive: boolean }) => toggleFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? "Cadet activated" : "Cadet deactivated");
      qc.invalidateQueries({ queryKey: ["admin-cadets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Cadet deleted");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-cadets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cadets = q.data?.cadets ?? [];
  const standards = q.data?.standards ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cadets.filter((c) => {
      if (standardId !== "all" && (c.standard_id ?? "") !== standardId) return false;
      if (status === "active" && !c.is_active) return false;
      if (status === "inactive" && c.is_active) return false;
      if (term) {
        const hay = `${c.name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [cadets, search, standardId, status]);

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<ShieldCheck className="h-7 w-7" />}
        title="All Cadets"
        tagline="Every Cadet of the Academy — search, manage, promote, or retire."
        lumi="Click any Cadet's row to open their Command Center with full journey, attendance and rewards."
      />

      <Card>
        <CardContent className="p-3 grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, email, phone…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={standardId} onValueChange={setStandardId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All standards</SelectItem>
              {standards.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-xs text-muted-foreground px-2">
            <Users className="h-3.5 w-3.5 mr-1.5" /> {filtered.length} / {cadets.length}
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No cadets match your filters.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const attPct = c.attendance_total > 0
              ? Math.round((c.attendance_present / c.attendance_total) * 100) : 0;
            return (
              <Card key={c.id} className={c.is_active ? "" : "opacity-60"}>
                <CardContent className="p-3 flex flex-wrap items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 grid place-items-center font-bold shrink-0">
                    {(c.name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold truncate">{c.name ?? "—"}</div>
                      {!c.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.email}{c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 text-xs">
                    <div className="text-center"><div className="font-orbitron font-bold">Lv {c.level}</div><div className="text-muted-foreground">XP {c.xp.toLocaleString()}</div></div>
                    <div className="text-center"><div className="font-orbitron font-bold">{c.coins}</div><div className="text-muted-foreground">coins</div></div>
                    <div className="text-center"><div className="font-orbitron font-bold">{attPct}%</div><div className="text-muted-foreground">att.</div></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link to="/app/admin/students/$id" params={{ id: c.id }}>
                      <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</Button>
                    </Link>
                    <Button size="icon" variant="ghost"
                      onClick={() => toggle.mutate({ userId: c.id, isActive: !c.is_active })}
                      aria-label={c.is_active ? "Deactivate" : "Activate"}>
                      {c.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => setToDelete({ id: c.id, name: c.name })} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cadet?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <b>{toDelete?.name ?? "this cadet"}</b> and all their auth records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && del.mutate(toDelete.id)}
              disabled={del.isPending}
            >{del.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
