import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/announcements")({ component: AnnouncementsPage });

function AnnouncementsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} total</p>
        </div>
        {role === "admin" && (
          <Editor
            onSubmit={async (vals) => {
              const { error } = await supabase.from("announcements").insert(vals as any);
              if (error) throw error;
              qc.invalidateQueries({ queryKey: ["announcements"] });
            }}
            trigger={<Button><Plus className="h-4 w-4 mr-2" />New announcement</Button>}
          />
        )}
      </div>

      <div className="space-y-2">
        {data?.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                {role === "admin" && (
                  <div className="flex gap-1">
                    <Editor
                      initial={a}
                      onSubmit={async (vals) => {
                        const { error } = await supabase.from("announcements").update(vals as any).eq("id", a.id);
                        if (error) throw error;
                        qc.invalidateQueries({ queryKey: ["announcements"] });
                      }}
                      trigger={<Button size="sm" variant="outline"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            await supabase.from("announcements").delete().eq("id", a.id);
                            qc.invalidateQueries({ queryKey: ["announcements"] });
                            toast.success("Deleted");
                          }}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}

function Editor({ initial, onSubmit, trigger }: {
  initial?: any;
  onSubmit: (vals: Record<string, any>) => Promise<void>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit announcement" : "New announcement"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={saving || !title || !message} onClick={async () => {
            setSaving(true);
            try { await onSubmit({ title, message }); toast.success("Saved"); setOpen(false); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
            finally { setSaving(false); }
          }}>{saving ? "…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
