/**
 * Curriculum Explorer — the primary admin content-management surface.
 *
 * Navigate Board → Standard → Subject → Course → Chapter → Lecture with
 * breadcrumbs, inline creation, ordering and status control. It reads and
 * writes the existing curriculum tables through `@/lib/curriculum/hierarchy`,
 * so no content or student progress is duplicated.
 */
import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, ChevronRight, Eye, Layers, Pencil, Plus, PlayCircle, Search, Share2, Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LectureResources } from "@/components/admin/LectureResources";
import { YouTubePlayer } from "@/components/gamification/YouTubePlayer";
import { AcademyEmpty } from "@/components/academy/AcademyStates";

import {
  deleteAcademicSubject, deleteChapter, deleteCourse, deleteLecture,
  fetchAcademicSubjects, fetchBoards, fetchChapters, fetchCourseMappings,
  fetchCoursesForSubject, fetchDirectChapters, fetchLectures, fetchStandards,
  saveAcademicSubject, saveChapter, saveCourse, saveLecture, swapOrder,
  type AcademicSubject, type Chapter, type Course, type Lecture,
} from "@/lib/curriculum/hierarchy";

export function CurriculumExplorer() {
  const qc = useQueryClient();
  const [boardId, setBoardId] = useState("");
  const [standardId, setStandardId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");

  const boards = useQuery({ queryKey: ["boards"], queryFn: fetchBoards });
  const standards = useQuery({
    queryKey: ["cx-standards", boardId],
    queryFn: () => fetchStandards(boardId || undefined),
  });
  const subjects = useQuery({
    queryKey: ["cx-subjects", standardId],
    enabled: !!standardId,
    queryFn: () => fetchAcademicSubjects(standardId),
  });
  const courses = useQuery({
    queryKey: ["cx-courses", subjectId],
    enabled: !!subjectId,
    queryFn: () => fetchCoursesForSubject(subjectId),
  });

  const board = boards.data?.find((b) => b.id === boardId);
  const standard = standards.data?.find((s) => s.id === standardId);
  const subject = subjects.data?.find((s) => s.id === subjectId);
  const course = courses.data?.find((c) => c.id === courseId);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cx-subjects"] });
    qc.invalidateQueries({ queryKey: ["cx-courses"] });
    qc.invalidateQueries({ queryKey: ["cx-chapters"] });
    qc.invalidateQueries({ queryKey: ["cx-lectures"] });
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <Select value={boardId} onValueChange={(v) => { setBoardId(v); setStandardId(""); setSubjectId(""); setCourseId(""); }}>
          <SelectTrigger aria-label="Board"><SelectValue placeholder="Board" /></SelectTrigger>
          <SelectContent>
            {boards.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={standardId} onValueChange={(v) => { setStandardId(v); setSubjectId(""); setCourseId(""); }}>
          <SelectTrigger aria-label="Standard"><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>
            {standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setCourseId(""); }} disabled={!standardId}>
          <SelectTrigger aria-label="Subject"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={courseId} onValueChange={setCourseId} disabled={!subjectId}>
          <SelectTrigger aria-label="Course"><SelectValue placeholder="Course / Module" /></SelectTrigger>
          <SelectContent>
            {courses.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.subject_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {[
          { label: "Academy Content", onClick: () => { setStandardId(""); setSubjectId(""); setCourseId(""); } },
          { label: board?.name ?? "Board", onClick: () => { setStandardId(""); setSubjectId(""); setCourseId(""); } },
          ...(standard ? [{ label: standard.name, onClick: () => { setSubjectId(""); setCourseId(""); } }] : []),
          ...(subject ? [{ label: subject.display_name || subject.name, onClick: () => setCourseId("") }] : []),
          ...(course ? [{ label: course.subject_name, onClick: () => {} }] : []),
        ].map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            <button type="button" className="hover:text-foreground truncate max-w-[45vw]" onClick={crumb.onClick}>
              {crumb.label}
            </button>
          </Fragment>
        ))}
      </nav>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search subjects, courses, chapters, lectures"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search curriculum"
        />
      </div>

      {!standardId && <AcademyEmpty title="Pick a standard" description="Choose a board and standard to manage its curriculum." />}

      {standardId && !subjectId && (
        <SubjectsPanel
          standardId={standardId}
          subjects={(subjects.data ?? []).filter((s) => match(s.display_name || s.name, search))}
          onOpen={setSubjectId}
          onChanged={invalidate}
        />
      )}

      {subjectId && !courseId && standardId && (
        <div className="space-y-6">
          <ChaptersPanel
            parent={{ academicSubjectId: subjectId }}
            title="Chapters"
            emptyText="Add chapters directly to this subject — no course required."
            search={search}
            onChanged={invalidate}
          />
          <CoursesPanel
            standardId={standardId}
            academicSubjectId={subjectId}
            courses={(courses.data ?? []).filter((c) => match(c.subject_name, search))}
            onOpen={setCourseId}
            onChanged={invalidate}
          />
        </div>
      )}

      {courseId && course && <CourseContentPanel course={course} search={search} onChanged={invalidate} />}
    </div>
  );
}

