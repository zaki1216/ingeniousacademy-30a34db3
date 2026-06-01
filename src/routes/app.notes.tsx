import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FileText, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import { toEmbeddablePdfUrl, toDownloadPdfUrl } from "@/lib/utils/pdf";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

function NotesPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [activeNote, setActiveNote] = useState<{ url: string; title: string } | null>(null);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: async () => (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });

  const allChapters = useQuery({
    queryKey: ["chapters-all"],
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name, standard_id")).data ?? [];
      const chs = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id").order("chapter_number")).data ?? [];
      return chs.map((c) => {
        const s = subs.find((x) => x.id === c.subject_id);
        return { ...c, subject_name: s?.subject_name, standard_id: s?.standard_id };
      });
    },
  });

  const notes = useQuery({
    queryKey: ["notes"],
    queryFn: async () => (await supabase.from("notes").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const visibleNotes = useMemo(() => {
    const list = notes.data ?? [];
    if (role === "admin") return list;
    const stdId = profile.data?.standard_id;
    if (!stdId) return [];
    const chapterIds = new Set((allChapters.data ?? []).filter((c) => c.standard_id === stdId).map((c) => c.id));
    return list.filter((n) => chapterIds.has(n.chapter_id));
  }, [notes.data, allChapters.data, role, profile.data]);

  const chapterLabel = (id: string) => {
    const c = allChapters.data?.find((x) => x.id === id);
    return c ? `${c.subject_name} · Ch ${c.chapter_number}. ${c.chapter_name}` : "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-muted-foreground">{visibleNotes.length} PDFs</p>
        </div>
        {role === "admin" && (
          <NoteDialog
            chapters={allChapters.data ?? []}
            onSubmit={async (vals) => {
              const { error } = await supabase.from("notes").insert(vals as any);
              if (error) throw error;
              qc.invalidateQueries({ queryKey: ["notes"] });
            }}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />Add note</Button>}
          />
        )}
      </div>

      {activeNote && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="aspect-[3/4] w-full max-h-[70vh]">
              <iframe
                src={toEmbeddablePdfUrl(activeNote.url)}
                className="w-full h-full rounded-lg border"
                title={activeNote.title}
                allow="autoplay"
              />
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold">{activeNote.title}</div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={activeNote.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />Open
                  </a>
                </Button>
                <Button asChild size="sm">
                  <a href={toDownloadPdfUrl(activeNote.url)} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" />Download
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setActiveNote(null)}>Close</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {visibleNotes.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setActiveNote({ url: n.pdf_url, title: n.title })}>
                <div className="font-medium truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground truncate">{chapterLabel(n.chapter_id)}</div>
                {n.description && <div className="text-xs text-muted-foreground truncate">{n.description}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setActiveNote({ url: n.pdf_url, title: n.title })}>View</Button>
                {role === "admin" && (
                  <>
                    <NoteDialog
                      initial={n}
                      chapters={allChapters.data ?? []}
                      onSubmit={async (vals) => {
                        const { error } = await supabase.from("notes").update(vals as any).eq("id", n.id);
                        if (error) throw error;
                        qc.invalidateQueries({ queryKey: ["notes"] });
                      }}
                      trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete note?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            const { error } = await supabase.from("notes").delete().eq("id", n.id);
                            if (error) toast.error(error.message);
                            else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["notes"] }); }
                          }}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {visibleNotes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
        )}
      </div>
    </div>
  );
}

function NoteDialog({
  initial, chapters, onSubmit, trigger,
}: {
  initial?: any;
  chapters: { id: string; chapter_name: string; chapter_number: number; subject_name?: string }[];
  onSubmit: (vals: Record<string, any>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [chapterId, setChapterId] = useState(initial?.chapter_id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pdfUrl, setPdfUrl] = useState(initial?.pdf_url ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await onSubmit({
        title, chapter_id: chapterId,
        description: description || null,
        pdf_url: pdfUrl,
      });
      toast.success("Saved");
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
        <DialogHeader><DialogTitle>{initial ? "Edit note" : "Add note"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <Label>Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.subject_name} · Ch {c.chapter_number}. {c.chapter_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div>
            <Label>PDF URL (Google Drive share link)</Label>
            <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://drive.google.com/file/d/.../view" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !title || !chapterId || !pdfUrl}>{saving ? "…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
