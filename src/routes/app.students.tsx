import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createStudent, updateStudent, deleteStudent, resetStudentPassword,
} from "@/lib/api/academy.functions";

export const Route = createFileRoute("/app/students")({ component: StudentsPage });

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  parent_phone: string | null;
  standard_id: string | null;
  is_active: boolean;
};

function StudentsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const createFn = useServerFn(createStudent);
  const updateFn = useServerFn(updateStudent);
  const deleteFn = useServerFn(deleteStudent);
  const resetFn = useServerFn(resetStudentPassword);

  const standards = useQuery({
    queryKey: ["standards"],
    queryFn: async () => {
      const { data } = await supabase.from("standards").select("id, name").order("display_order");
      return data ?? [];
    },
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, phone, parent_phone, standard_id, is_active")
        .order("name");
      return (data ?? []) as Student[];
    },
  });

  const roleRows = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  if (role !== "admin") {
    return <p className="text-muted-foreground">Admins only.</p>;
  }

  const studentIds = new Set(
    (roleRows.data ?? []).filter((r) => r.role === "student").map((r) => r.user_id),
  );
  const list = (students.data ?? []).filter((s) => studentIds.has(s.id));
  const filtered = list.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.email.toLowerCase().includes(q.toLowerCase()),
  );

  const standardName = (id: string | null) =>
    standards.data?.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{list.length} total</p>
        </div>
        <StudentDialog
          mode="create"
          standards={standards.data ?? []}
          onSubmit={async (vals) => {
            await createFn({ data: vals as any });
            toast.success("Student created");
            qc.invalidateQueries({ queryKey: ["students"] });
            qc.invalidateQueries({ queryKey: ["all-roles"] });
          }}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add student
            </Button>
          }
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{s.name}</span>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{standardName(s.standard_id)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">{s.email}</div>
                {(s.phone || s.parent_phone) && (
                  <div className="text-xs text-muted-foreground">
                    {s.phone && <>📱 {s.phone}</>} {s.parent_phone && <>· 👪 {s.parent_phone}</>}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link to="/app/admin/students/$id" params={{ id: s.id }}>
                  <Button size="sm" variant="default">Command Center</Button>
                </Link>
                <StudentDialog
                  mode="edit"
                  initial={s}
                  standards={standards.data ?? []}
                  onSubmit={async (vals) => {
                    await updateFn({ data: { id: s.id, ...vals } as any });
                    toast.success("Student updated");
                    qc.invalidateQueries({ queryKey: ["students"] });
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <ResetPasswordDialog
                  onSubmit={async (password) => {
                    await resetFn({ data: { id: s.id, password } });
                    toast.success("Password reset");
                  }}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the account and all their results. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await deleteFn({ data: { id: s.id } });
                          toast.success("Student deleted");
                          qc.invalidateQueries({ queryKey: ["students"] });
                          qc.invalidateQueries({ queryKey: ["all-roles"] });
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No students found.</p>
        )}
      </div>
    </div>
  );
}

function StudentDialog({
  mode, initial, standards, onSubmit, trigger,
}: {
  mode: "create" | "edit";
  initial?: Student;
  standards: { id: string; name: string }[];
  onSubmit: (vals: Record<string, unknown>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [parentPhone, setParentPhone] = useState(initial?.parent_phone ?? "");
  const [standardId, setStandardId] = useState<string>(initial?.standard_id ?? "none");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const std = standardId === "none" ? null : standardId;
      const vals =
        mode === "create"
          ? { name, email, password, phone: phone || null, parent_phone: parentPhone || null, standard_id: std }
          : { name, phone: phone || null, parent_phone: parentPhone || null, standard_id: std, is_active: isActive };
      await onSubmit(vals);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add student" : "Edit student"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={mode === "edit"} />
          </div>
          {mode === "create" && (
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Parent phone</Label>
              <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Standard</Label>
            <Select value={standardId} onValueChange={setStandardId}>
              <SelectTrigger><SelectValue placeholder="Select standard" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {standards.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Account active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ onSubmit }: { onSubmit: (password: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><KeyRound className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
        <Input
          type="password"
          placeholder="New password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={password.length < 6 || saving}
            onClick={async () => {
              setSaving(true);
              try { await onSubmit(password); setOpen(false); setPassword(""); }
              catch (e: any) { toast.error(e?.message ?? "Failed"); }
              finally { setSaving(false); }
            }}
          >
            {saving ? "…" : "Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
