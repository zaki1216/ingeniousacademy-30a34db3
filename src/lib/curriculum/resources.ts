import { supabase } from "@/integrations/supabase/client";
import { notifyLectureResourcePublished } from "@/lib/api/notifications.functions";

export type ResourceKind = "pdf" | "ppt";

export type LectureResource = {
  id: string;
  lecture_id: string;
  title: string;
  kind: string;
  file_url: string;
  file_path: string | null;
  status: string;
  published_at: string | null;
};

export const BUCKET = "lecture-materials";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function kindForFile(file: File): ResourceKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "ppt";
  return null;
}

export async function listLectureResources(lectureId: string): Promise<LectureResource[]> {
  const { data, error } = await supabase
    .from("lecture_resources")
    .select("id, lecture_id, title, kind, file_url, file_path, status, published_at")
    .eq("lecture_id", lectureId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function uploadResourceFile(lectureId: string, file: File) {
  const kind = kindForFile(file);
  if (!kind) throw new Error("Only .pdf, .ppt and .pptx files are supported");
  if (file.size > MAX_FILE_BYTES) throw new Error("File is too large (max 20 MB)");
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const path = `${lectureId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return { path, kind };
}

/** Signed URL for opening a stored material (bucket is private). */
export async function resourceOpenUrl(r: LectureResource): Promise<string> {
  if (!r.file_path) return r.file_url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 60 * 60);
  if (error || !data) throw new Error(error?.message ?? "Could not open file");
  return data.signedUrl;
}

export async function saveLectureResource(input: {
  id?: string;
  lecture_id: string;
  title: string;
  kind: ResourceKind;
  file_url: string;
  file_path: string | null;
  status: "draft" | "published";
}) {
  let id = input.id;
  let wasPublished = false;

  if (id) {
    const existing = await supabase
      .from("lecture_resources")
      .select("published_at")
      .eq("id", id)
      .maybeSingle();
    wasPublished = !!existing.data?.published_at;
  }

  const firstPublish = input.status === "published" && !wasPublished;

  const payload = {
    lecture_id: input.lecture_id,
    title: input.title,
    kind: input.kind,
    file_url: input.file_url,
    file_path: input.file_path,
    status: input.status,
    ...(firstPublish ? { published_at: new Date().toISOString() } : {}),
  };

  if (id) {
    const { error } = await supabase.from("lecture_resources").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("lecture_resources").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    id = data.id;
  }

  // Notify only on the first transition to published (server also dedupes).
  if (firstPublish && id) {
    void notifyLectureResourcePublished({ data: { resourceId: id } }).catch(() => undefined);
  }
  return id!;
}

export async function deleteLectureResource(r: LectureResource) {
  const { error } = await supabase.from("lecture_resources").delete().eq("id", r.id);
  if (error) throw new Error(error.message);
  if (r.file_path) await supabase.storage.from(BUCKET).remove([r.file_path]);
}
