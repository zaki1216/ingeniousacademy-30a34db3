import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Presentation, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  deleteLectureResource, kindForFile, listLectureResources, saveLectureResource,
  uploadResourceFile, type LectureResource, type ResourceKind,
} from "@/lib/curriculum/resources";

export function LectureResources({ lectureId }: { lectureId: string }) {
  const list = useQuery({
    queryKey: ["lecture-resources", lectureId],
    queryFn: () => listLectureResources(lectureId),
  });
  const [editing, setEditing] = useState<LectureResource | "new" | null>(null);

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="text-sm font-semibold">Study Materials</div>

      {(list.data ?? []).map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm">
          {r.kind === "ppt" ? <Presentation className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">
            {r.title}
            <span className="text-muted-foreground"> · {r.kind.toUpperCase()} · {r.status === "published" ? "Published" : "Draft"}</span>
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit material" onClick={() => setEditing(r)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-7 w-7" aria-label="Remove material"
            onClick={async () => {
              try { await deleteLectureResource(r); await list.refetch(); toast.success("Material removed"); }
              catch (e) { toast.error((e as Error).message); }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {list.data?.length === 0 && editing === null && (
        <p className="text-xs text-muted-foreground">No study material attached yet.</p>
      )}

      {editing === null ? (
        <Button size="sm" variant="outline" className="w-full" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4 mr-1" />Add Material
        </Button>
      ) : (
        <ResourceForm
          lectureId={lectureId}
          initial={editing === "new" ? undefined : editing}
          onDone={async () => { setEditing(null); await list.refetch(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ResourceForm({
  lectureId, initial, onDone, onCancel,
}: {
  lectureId: string;
  initial?: LectureResource;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (initial?.status as "draft" | "published") ?? "draft",
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return toast.error("Add a title");
    if (!initial && !file) return toast.error("Choose a PDF or PPT file");
    if (file && !kindForFile(file)) return toast.error("Only .pdf, .ppt and .pptx files are supported");
    setBusy(true);
    try {
      let kind = (initial?.kind as ResourceKind) ?? "pdf";
      let path = initial?.file_path ?? null;
      if (file) {
        const up = await uploadResourceFile(lectureId, file);
        path = up.path;
        kind = up.kind;
      }
      await saveLectureResource({
        id: initial?.id,
        lecture_id: lectureId,
        title: title.trim(),
        kind,
        file_url: path ?? initial?.file_url ?? "",
        file_path: path,
        status,
      });
      toast.success("Material saved");
      onDone();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2">
      <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Simple Present Tense Notes" /></div>
      <div>
        <Label>File {initial ? "(optional — replaces current)" : "*"}</Label>
        <Input type="file" accept=".pdf,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={(s) => setStatus(s as "draft" | "published")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
