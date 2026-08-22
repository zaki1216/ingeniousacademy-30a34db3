import { useQuery } from "@tanstack/react-query";
import { FileText, Presentation, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listLectureResources, resourceOpenUrl, type LectureResource } from "@/lib/curriculum/resources";

/** Supplementary study material for a lecture. Read-only, no progression effects. */
export function LectureMaterials({ lectureId }: { lectureId: string }) {
  const materials = useQuery({
    queryKey: ["lecture-materials", lectureId],
    queryFn: () => listLectureResources(lectureId),
  });

  const published = (materials.data ?? []).filter((m) => m.status === "published");
  if (published.length === 0) return null;

  async function open(r: LectureResource) {
    try {
      const url = await resourceOpenUrl(r);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="rounded-md border border-primary/20 bg-muted/30 p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">📚 Study Material</div>
      {published.map((m) => (
        <div key={m.id} className="flex items-center gap-2 text-sm">
          {m.kind === "ppt" ? <Presentation className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{m.title}</span>
          <Button size="sm" variant="outline" onClick={() => open(m)}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
          </Button>
        </div>
      ))}
    </div>
  );
}