function match(value: string, search: string) {
  return !search || value.toLowerCase().includes(search.toLowerCase());
}

/* ------------------------------ Subjects ------------------------------ */

function SubjectsPanel({
  standardId, subjects, onOpen, onChanged,
}: {
  standardId: string;
  subjects: AcademicSubject[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Subjects</h2>
        <SubjectDialog
          standardId={standardId}
          nextOrder={subjects.length + 1}
          onSaved={onChanged}
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add subject</Button>}
        />
      </div>
      {subjects.length === 0 && <AcademyEmpty title="No subjects yet" description="Add Mathematics, Science, English and more to this standard." />}
      {subjects.map((s, i) => (
        <Card key={s.id}>
          <CardContent className="p-3 flex items-center gap-2">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(s.id)}>
              <div className="font-medium truncate flex items-center gap-2">
                <span>{s.icon}</span>{s.display_name || s.name}
                {!s.is_active && <Badge variant="outline">Inactive</Badge>}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {s.building_id ? `Building: ${s.building_id}` : "No building mapping"}
              </div>
            </button>
            <OrderButtons
              disabledUp={i === 0}
              disabledDown={i === subjects.length - 1}
              onMove={async (dir) => {
                const other = subjects[i + dir];
                if (!other) return;
                await swapOrder("academic_subjects", "sort_order",
                  { id: s.id, value: s.sort_order }, { id: other.id, value: other.sort_order });
                onChanged();
              }}
            />
            <SubjectDialog
              standardId={standardId}
              initial={s}
              onSaved={onChanged}
              trigger={<Button size="sm" variant="outline" aria-label="Edit subject"><Pencil className="h-4 w-4" /></Button>}
            />
            <ConfirmDelete
              label="subject"
              onConfirm={async () => { await deleteAcademicSubject(s.id); onChanged(); }}
            />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function SubjectDialog({
  standardId, initial, nextOrder, onSaved, trigger,
}: {
  standardId: string;
  initial?: AcademicSubject;
  nextOrder?: number;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    name: initial?.name ?? "",
    display_name: initial?.display_name ?? "",
    icon: initial?.icon ?? "",
    building_id: initial?.building_id ?? "",
    sort_order: initial?.sort_order ?? nextOrder ?? 0,
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit subject" : "Add subject"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div><Label>Display name</Label><Input value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Icon</Label><Input value={v.icon} onChange={(e) => setV({ ...v, icon: e.target.value })} placeholder="📐" /></div>
            <div><Label>Order</Label><Input type="number" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} /></div>
          </div>
          <div><Label>Building mapping</Label><Input value={v.building_id} onChange={(e) => setV({ ...v, building_id: e.target.value })} placeholder="math / science / library" /></div>
          <div className="flex items-center gap-2">
            <Switch checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} id="subject-active" />
            <Label htmlFor="subject-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving || !v.name.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await saveAcademicSubject({
                  id: initial?.id,
                  standard_id: standardId,
                  name: v.name.trim(),
                  display_name: v.display_name || null,
                  icon: v.icon || null,
                  building_id: v.building_id || null,
                  sort_order: v.sort_order,
                  is_active: v.is_active,
                });
                toast.success("Subject saved");
                setOpen(false);
                onSaved();
              } catch (e) {
                toast.error((e as Error).message);
              } finally { setSaving(false); }
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Courses ------------------------------ */

function CoursesPanel({
  standardId, academicSubjectId, courses, onOpen, onChanged,
}: {
  standardId: string;
  academicSubjectId: string;
  courses: Course[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const ids = courses.map((c) => c.id);
  const counts = useQuery({
    queryKey: ["cx-course-counts", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const chapters = (await Promise.all(ids.map((id) => fetchChapters(id, { includeInactive: true })))).flat();
      const lectures = await fetchLectures(chapters.map((c) => c.id), { includeUnpublished: true });
      const out: Record<string, { chapters: number; lectures: number }> = {};
      for (const id of ids) {
        const chs = chapters.filter((c) => c.subject_id === id);
        out[id] = {
          chapters: chs.length,
          lectures: lectures.filter((l) => chs.some((c) => c.id === l.chapter_id)).length,
        };
      }
      return out;
    },
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Courses / Modules <span className="text-xs font-normal text-muted-foreground">(optional)</span></h2>
        <CourseDialog
          defaultMapping={{ standard_id: standardId, academic_subject_id: academicSubjectId }}
          onSaved={onChanged}
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add course</Button>}
        />
      </div>
      {courses.length === 0 && <AcademyEmpty title="No courses yet" description="Optional. Add a learning stream such as Algebra, Grammar or Science 1 — chapters can also live directly on the subject." />}
      {courses.map((c, i) => (
        <Card key={c.id}>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(c.id)}>
              <div className="font-medium truncate flex items-center gap-2">
                {c.subject_name}
                <Badge variant={c.is_shared ? "default" : "outline"}>
                  {c.is_shared ? <><Share2 className="h-3 w-3 mr-1" />Shared</> : "Standard"}
                </Badge>
                {c.status !== "active" && <Badge variant="outline">{c.status}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {counts.data?.[c.id]?.chapters ?? 0} chapters • {counts.data?.[c.id]?.lectures ?? 0} lectures
              </div>
            </button>
            <div className="flex items-center gap-2">
              <OrderButtons
                disabledUp={i === 0}
                disabledDown={i === courses.length - 1}
                onMove={async (dir) => {
                  const other = courses[i + dir];
                  if (!other) return;
                  await swapOrder("subjects", "sort_order",
                    { id: c.id, value: c.sort_order }, { id: other.id, value: other.sort_order });
                  onChanged();
                }}
              />
              <CourseDialog
                initial={c}
                defaultMapping={{ standard_id: standardId, academic_subject_id: academicSubjectId }}
                onSaved={onChanged}
                trigger={<Button size="sm" variant="outline" aria-label="Edit course"><Pencil className="h-4 w-4" /></Button>}
              />
              <ConfirmDelete label="course" onConfirm={async () => { await deleteCourse(c.id); onChanged(); }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function CourseDialog({
  initial, defaultMapping, onSaved, trigger,
}: {
  initial?: Course;
  defaultMapping?: { standard_id: string; academic_subject_id: string };
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.subject_name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [shared, setShared] = useState(initial?.is_shared ?? false);
  const [saving, setSaving] = useState(false);

  const standards = useQuery({ queryKey: ["cx-standards", ""], queryFn: () => fetchStandards() });
  const existing = useQuery({
    queryKey: ["cx-course-mappings", initial?.id],
    enabled: open && !!initial?.id,
    queryFn: () => fetchCourseMappings({ courseIds: [initial!.id] }),
  });

  /** standard id → academic subject id */
  const [mappings, setMappings] = useState<Record<string, string>>(
    defaultMapping ? { [defaultMapping.standard_id]: defaultMapping.academic_subject_id } : {},
  );

  const loadedKey = existing.data?.map((m) => m.id).join(",") ?? "";
  const [loadedFor, setLoadedFor] = useState("");
  if (existing.data && loadedKey !== loadedFor) {
    setLoadedFor(loadedKey);
    setMappings(Object.fromEntries(existing.data.filter((m) => m.academic_subject_id).map((m) => [m.standard_id, m.academic_subject_id!])));
  }

  const selectedStandards = Object.keys(mappings);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit course" : "Add course"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Course name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Algebra / Grammar" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Course type</Label>
              <Select value={shared ? "shared" : "specific"} onValueChange={(v) => setShared(v === "shared")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">Standard-specific</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{shared ? "Applicable standards & subject mapping" : "Standard & subject"}</Label>
            {standards.data?.map((s) => (
              <StandardMappingRow
                key={s.id}
                standardId={s.id}
                standardName={s.name}
                checked={selectedStandards.includes(s.id)}
                value={mappings[s.id] ?? ""}
                allowMultiple={shared}
                onToggle={(on) => {
                  setMappings((prev) => {
                    if (!on) { const next = { ...prev }; delete next[s.id]; return next; }
                    return shared ? { ...prev, [s.id]: prev[s.id] ?? "" } : { [s.id]: prev[s.id] ?? "" };
                  });
                }}
                onSelect={(subjectId) => setMappings((prev) => ({ ...prev, [s.id]: subjectId }))}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving || !name.trim()}
            onClick={async () => {
              const pairs = Object.entries(mappings).filter(([, sub]) => sub);
              if (!pairs.length) { toast.error("Map the course to at least one standard and subject"); return; }
              setSaving(true);
              try {
                await saveCourse({
                  id: initial?.id,
                  subject_name: name.trim(),
                  description: description || null,
                  is_shared: shared,
                  status,
                  sort_order: initial?.sort_order ?? 0,
                  mappings: pairs.map(([standard_id, academic_subject_id]) => ({ standard_id, academic_subject_id })),
                });
                toast.success("Course saved");
                setOpen(false);
                onSaved();
              } catch (e) {
                toast.error((e as Error).message);
              } finally { setSaving(false); }
            }}
          >Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StandardMappingRow({
  standardId, standardName, checked, value, allowMultiple, onToggle, onSelect,
}: {
  standardId: string;
  standardName: string;
  checked: boolean;
  value: string;
  allowMultiple: boolean;
  onToggle: (on: boolean) => void;
  onSelect: (subjectId: string) => void;
}) {
  const subjects = useQuery({
    queryKey: ["cx-subjects", standardId],
    enabled: checked,
    queryFn: () => fetchAcademicSubjects(standardId),
  });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <label className="flex items-center gap-2 text-sm min-w-[120px]">
        <input
          type={allowMultiple ? "checkbox" : "radio"}
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={standardName}
        />
        {standardName}
      </label>
      {checked && (
        <Select value={value} onValueChange={onSelect}>
          <SelectTrigger className="flex-1 min-w-[140px]"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.display_name || s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/* ------------------------ Chapters & lectures ------------------------- */

export function CourseContentPanel({
  course, search = "", onChanged,
}: {
  course: Course;
  search?: string;
  onChanged: () => void;
}) {
  return (
    <ChaptersPanel
      parent={{ courseId: course.id }}
      title={course.subject_name}
      badge={course.is_shared ? <Badge><Share2 className="h-3 w-3 mr-1" />Shared</Badge> : null}
      emptyText="Add the first chapter of this course."
      search={search}
      onChanged={onChanged}
    />
  );
}

/**
 * Chapters + lectures for one parent — a course/module or a subject directly.
 * Both parents use the exact same chapter and lecture editors.
 */
export function ChaptersPanel({
  parent, title, badge, emptyText, search = "", onChanged,
}: {
  parent: ChapterParent;
  title: string;
  badge?: React.ReactNode;
  emptyText: string;
  search?: string;
  onChanged: () => void;
}) {
  const parentId = parent.courseId ?? parent.academicSubjectId ?? "";
  const chapters = useQuery({
    queryKey: ["cx-chapters", parent.courseId ?? null, parent.academicSubjectId ?? null],
    enabled: !!parentId,
    queryFn: () =>
      parent.courseId
        ? fetchChapters(parent.courseId, { includeInactive: true })
        : fetchDirectChapters(parent.academicSubjectId!, { includeInactive: true }),
  });
  const chapterIds = (chapters.data ?? []).map((c) => c.id);
  const lectures = useQuery({
    queryKey: ["cx-lectures", chapterIds.join(",")],
    enabled: chapterIds.length > 0,
    queryFn: () => fetchLectures(chapterIds, { includeUnpublished: true }),
  });

  const visible = useMemo(() => {
    const list = chapters.data ?? [];
    if (!search) return list;
    const lecs = lectures.data ?? [];
    return list.filter((c) =>
      match(c.chapter_name, search) ||
      lecs.some((l) => l.chapter_id === c.id && match(l.lecture_title, search)));
  }, [chapters.data, lectures.data, search]);

  const totalLectures = lectures.data?.length ?? 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {title}
            {badge}
          </h2>
          <p className="text-sm text-muted-foreground">
            {chapters.data?.length ?? 0} chapters • {totalLectures} lectures
          </p>
        </div>
        <ChapterDialog
          parent={parent}
          nextNumber={(chapters.data?.length ?? 0) + 1}
          onSaved={() => { chapters.refetch(); onChanged(); }}
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" />Add chapter</Button>}
        />
      </div>

      {visible.length === 0 && <AcademyEmpty title="No chapters yet" description="Add the first chapter of this course." />}

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((ch, i) => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            index={i}
            all={visible}
            lectures={(lectures.data ?? []).filter((l) => l.chapter_id === ch.id)}
            onChanged={() => { chapters.refetch(); lectures.refetch(); onChanged(); }}
          />
        ))}
      </div>
    </section>
  );
}

function ChapterCard({
  chapter, index, all, lectures, onChanged,
}: {
  chapter: Chapter;
  index: number;
  all: Chapter[];
  lectures: Lecture[];
  onChanged: () => void;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Chapter {chapter.chapter_number}</div>
            <div className="font-medium truncate flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0" />
              <span className="truncate">{chapter.chapter_name}</span>
              {!chapter.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <OrderButtons
              disabledUp={index === 0}
              disabledDown={index === all.length - 1}
              onMove={async (dir) => {
                const other = all[index + dir];
                if (!other) return;
                await swapOrder("chapters", "chapter_number",
                  { id: chapter.id, value: chapter.chapter_number }, { id: other.id, value: other.chapter_number });
                onChanged();
              }}
            />
            <ChapterDialog
              parent={{ courseId: chapter.subject_id, academicSubjectId: chapter.academic_subject_id }}
              initial={chapter}
              onSaved={onChanged}
              trigger={<Button size="sm" variant="outline" aria-label="Edit chapter"><Pencil className="h-4 w-4" /></Button>}
            />
            <ConfirmDelete label="chapter" onConfirm={async () => { await deleteChapter(chapter.id); onChanged(); }} />
          </div>
        </div>

        <ol className="space-y-1">
          {lectures.map((l, i) => (
            <li key={l.id} className="flex items-center gap-1 text-sm rounded-md bg-muted/40 px-2 py-1">
              <PlayCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{l.lecture_number}. {l.lecture_title}</span>
              {l.status !== "published" && <Badge variant="outline" className="shrink-0">{l.status}</Badge>}
              <LecturePreview lecture={l} />
              <OrderButtons
                compact
                disabledUp={i === 0}
                disabledDown={i === lectures.length - 1}
                onMove={async (dir) => {
                  const other = lectures[i + dir];
                  if (!other) return;
                  await swapOrder("lectures", "lecture_number",
                    { id: l.id, value: l.lecture_number }, { id: other.id, value: other.lecture_number });
                  onChanged();
                }}
              />
              <LectureDialog
                chapterId={chapter.id}
                initial={l}
                onSaved={onChanged}
                trigger={<Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit lecture"><Pencil className="h-3.5 w-3.5" /></Button>}
              />
              <ConfirmDelete compact label="lecture" onConfirm={async () => { await deleteLecture(l.id); onChanged(); }} />
            </li>
          ))}
        </ol>

        <LectureDialog
          chapterId={chapter.id}
          nextNumber={lectures.length + 1}
          onSaved={onChanged}
          trigger={<Button size="sm" variant="outline" className="w-full"><Plus className="h-4 w-4 mr-1" />Add lecture</Button>}
        />
      </CardContent>
    </Card>
  );
}

export type ChapterParent = { courseId?: string | null; academicSubjectId?: string | null };

function ChapterDialog({
  parent, initial, nextNumber, onSaved, trigger,
}: {
  parent: ChapterParent;
  initial?: Chapter;
  nextNumber?: number;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({
    chapter_name: initial?.chapter_name ?? "",
    chapter_number: initial?.chapter_number ?? nextNumber ?? 1,
    description: initial?.description ?? "",
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Edit chapter" : "Add chapter"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1"><Label>#</Label><Input type="number" value={v.chapter_number} onChange={(e) => setV({ ...v, chapter_number: Number(e.target.value) })} /></div>
            <div className="col-span-3"><Label>Chapter name *</Label><Input value={v.chapter_name} onChange={(e) => setV({ ...v, chapter_name: e.target.value })} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Switch id="chapter-active" checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} />
            <Label htmlFor="chapter-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving || !v.chapter_name.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await saveChapter({
                  id: initial?.id,
                  subject_id: parent.courseId ?? null,
                  academic_subject_id: parent.academicSubjectId ?? null,
                  ...v,
                  chapter_name: v.chapter_name.trim(),
                });
                toast.success("Chapter saved");
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

function LectureDialog({
  chapterId, initial, nextNumber, onSaved, trigger,
}: {
  chapterId: string;
  initial?: Lecture;
  nextNumber?: number;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [lectureId, setLectureId] = useState<string | undefined>(initial?.id);
  const [v, setV] = useState({
    lecture_title: initial?.lecture_title ?? "",
    lecture_number: initial?.lecture_number ?? nextNumber ?? 1,
    youtube_url: initial?.youtube_url ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    thumbnail_url: initial?.thumbnail_url ?? "",
    duration_seconds: initial?.duration_seconds ?? 0,
  });
  const [saving, setSaving] = useState(false);

  // Always start create-mode dialogs from a completely blank state when opened.
  // Without this, the previous save's lectureId/form data leaks into the next
  // "Add lecture" and it behaves like Edit on the last-created lecture.
  useEffect(() => {
    if (!open) return;
    setLectureId(initial?.id);
    setV({
      lecture_title: initial?.lecture_title ?? "",
      lecture_number: initial?.lecture_number ?? nextNumber ?? 1,
      youtube_url: initial?.youtube_url ?? "",
      description: initial?.description ?? "",
      status: initial?.status ?? "draft",
      thumbnail_url: initial?.thumbnail_url ?? "",
      duration_seconds: initial?.duration_seconds ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save(status: string, close: boolean) {
    if (!v.lecture_title.trim() || !v.youtube_url.trim()) {
      toast.error("Title and video URL are required");
      return;
    }
    setSaving(true);
    try {
      const id = await saveLecture({
        id: lectureId,
        chapter_id: chapterId,
        lecture_title: v.lecture_title.trim(),
        lecture_number: v.lecture_number,
        youtube_url: v.youtube_url.trim(),
        description: v.description || null,
        status,
        thumbnail_url: v.thumbnail_url || null,
        duration_seconds: v.duration_seconds || null,
      });
      setLectureId(id);
      setV((s) => ({ ...s, status }));
      toast.success(status === "published" ? "Lecture published" : "Draft saved");
      onSaved();
      if (close) setOpen(false);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit lecture" : "Add lecture"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lecture details</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1"><Label>Order</Label><Input type="number" value={v.lecture_number} onChange={(e) => setV({ ...v, lecture_number: Number(e.target.value) })} /></div>
              <div className="col-span-3"><Label>Title *</Label><Input value={v.lecture_title} onChange={(e) => setV({ ...v, lecture_title: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Video</div>
            <div><Label>Video URL *</Label><Input value={v.youtube_url} onChange={(e) => setV({ ...v, youtube_url: e.target.value })} placeholder="https://youtu.be/…" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Thumbnail URL</Label><Input value={v.thumbnail_url} onChange={(e) => setV({ ...v, thumbnail_url: e.target.value })} /></div>
              <div><Label>Duration (seconds)</Label><Input type="number" value={v.duration_seconds} onChange={(e) => setV({ ...v, duration_seconds: Number(e.target.value) })} /></div>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Study material (Notes PDF / PPT)</div>
            {lectureId ? (
              <LectureResources lectureId={lectureId} />
            ) : (
              <p className="text-xs text-muted-foreground">Save the lecture first, then attach Notes PDF or PPT here.</p>
            )}
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publishing</div>
            <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (hidden from students)</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </section>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => save("draft", false)}>Save draft</Button>
          <Button disabled={saving} onClick={() => save(v.status === "archived" ? "archived" : "published", true)}>
            {v.status === "archived" ? "Save" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/** Read-only preview: never awards XP, coins or completes a quest. */
function LecturePreview({ lecture }: { lecture: Lecture }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Preview lecture"><Eye className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="truncate">{lecture.lecture_title}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Preview only — no XP, coins or progress is recorded.</p>
        {open && <div className="aspect-video w-full overflow-hidden rounded-md"><YouTubePlayer url={lecture.youtube_url} title={lecture.lecture_title} /></div>}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- shared ------------------------------- */

function OrderButtons({
  disabledUp, disabledDown, onMove, compact,
}: {
  disabledUp: boolean;
  disabledDown: boolean;
  onMove: (dir: 1 | -1) => Promise<void>;
  compact?: boolean;
}) {
  const size = compact ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="flex shrink-0">
      <Button variant="ghost" size="icon" className={size} disabled={disabledUp} aria-label="Move up" onClick={() => onMove(-1)}>
        <ArrowUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </Button>
      <Button variant="ghost" size="icon" className={size} disabled={disabledDown} aria-label="Move down" onClick={() => onMove(1)}>
        <ArrowDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </Button>
    </div>
  );
}

function ConfirmDelete({ label, onConfirm, compact }: { label: string; onConfirm: () => Promise<void>; compact?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className={compact ? "h-7 w-7" : "h-9 w-9"} aria-label={`Delete ${label}`}>
          <Trash2 className={compact ? "h-3.5 w-3.5 text-destructive" : "h-4 w-4 text-destructive"} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the {label} and everything inside it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              try { await onConfirm(); toast.success("Deleted"); }
              catch (e) { toast.error((e as Error).message); }
            }}
          >Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
