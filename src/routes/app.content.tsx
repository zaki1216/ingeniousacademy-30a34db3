import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, BookOpen, GraduationCap, Layers, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/content")({ component: ContentPage });

function ContentPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content Library</h1>
        <p className="text-sm text-muted-foreground">Manage standards, subjects, chapters and lectures.</p>
      </div>
      <Tabs defaultValue="standards">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="standards"><GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" />Standards</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="h-4 w-4 mr-1 hidden sm:inline" />Subjects</TabsTrigger>
          <TabsTrigger value="chapters"><Layers className="h-4 w-4 mr-1 hidden sm:inline" />Chapters</TabsTrigger>
          <TabsTrigger value="lectures"><PlayCircle className="h-4 w-4 mr-1 hidden sm:inline" />Lectures</TabsTrigger>
        </TabsList>
        <TabsContent value="standards" className="mt-4"><StandardsTab /></TabsContent>
        <TabsContent value="subjects" className="mt-4"><SubjectsTab /></TabsContent>
        <TabsContent value="chapters" className="mt-4"><ChaptersTab /></TabsContent>
        <TabsContent value="lectures" className="mt-4"><LecturesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Standards ----------
function StandardsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["standards"],
    queryFn: async () => {
      const { data } = await supabase.from("standards").select("*").order("display_order");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <EditorDialog
        title="Add standard"
        fields={[{ name: "name", label: "Name", required: true }, { name: "display_order", label: "Display order", type: "number" }]}
        onSubmit={async (vals) => {
          const { error } = await supabase.from("standards").insert({
            name: vals.name as string,
            display_order: Number(vals.display_order || 0),
          });
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ["standards"] });
        }}
        trigger={<Button><Plus className="h-4 w-4 mr-2" />Add standard</Button>}
      />
      {data?.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">Order: {s.display_order}</div>
            </div>
            <div className="flex gap-2">
              <EditorDialog
                title="Edit standard"
                initial={{ name: s.name, display_order: s.display_order }}
                fields={[{ name: "name", label: "Name", required: true }, { name: "display_order", label: "Display order", type: "number" }]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("standards").update({
                    name: vals.name as string,
                    display_order: Number(vals.display_order || 0),
                  }).eq("id", s.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["standards"] });
                }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
              />
              <DeleteBtn onConfirm={async () => {
                const { error } = await supabase.from("standards").delete().eq("id", s.id);
                if (error) throw error;
                qc.invalidateQueries({ queryKey: ["standards"] });
              }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Subjects ----------
function SubjectsTab() {
  const qc = useQueryClient();
  const standards = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("standards").select("*").order("display_order")).data ?? [],
  });
  const [standardId, setStandardId] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["subjects", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("*").eq("standard_id", standardId).order("subject_name")).data ?? [],
  });

  return (
    <div className="space-y-3">
      <Select value={standardId} onValueChange={setStandardId}>
        <SelectTrigger><SelectValue placeholder="Select standard" /></SelectTrigger>
        <SelectContent>
          {standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {standardId && (
        <EditorDialog
          title="Add subject"
          fields={[
            { name: "subject_name", label: "Subject name", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("subjects").insert({
              standard_id: standardId,
              subject_name: vals.subject_name as string,
              description: (vals.description as string) || null,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["subjects", standardId] });
          }}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Add subject</Button>}
        />
      )}
      {data?.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">{s.subject_name}</div>
              {s.description && <div className="text-xs text-muted-foreground line-clamp-2">{s.description}</div>}
            </div>
            <div className="flex gap-2">
              <EditorDialog
                title="Edit subject"
                initial={{ subject_name: s.subject_name, description: s.description }}
                fields={[
                  { name: "subject_name", label: "Subject name", required: true },
                  { name: "description", label: "Description", type: "textarea" },
                ]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("subjects").update({
                    subject_name: vals.subject_name as string,
                    description: (vals.description as string) || null,
                  }).eq("id", s.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["subjects", standardId] });
                }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
              />
              <DeleteBtn onConfirm={async () => {
                const { error } = await supabase.from("subjects").delete().eq("id", s.id);
                if (error) throw error;
                qc.invalidateQueries({ queryKey: ["subjects", standardId] });
              }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Chapters ----------
function ChaptersTab() {
  const qc = useQueryClient();
  const [standardId, setStandardId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const standards = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("standards").select("*").order("display_order")).data ?? [],
  });
  const subjects = useQuery({
    queryKey: ["subjects", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("*").eq("standard_id", standardId).order("subject_name")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("chapters").select("*").eq("subject_id", subjectId).order("chapter_number")).data ?? [],
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Select value={standardId} onValueChange={(v) => { setStandardId(v); setSubjectId(""); }}>
          <SelectTrigger><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>{standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={setSubjectId} disabled={!standardId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>{subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {subjectId && (
        <EditorDialog
          title="Add chapter"
          fields={[
            { name: "chapter_number", label: "Chapter #", type: "number" },
            { name: "chapter_name", label: "Chapter name", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("chapters").insert({
              subject_id: subjectId,
              chapter_number: Number(vals.chapter_number || 1),
              chapter_name: vals.chapter_name as string,
              description: (vals.description as string) || null,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["chapters", subjectId] });
          }}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Add chapter</Button>}
        />
      )}
      {chapters.data?.map((c) => (
        <Card key={c.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">Ch {c.chapter_number}. {c.chapter_name}</div>
              {c.description && <div className="text-xs text-muted-foreground line-clamp-2">{c.description}</div>}
            </div>
            <div className="flex gap-2">
              <EditorDialog
                title="Edit chapter"
                initial={{ chapter_number: c.chapter_number, chapter_name: c.chapter_name, description: c.description }}
                fields={[
                  { name: "chapter_number", label: "Chapter #", type: "number" },
                  { name: "chapter_name", label: "Chapter name", required: true },
                  { name: "description", label: "Description", type: "textarea" },
                ]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("chapters").update({
                    chapter_number: Number(vals.chapter_number || 1),
                    chapter_name: vals.chapter_name as string,
                    description: (vals.description as string) || null,
                  }).eq("id", c.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["chapters", subjectId] });
                }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
              />
              <DeleteBtn onConfirm={async () => {
                const { error } = await supabase.from("chapters").delete().eq("id", c.id);
                if (error) throw error;
                qc.invalidateQueries({ queryKey: ["chapters", subjectId] });
              }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Lectures ----------
function LecturesTab() {
  const qc = useQueryClient();
  const [standardId, setStandardId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");

  const standards = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("standards").select("*").order("display_order")).data ?? [],
  });
  const subjects = useQuery({
    queryKey: ["subjects", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("*").eq("standard_id", standardId)).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("chapters").select("*").eq("subject_id", subjectId).order("chapter_number")).data ?? [],
  });
  const lectures = useQuery({
    queryKey: ["lectures", chapterId],
    enabled: !!chapterId,
    queryFn: async () => (await supabase.from("lectures").select("*").eq("chapter_id", chapterId).order("lecture_number")).data ?? [],
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={standardId} onValueChange={(v) => { setStandardId(v); setSubjectId(""); setChapterId(""); }}>
          <SelectTrigger><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>{standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setChapterId(""); }} disabled={!standardId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>{subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={chapterId} onValueChange={setChapterId} disabled={!subjectId}>
          <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
          <SelectContent>{chapters.data?.map((c) => <SelectItem key={c.id} value={c.id}>Ch {c.chapter_number}. {c.chapter_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {chapterId && (
        <EditorDialog
          title="Add lecture"
          fields={[
            { name: "lecture_number", label: "Lecture #", type: "number" },
            { name: "lecture_title", label: "Title", required: true },
            { name: "youtube_url", label: "YouTube URL", required: true },
            { name: "description", label: "Description", type: "textarea" },
          ]}
          onSubmit={async (vals) => {
            const { error } = await supabase.from("lectures").insert({
              chapter_id: chapterId,
              lecture_number: Number(vals.lecture_number || 1),
              lecture_title: vals.lecture_title as string,
              youtube_url: vals.youtube_url as string,
              description: (vals.description as string) || null,
            });
            if (error) throw error;
            qc.invalidateQueries({ queryKey: ["lectures", chapterId] });
          }}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />Add lecture</Button>}
        />
      )}
      {lectures.data?.map((l) => (
        <Card key={l.id}>
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium truncate">L {l.lecture_number}. {l.lecture_title}</div>
              <div className="text-xs text-muted-foreground truncate">{l.youtube_url}</div>
            </div>
            <div className="flex gap-2">
              <EditorDialog
                title="Edit lecture"
                initial={{ lecture_number: l.lecture_number, lecture_title: l.lecture_title, youtube_url: l.youtube_url, description: l.description }}
                fields={[
                  { name: "lecture_number", label: "Lecture #", type: "number" },
                  { name: "lecture_title", label: "Title", required: true },
                  { name: "youtube_url", label: "YouTube URL", required: true },
                  { name: "description", label: "Description", type: "textarea" },
                ]}
                onSubmit={async (vals) => {
                  const { error } = await supabase.from("lectures").update({
                    lecture_number: Number(vals.lecture_number || 1),
                    lecture_title: vals.lecture_title as string,
                    youtube_url: vals.youtube_url as string,
                    description: (vals.description as string) || null,
                  }).eq("id", l.id);
                  if (error) throw error;
                  qc.invalidateQueries({ queryKey: ["lectures", chapterId] });
                }}
                trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
              />
              <DeleteBtn onConfirm={async () => {
                const { error } = await supabase.from("lectures").delete().eq("id", l.id);
                if (error) throw error;
                qc.invalidateQueries({ queryKey: ["lectures", chapterId] });
              }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Reusable editor ----------
type Field = { name: string; label: string; type?: "text" | "number" | "textarea"; required?: boolean };

function EditorDialog({
  title, fields, initial, onSubmit, trigger,
}: {
  title: string;
  fields: Field[];
  initial?: Record<string, any>;
  onSubmit: (vals: Record<string, any>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, any>>(initial ?? {});
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit(vals);
      toast.success("Saved");
      setOpen(false);
      if (!initial) setVals({});
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setVals(initial ?? {}); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <Label>{f.label}{f.required && " *"}</Label>
              {f.type === "textarea" ? (
                <Textarea value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={vals[f.name] ?? ""}
                  onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => Promise<void> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
              catch (e: any) { toast.error(e?.message ?? "Failed"); }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
