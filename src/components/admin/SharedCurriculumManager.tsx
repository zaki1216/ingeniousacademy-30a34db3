/**
 * Shared Curriculum manager — admin surface.
 *
 * Lets an administrator create a course once and assign it to any number of
 * standards. Shared and standard-specific courses are clearly distinguished,
 * with filters and per-course analytics.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Share2, Layers3, GitBranch, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  adminCreateCourseVersion,
  adminListCourses,
  adminSaveCourse,
} from "@/lib/api/curriculum.functions";
import { AcademyEmpty, AcademySkeleton } from "@/components/academy/AcademyStates";

import type { CourseSummary } from "@/lib/curriculum/types.shared";

type Course = CourseSummary;

export function SharedCurriculumManager() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCourses);
  const save = useServerFn(adminSaveCourse);
  const newVersion = useServerFn(adminCreateCourseVersion);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => list(),
  });

  const [kind, setKind] = useState<"all" | "shared" | "specific">("all");
  const [standardFilter, setStandardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  const saveMut = useMutation({
    mutationFn: (input: CourseFormValues & { id?: string }) => save({ data: input }),
    onSuccess: () => { toast.success("Course saved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Could not save this course"),
  });

  const versionMut = useMutation({
    mutationFn: (courseId: string) => newVersion({ data: { courseId } }),
    onSuccess: (r: { version: number }) => {
      toast.success(`Draft version ${r.version} created`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not create a new version"),
  });

  const courses = data?.courses ?? [];
  const standards = data?.standards ?? [];

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (kind === "shared" && !c.is_shared) return false;
      if (kind === "specific" && c.is_shared) return false;
      if (standardFilter !== "all" && !c.standard_ids.includes(standardFilter)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search && !c.subject_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses, kind, standardFilter, statusFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search courses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search courses"
          />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            <SelectItem value="shared">Shared courses</SelectItem>
            <SelectItem value="specific">Standard-specific</SelectItem>
          </SelectContent>
        </Select>
        <Select value={standardFilter} onValueChange={setStandardFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All standards</SelectItem>
            {standards.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <CourseDialog
          standards={standards}
          onSubmit={(vals) => saveMut.mutateAsync(vals)}
          trigger={<Button><Plus className="h-4 w-4 mr-2" />New course</Button>}
        />
      </div>

      {isLoading && <AcademySkeleton className="h-40" />}

      {!isLoading && filtered.length === 0 && (
        <AcademyEmpty
          icon="📚"
          title="No courses match this filter"
          description="Create a course once and assign it to every standard that should study it."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.subject_name}</div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{c.description}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={c.is_shared ? "default" : "secondary"} className="gap-1">
                    {c.is_shared ? <Share2 className="h-3 w-3" /> : <Layers3 className="h-3 w-3" />}
                    {c.is_shared ? "Shared" : "Standard"}
                  </Badge>
                  <Badge variant={c.status === "active" ? "outline" : "secondary"}>
                    {c.status === "active" ? "Active" : "Draft"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {c.standard_names.length === 0 && (
                  <span className="text-xs text-muted-foreground">Not assigned to any standard</span>
                )}
                {c.standard_names.map((n, i) => (
                  <Badge key={`${c.id}-${i}`} variant="outline" className="text-[10px]">{n}</Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Students: <b className="text-foreground">{c.student_count}</b></span>
                <span>Completion: <b className="text-foreground">{c.completion_rate}%</b></span>
                <span>Chapters: <b className="text-foreground">{c.chapter_count}</b></span>
                <span>Lessons: <b className="text-foreground">{c.lecture_count}</b></span>
                <span>Version: <b className="text-foreground">v{c.version}</b></span>
                <span className="truncate">
                  Updated: <b className="text-foreground">
                    {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : "—"}
                  </b>
                </span>
                {c.updated_by_name && (
                  <span className="col-span-2 truncate">Last edited by {c.updated_by_name}</span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <CourseDialog
                  standards={standards}
                  course={c}
                  onSubmit={(vals) => saveMut.mutateAsync({ ...vals, id: c.id })}
                  trigger={
                    <Button size="sm" variant="outline" className="flex-1">
                      <Pencil className="h-4 w-4 mr-1" />Edit
                    </Button>
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  disabled={versionMut.isPending}
                  onClick={() => versionMut.mutate(c.id)}
                >
                  <GitBranch className="h-4 w-4 mr-1" />New version
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type CourseFormValues = {
  subject_name: string;
  description: string | null;
  is_shared: boolean;
  status: "active" | "draft";
  standard_ids: string[];
};

function CourseDialog({
  standards,
  course,
  onSubmit,
  trigger,
}: {
  standards: { id: string; name: string }[];
  course?: Course;
  onSubmit: (vals: CourseFormValues) => Promise<unknown>;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(course?.subject_name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [isShared, setIsShared] = useState(course?.is_shared ?? false);
  const [status, setStatus] = useState<"active" | "draft">(
    (course?.status as "active" | "draft") ?? "active",
  );
  const [selected, setSelected] = useState<string[]>(course?.standard_ids ?? []);
  const [assignMode, setAssignMode] = useState<"all" | "new">("all");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!name.trim()) return toast.error("Give the course a name");
    if (selected.length === 0) return toast.error("Select at least one standard");
    setBusy(true);
    try {
      await onSubmit({
        subject_name: name.trim(),
        description: description.trim() || null,
        is_shared: isShared || selected.length > 1,
        status,
        standard_ids: selected,
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? "Edit course" : "New course"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course name</Label>
            <Input id="course-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-desc">Description</Label>
            <Textarea id="course-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Shared course</div>
              <p className="text-xs text-muted-foreground">
                One copy of the content, reused by every selected standard.
              </p>
            </div>
            <Switch checked={isShared} onCheckedChange={setIsShared} aria-label="Shared course" />
          </div>

          <div className="space-y-1.5">
            <Label>Applicable standards</Label>
            <div className="grid grid-cols-2 gap-2">
              {standards.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "draft")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active — visible to students</SelectItem>
                <SelectItem value="draft">Draft — hidden from students</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Assignment</Label>
            <Select value={assignMode} onValueChange={(v) => setAssignMode(v as "all" | "new")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Assign to all current students in these standards</SelectItem>
                <SelectItem value="new">Keep as draft for newly enrolled students only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {assignMode === "all"
                ? "Every student in the selected standards sees this course as soon as it is active."
                : "Set the course to Draft so only future rollouts pick it up."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save course"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
