import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Compass, Eye, FileText, GraduationCap, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { fetchBoards, fetchStandards } from "@/lib/curriculum/hierarchy";
import { CurriculumExplorer } from "@/components/admin/CurriculumExplorer";
import { SharedCurriculumManager } from "@/components/admin/SharedCurriculumManager";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/content")({
  head: () => ({
    meta: [
      { title: "Academy Content — Curriculum Explorer" },
      { name: "description", content: "Manage Standards, Subjects, Courses, Chapters and Lectures in one place." },
      { property: "og:title", content: "Academy Content — Curriculum Explorer" },
      { property: "og:description", content: "Manage Standards, Subjects, Courses, Chapters and Lectures in one place." },
    ],
  }),
  component: ContentPage,
});

function ContentPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Academy Content</h1>
          <p className="text-sm text-muted-foreground">
            Standard → Subject → Course → Chapter → Lecture, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/notes"><Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" />Notes</Button></Link>
          <Link to="/app/admin/lecture-views"><Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />Engagement</Button></Link>
        </div>
      </div>
      <Tabs defaultValue="explorer">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="explorer"><Compass className="h-4 w-4 mr-1 hidden sm:inline" />Explorer</TabsTrigger>
          <TabsTrigger value="shared"><Share2 className="h-4 w-4 mr-1 hidden sm:inline" />Shared courses</TabsTrigger>
          <TabsTrigger value="structure"><GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" />Boards &amp; standards</TabsTrigger>
        </TabsList>
        <TabsContent value="explorer" className="mt-4"><CurriculumExplorer /></TabsContent>
        <TabsContent value="shared" className="mt-4"><SharedCurriculumManager /></TabsContent>
        <TabsContent value="structure" className="mt-4"><StructureTab /></TabsContent>
      </Tabs>
    </div>
  );
}


/* ---------------------- Boards & standards ---------------------- */

function StructureTab() {
  const qc = useQueryClient();
  const boards = useQuery({ queryKey: ["boards"], queryFn: fetchBoards });
  const standards = useQuery({ queryKey: ["cx-standards", ""], queryFn: () => fetchStandards() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["boards"] });
    qc.invalidateQueries({ queryKey: ["cx-standards"] });
    qc.invalidateQueries({ queryKey: ["standards"] });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Boards</h2>
          <EditorDialog
            title="Add board"
            fields={[{ name: "name", label: "Name", required: true }, { name: "display_order", label: "Display order", type: "number" }]}
            onSubmit={async (vals) => {
              const { error } = await supabase.from("boards").insert({
                name: vals.name as string,
                display_order: Number(vals.display_order || 0),
              });
              if (error) throw error;
              refresh();
            }}
            trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add board</Button>}
          />
        </div>
        {boards.data?.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{b.name}</div>
                <div className="text-xs text-muted-foreground">Order: {b.display_order}</div>
              </div>
              <div className="flex gap-2">
                <EditorDialog
                  title="Edit board"
                  initial={{ name: b.name, display_order: b.display_order }}
                  fields={[{ name: "name", label: "Name", required: true }, { name: "display_order", label: "Display order", type: "number" }]}
                  onSubmit={async (vals) => {
                    const { error } = await supabase.from("boards").update({
                      name: vals.name as string,
                      display_order: Number(vals.display_order || 0),
                    }).eq("id", b.id);
                    if (error) throw error;
                    refresh();
                  }}
                  trigger={<Button size="sm" variant="outline" aria-label="Edit board"><Pencil className="h-4 w-4" /></Button>}
                />
                <DeleteBtn onConfirm={async () => {
                  const { error } = await supabase.from("boards").delete().eq("id", b.id);
                  if (error) throw error;
                  refresh();
                }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Standards</h2>
          <StandardDialog boards={boards.data ?? []} onSaved={refresh} trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add standard</Button>} />
        </div>
        {standards.data?.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {boards.data?.find((b) => b.id === s.board_id)?.name ?? "No board"} • Order: {s.display_order}
                </div>
              </div>
              <div className="flex gap-2">
                <StandardDialog
                  boards={boards.data ?? []}
                  initial={s}
                  onSaved={refresh}
                  trigger={<Button size="sm" variant="outline" aria-label="Edit standard"><Pencil className="h-4 w-4" /></Button>}
                />
                <DeleteBtn onConfirm={async () => {
                  const { error } = await supabase.from("standards").delete().eq("id", s.id);
                  if (error) throw error;
                  refresh();
                }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function StandardDialog({
  boards, initial, onSaved, trigger,
}: {
  boards: { id: string; name: string }[];
  initial?: { id: string; name: string; display_order: number; board_id: string | null };
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [order, setOrder] = useState(initial?.display_order ?? 0);
  const [boardId, setBoardId] = useState(initial?.board_id ?? boards[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit standard" : "Add standard"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Display order</Label><Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></div>
          <div>
            <Label>Board</Label>
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
              <SelectContent>{boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                const payload = { name: name.trim(), display_order: order, board_id: boardId || null };
                const { error } = initial
                  ? await supabase.from("standards").update(payload).eq("id", initial.id)
                  : await supabase.from("standards").insert(payload);
                if (error) throw error;
                toast.success("Saved");
                setOpen(false);
                onSaved();
              } catch (e) { toast.error((e as Error).message); }
              finally { setSaving(false); }
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------- Reusable editor ---------------------- */

type Field = { name: string; label: string; type?: "text" | "number"; required?: boolean };

function EditorDialog({
  title, fields, initial, onSubmit, trigger,
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, unknown>;
  onSubmit: (vals: Record<string, unknown>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, unknown>>(initial ?? {});
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setVals(initial ?? {}); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <Label>{f.label}{f.required && " *"}</Label>
              <Input
                type={f.type === "number" ? "number" : "text"}
                value={String(vals[f.name] ?? "")}
                onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await onSubmit(vals); toast.success("Saved"); setOpen(false); }
              catch (e) { toast.error((e as Error).message ?? "Failed"); }
              finally { setSaving(false); }
            }}
          >{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try { await onConfirm(); toast.success("Deleted"); }
              catch (e) { toast.error((e as Error).message ?? "Failed"); }
            }}
          >Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
