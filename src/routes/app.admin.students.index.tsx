import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users, Search, Plus, MoreHorizontal, Eye, Pencil, KeyRound, Trash2,
  UserCheck, UserX, ArrowUpDown, ChevronLeft, ChevronRight, GraduationCap,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import { StudentFormDialog, type StudentFormValues } from "@/components/admin/StudentFormDialog";
import { rankFromXp } from "@/lib/rpg/academyRanks";
import { listAcademyRanks } from "@/lib/api/ranks.functions";
import {
  adminListStudents, adminSetStudentsActive, adminDeleteStudents,
  adminSetStudentsStandard, adminResetStudentPassword,
} from "@/lib/api/students.functions";

export const Route = createFileRoute("/app/admin/students/")({
  head: () => ({
    meta: [
      { title: "Student Management — Academy Office" },
      { name: "description", content: "Add, edit and manage every student account of Ingenious Academy." },
    ],
  }),
  component: StudentManagement,
});

type SortKey = "name" | "standard" | "attendance" | "xp" | "coins" | "status" | "last_active";
const PAGE_SIZE = 20;

function StudentManagement() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const listFn = useServerFn(adminListStudents);
  const ranksFn = useServerFn(listAcademyRanks);
  const activeFn = useServerFn(adminSetStudentsActive);
  const deleteFn = useServerFn(adminDeleteStudents);
  const stdFn = useServerFn(adminSetStudentsStandard);
  const pwdFn = useServerFn(adminResetStudentPassword);

  const q = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => listFn(),
    enabled: role === "admin",
  });
  const ranksQ = useQuery({ queryKey: ["academy-ranks"], queryFn: () => ranksFn() });

  const [search, setSearch] = useState("");
  const [standardId, setStandardId] = useState("all");
  const [status, setStatus] = useState("all");
  const [rankCode, setRankCode] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<StudentFormValues> | null>(null);
  const [pwdFor, setPwdFor] = useState<{ id: string; name: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [bulkStdOpen, setBulkStdOpen] = useState(false);
  const [bulkStd, setBulkStd] = useState("none");
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  const students = q.data?.students ?? [];
  const standards = q.data?.standards ?? [];
  const ranks = ranksQ.data ?? [];
  const stdName = (id: string | null) => standards.find((s) => s.id === id)?.name ?? "—";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-students"] });

  const setActive = useMutation({
    mutationFn: (v: { userIds: string[]; isActive: boolean }) => activeFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.isActive ? "Student(s) activated" : "Student(s) deactivated");
      setSelected([]); invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (userIds: string[]) => deleteFn({ data: { userIds } }),
    onSuccess: () => { toast.success("Deleted"); setConfirmDelete(null); setSelected([]); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStd = useMutation({
    mutationFn: (v: { userIds: string[]; standardId: string | null }) => stdFn({ data: v }),
    onSuccess: () => { toast.success("Standard updated"); setBulkStdOpen(false); setSelected([]); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwd = useMutation({
    mutationFn: (v: { userId: string; password: string }) => pwdFn({ data: v }),
    onSuccess: () => { toast.success("Password reset"); setPwdFor(null); setNewPwd(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = students.filter((c) => {
      if (standardId !== "all" && (c.standard_id ?? "") !== standardId) return false;
      if (status === "active" && !c.is_active) return false;
      if (status === "inactive" && c.is_active) return false;
      if (rankCode !== "all" && (rankFromXp(c.xp, ranks)?.code ?? "") !== rankCode) return false;
      if (attendance !== "all") {
        const pct = c.attendance_total ? (c.attendance_present / c.attendance_total) * 100 : 0;
        if (attendance === "high" && pct < 85) return false;
        if (attendance === "mid" && (pct < 60 || pct >= 85)) return false;
        if (attendance === "low" && pct >= 60) return false;
      }
      if (term) {
        const hay = `${c.name ?? ""} ${c.username ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.roll_number ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (c: (typeof students)[number]) => {
      switch (sort.key) {
        case "standard": return stdName(c.standard_id).toLowerCase();
        case "attendance": return c.attendance_total ? c.attendance_present / c.attendance_total : -1;
        case "xp": return c.xp;
        case "coins": return c.coins;
        case "status": return c.is_active ? 1 : 0;
        case "last_active": return c.last_active ?? "";
        default: return (c.name ?? "").toLowerCase();
      }
    };
    return [...filtered].sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }, [students, search, standardId, status, rankCode, attendance, sort, ranks, standards]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const toEditValues = (c: (typeof students)[number]): Partial<StudentFormValues> => ({
    id: c.id,
    name: c.name ?? "",
    username: c.username ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    parent_name: c.parent_name ?? "",
    parent_phone: c.parent_phone ?? "",
    parent_whatsapp: c.parent_whatsapp ?? "",
    roll_number: c.roll_number ?? "",
    admission_date: c.admission_date ?? "",
    standard_id: c.standard_id ?? "none",
    is_active: c.is_active,
  });

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  const attPct = (c: (typeof students)[number]) =>
    c.attendance_total ? Math.round((c.attendance_present / c.attendance_total) * 100) : 0;

  return (
    <div className="space-y-4">
      <HeadmasterHeader
        icon={<GraduationCap className="h-7 w-7" />}
        title="Student Management"
        tagline="Add, edit and manage every student account of the academy."
        lumi="Use the action menu on any row to view, edit, reset a password, or change account status."
      />

      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/85 backdrop-blur border-b">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0 text-sm font-semibold truncate">
            <Users className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            {rows.length} of {students.length} students
          </div>
          <Button size="sm" className="shrink-0" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, username, email…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <FilterSelect value={standardId} onChange={(v) => { setStandardId(v); setPage(1); }}
            items={[{ value: "all", label: "All standards" }, ...standards.map((s) => ({ value: s.id, label: s.name }))]} />
          <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            items={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active only" }, { value: "inactive", label: "Inactive only" }]} />
          <FilterSelect value={rankCode} onChange={(v) => { setRankCode(v); setPage(1); }}
            items={[{ value: "all", label: "All ranks" }, ...ranks.map((r) => ({ value: r.code, label: `${r.icon} ${r.name}` }))]} />
          <FilterSelect value={attendance} onChange={(v) => { setAttendance(v); setPage(1); }}
            items={[
              { value: "all", label: "Any attendance" },
              { value: "high", label: "85%+" },
              { value: "mid", label: "60–84%" },
              { value: "low", label: "Below 60%" },
            ]} />
        </CardContent>
      </Card>

      {/* Bulk bar */}
      {selected.length > 0 && (
        <Card className="border-primary/40">
          <CardContent className="p-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium px-1">{selected.length} selected</span>
            <Button size="sm" variant="outline" onClick={() => setActive.mutate({ userIds: selected, isActive: true })}>
              <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActive.mutate({ userIds: selected, isActive: false })}>
              <UserX className="h-3.5 w-3.5 mr-1" /> Deactivate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkStdOpen(true)}>Change standard</Button>
            <Button size="sm" variant="outline" className="text-destructive"
              onClick={() => setConfirmDelete(selected)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Button>
          </CardContent>
        </Card>
      )}

      {q.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No students match your filters.</CardContent></Card>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox checked={allChecked}
                        onCheckedChange={(c) =>
                          setSelected(c ? Array.from(new Set([...selected, ...pageRows.map((r) => r.id)]))
                            : selected.filter((id) => !pageRows.some((r) => r.id === id)))} />
                    </TableHead>
                    <SortHead label="Student" active={sort} k="name" onClick={toggleSort} />
                    <SortHead label="Standard" active={sort} k="standard" onClick={toggleSort} />
                    <SortHead label="Att. %" active={sort} k="attendance" onClick={toggleSort} className="hidden lg:table-cell" />
                    <TableHead className="hidden xl:table-cell">Rank</TableHead>
                    <SortHead label="XP" active={sort} k="xp" onClick={toggleSort} className="hidden lg:table-cell" />
                    <SortHead label="Coins" active={sort} k="coins" onClick={toggleSort} className="hidden xl:table-cell" />
                    <SortHead label="Status" active={sort} k="status" onClick={toggleSort} />
                    <SortHead label="Last active" active={sort} k="last_active" onClick={toggleSort} className="hidden xl:table-cell" />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((c) => {
                    const rank = rankFromXp(c.xp, ranks);
                    return (
                      <TableRow key={c.id} className={c.is_active ? "" : "opacity-70"}>
                        <TableCell className="py-1.5">
                          <Checkbox checked={selected.includes(c.id)}
                            onCheckedChange={(chk) =>
                              setSelected((s) => (chk ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={c.name} />
                            <div className="min-w-0">
                              <div className="font-medium truncate text-sm">{c.name ?? "—"}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {c.username ? `@${c.username}` : c.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5 text-sm">{stdName(c.standard_id)}</TableCell>
                        <TableCell className="py-1.5 text-sm hidden lg:table-cell">{attPct(c)}%</TableCell>
                        <TableCell className="py-1.5 hidden xl:table-cell">
                          <span className="text-xs">{rank ? `${rank.icon} ${rank.name}` : "—"}</span>
                        </TableCell>
                        <TableCell className="py-1.5 text-sm hidden lg:table-cell font-orbitron">{c.xp.toLocaleString()}</TableCell>
                        <TableCell className="py-1.5 text-sm hidden xl:table-cell font-orbitron">{c.coins}</TableCell>
                        <TableCell className="py-1.5"><StatusBadge active={c.is_active} /></TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground hidden xl:table-cell">
                          {c.last_active ?? "—"}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <RowActions
                            id={c.id}
                            isActive={c.is_active}
                            onEdit={() => { setEditing(toEditValues(c)); setFormOpen(true); }}
                            onToggle={() => setActive.mutate({ userIds: [c.id], isActive: !c.is_active })}
                            onReset={() => { setPwdFor({ id: c.id, name: c.name ?? "student" }); setNewPwd(""); }}
                            onDelete={() => setConfirmDelete([c.id])}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile compact cards */}
          <div className="md:hidden divide-y rounded-lg border bg-card">
            {pageRows.map((c) => {
              const rank = rankFromXp(c.xp, ranks);
              return (
                <div key={c.id} className={`p-2 ${c.is_active ? "" : "opacity-70"}`}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium truncate">{c.name ?? "—"}</span>
                        <StatusDot active={c.is_active} />
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {stdName(c.standard_id)} · {c.username ? `@${c.username}` : c.email}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {attPct(c)}% att · {rank?.icon ?? ""} {rank?.name ?? "—"} · {c.xp.toLocaleString()} XP · {c.coins} coins
                      </div>
                    </div>
                    <RowActions
                      id={c.id}
                      isActive={c.is_active}
                      onEdit={() => { setEditing(toEditValues(c)); setFormOpen(true); }}
                      onToggle={() => setActive.mutate({ userIds: [c.id], isActive: !c.is_active })}
                      onReset={() => { setPwdFor({ id: c.id, name: c.name ?? "student" }); setNewPwd(""); }}
                      onDelete={() => setConfirmDelete([c.id])}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {current} of {pageCount}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        standards={standards}
        initial={editing}
      />

      {/* Reset password */}
      <Dialog open={!!pwdFor} onOpenChange={(o) => !o && setPwdFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new temporary password for {pwdFor?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">New password</Label>
            <Input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdFor(null)}>Cancel</Button>
            <Button disabled={newPwd.length < 6 || resetPwd.isPending}
              onClick={() => pwdFor && resetPwd.mutate({ userId: pwdFor.id, password: newPwd })}>
              {resetPwd.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk standard */}
      <Dialog open={bulkStdOpen} onOpenChange={setBulkStdOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change standard</DialogTitle>
            <DialogDescription>Move {selected.length} student(s) to another standard.</DialogDescription>
          </DialogHeader>
          <Select value={bulkStd} onValueChange={setBulkStd}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {standards.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStdOpen(false)}>Cancel</Button>
            <Button disabled={changeStd.isPending}
              onClick={() => changeStd.mutate({ userIds: selected, standardId: bulkStd === "none" ? null : bulkStd })}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.length ?? 0} student(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their accounts and records. This cannot be undone.
              To keep academic data, deactivate the account instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={del.isPending}
              onClick={() => confirmDelete && del.mutate(confirmDelete)}
            >{del.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-400 grid place-items-center text-xs font-bold">
      {(name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"} className="text-[10px] gap-1">
      <span className={active ? "text-emerald-300" : "text-red-400"}>●</span>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`text-[10px] ${active ? "text-emerald-400" : "text-red-400"}`}>●</span>;
}

function FilterSelect({
  value, onChange, items,
}: { value: string; onChange: (v: string) => void; items: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SortHead({
  label, k, active, onClick, className,
}: { label: string; k: SortKey; active: { key: SortKey; dir: string }; onClick: (k: SortKey) => void; className?: string }) {
  return (
    <TableHead className={className}>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onClick(k)}>
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active.key === k ? "opacity-100" : "opacity-30"}`} />
      </button>
    </TableHead>
  );
}

function RowActions({
  id, isActive, onEdit, onToggle, onReset, onDelete,
}: {
  id: string; isActive: boolean;
  onEdit: () => void; onToggle: () => void; onReset: () => void; onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Student actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/app/admin/students/$id" params={{ id }}>
            <Eye className="h-4 w-4 mr-2" /> View profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Edit details</DropdownMenuItem>
        <DropdownMenuItem onClick={onToggle}>
          {isActive ? <><UserX className="h-4 w-4 mr-2" /> Deactivate</> : <><UserCheck className="h-4 w-4 mr-2" /> Activate</>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReset}><KeyRound className="h-4 w-4 mr-2" /> Reset password</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete student
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
