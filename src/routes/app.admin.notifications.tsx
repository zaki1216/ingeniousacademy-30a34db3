import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { adminPreviewAudience, adminSendNotification } from "@/lib/api/notifications.functions";

export const Route = createFileRoute("/app/admin/notifications")({
  component: AdminNotificationsPage,
  head: () => ({
    meta: [
      { title: "Send Notification | Academy Office" },
      { name: "description", content: "Send Academy notifications to students by standard, subject, course or individually." },
    ],
  }),
});

type TargetKind = "all" | "standards" | "subject" | "chapter" | "users";

function AdminNotificationsPage() {
  const send = useServerFn(adminSendNotification);
  const preview = useServerFn(adminPreviewAudience);

  const [kind, setKind] = useState<TargetKind>("all");
  const [standardId, setStandardId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const standards = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("standards").select("id, name").order("display_order")).data ?? [],
  });
  const subjects = useQuery({
    queryKey: ["subjects-all"],
    queryFn: async () => (await supabase.from("subjects").select("id, subject_name").order("subject_name")).data ?? [],
  });
  const chapters = useQuery({
    queryKey: ["chapters-for-subject", subjectId],
    enabled: kind === "chapter",
    queryFn: async () =>
      (await supabase.from("chapters").select("id, chapter_name, subject_id").order("chapter_number")).data ?? [],
  });
  const students = useQuery({
    queryKey: ["students-basic"],
    enabled: kind === "users",
    queryFn: async () =>
      (await supabase.from("profiles").select("id, name, username").eq("is_active", true).order("name")).data ?? [],
  });

  function buildTarget() {
    if (kind === "all") return { kind: "all" as const };
    if (kind === "standards" && standardId) return { kind: "standards" as const, standardIds: [standardId] };
    if (kind === "subject" && subjectId) return { kind: "subject" as const, subjectId };
    if (kind === "chapter" && chapterId) return { kind: "chapter" as const, chapterId };
    if (kind === "users" && studentId) return { kind: "users" as const, userIds: [studentId] };
    return null;
  }

  useEffect(() => {
    const target = buildTarget();
    setCount(null);
    if (!target) return;
    let cancelled = false;
    preview({ data: { target } })
      .then((r) => !cancelled && setCount(r.count))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, standardId, subjectId, chapterId, studentId]);

  async function submit() {
    const target = buildTarget();
    if (!target) return toast.error("Choose a target audience");
    if (title.trim().length < 2 || message.trim().length < 2) return toast.error("Add a title and message");
    setBusy(true);
    try {
      const res = await send({
        data: { target, title: title.trim(), message: message.trim(), url: url.trim() || null },
      });
      toast.success(`Sent to ${res.recipients} student${res.recipients === 1 ? "" : "s"} (${res.pushed} phone alerts)`);
      setTitle("");
      setMessage("");
      setUrl("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Send Notification</h1>
        <p className="text-sm text-muted-foreground">
          Notifications appear in the student's Academy bell and on their phone if enabled.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audience</CardTitle>
          <CardDescription>
            {count === null ? "Choose who should receive this." : `Approximately ${count} student${count === 1 ? "" : "s"} targeted.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={kind} onValueChange={(v) => setKind(v as TargetKind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All students</SelectItem>
              <SelectItem value="standards">Standard</SelectItem>
              <SelectItem value="subject">Subject / Course</SelectItem>
              <SelectItem value="chapter">Chapter</SelectItem>
              <SelectItem value="users">Individual student</SelectItem>
            </SelectContent>
          </Select>

          {kind === "standards" && (
            <Select value={standardId} onValueChange={setStandardId}>
              <SelectTrigger><SelectValue placeholder="Select standard" /></SelectTrigger>
              <SelectContent>
                {standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {(kind === "subject" || kind === "chapter") && (
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setChapterId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {kind === "chapter" && subjectId && (
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
              <SelectContent>
                {(chapters.data ?? []).filter((c) => c.subject_id === subjectId).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.chapter_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {kind === "users" && (
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.data?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.username ? ` (${s.username})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Message</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tuition timing changed" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Tomorrow's class starts at 5 PM." />
          </div>
          <div>
            <Label>Destination (optional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/app/notes" />
          </div>
          <Button onClick={submit} disabled={busy}>
            <Send className="h-4 w-4 mr-2" /> {busy ? "Sending…" : "Send Notification"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
