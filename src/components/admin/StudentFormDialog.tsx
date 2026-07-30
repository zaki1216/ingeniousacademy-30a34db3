import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { adminCreateStudent, adminUpdateStudent } from "@/lib/api/students.functions";
import { suggestUsername, validateUsername } from "@/lib/username";

export type StudentFormValues = {
  id?: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  phone: string;
  parent_name: string;
  parent_phone: string;
  parent_whatsapp: string;
  roll_number: string;
  admission_date: string;
  standard_id: string;
  is_active: boolean;
};

const EMPTY: StudentFormValues = {
  name: "", username: "", password: "", email: "", phone: "",
  parent_name: "", parent_phone: "", parent_whatsapp: "", roll_number: "",
  admission_date: new Date().toISOString().slice(0, 10), standard_id: "none", is_active: true,
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  standards: { id: string; name: string }[];
  initial?: Partial<StudentFormValues> | null;
};

export function StudentFormDialog({ open, onOpenChange, standards, initial }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(adminCreateStudent);
  const updateFn = useServerFn(adminUpdateStudent);
  const isEdit = Boolean(initial?.id);
  const [v, setV] = useState<StudentFormValues>(EMPTY);

  useEffect(() => {
    if (open) setV({ ...EMPTY, ...(initial ?? {}), password: "" } as StudentFormValues);
  }, [open, initial]);

  const set = <K extends keyof StudentFormValues>(k: K, value: StudentFormValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  const save = useMutation({
    mutationFn: async () => {
      if (!v.name.trim()) throw new Error("Full name is required");
      const uCheck = validateUsername(v.username);
      if (!uCheck.ok) throw new Error(uCheck.reason ?? "Invalid username");
      if (!isEdit && (v.password ?? "").length < 6) throw new Error("Temporary password must be 6+ characters");
      if (!v.parent_phone.trim()) throw new Error("Parent mobile number is required");

      const payload = {
        name: v.name.trim(),
        username: v.username.trim(),
        email: v.email.trim() || null,
        phone: v.phone.trim() || null,
        parent_name: v.parent_name.trim() || null,
        parent_phone: v.parent_phone.trim() || null,
        parent_whatsapp: v.parent_whatsapp.trim() || null,
        roll_number: v.roll_number.trim() || null,
        admission_date: v.admission_date || null,
        standard_id: v.standard_id === "none" ? null : v.standard_id,
        is_active: v.is_active,
      };
      if (isEdit) return updateFn({ data: { userId: initial!.id!, ...payload } });
      return createFn({ data: { ...payload, password: v.password! } });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Student updated" : "Student created");
      qc.invalidateQueries({ queryKey: ["admin-students"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>
            Official records stay with the academy. The username is the student's public identity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name *">
            <Input value={v.name} onChange={(e) => set("name", e.target.value)}
              onBlur={() => { if (!v.username && v.name) set("username", suggestUsername(v.name)); }} />
          </Field>
          <Field label="Username *" hint="4–20 chars · letters, numbers, _ and .">
            <Input value={v.username} onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label="Parent name">
            <Input value={v.parent_name} onChange={(e) => set("parent_name", e.target.value)} />
          </Field>
          <Field label="Parent mobile *">
            <Input value={v.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} />
          </Field>
          <Field label="Parent WhatsApp">
            <Input value={v.parent_whatsapp} onChange={(e) => set("parent_whatsapp", e.target.value)} />
          </Field>
          <Field label="Student mobile">
            <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email" hint="Optional — a login email is generated if empty">
            <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Standard / Class">
            <Select value={v.standard_id} onValueChange={(x) => set("standard_id", x)}>
              <SelectTrigger><SelectValue placeholder="Select standard" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {standards.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Roll number">
            <Input value={v.roll_number} onChange={(e) => set("roll_number", e.target.value)} />
          </Field>
          <Field label="Admission date">
            <Input type="date" value={v.admission_date} onChange={(e) => set("admission_date", e.target.value)} />
          </Field>
          {!isEdit && (
            <Field label="Temporary password *">
              <Input value={v.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
          )}
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={v.is_active} onCheckedChange={(c) => set("is_active", c)} id="active" />
            <Label htmlFor="active">{v.is_active ? "Active — can log in" : "Inactive — login blocked"}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
