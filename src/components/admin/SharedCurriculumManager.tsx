/**
 * Shared Courses — dedicated admin view.
 *
 * A shared course exists exactly once (one row in `subjects`, one chapter
 * tree, one lecture set) and is mapped to any number of standard + subject
 * pairs. This view manages those mappings and the course content without
 * ever duplicating records.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus, Search, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AcademyEmpty, AcademySkeleton } from "@/components/academy/AcademyStates";
import { CourseDialog, CourseContentPanel } from "@/components/admin/CurriculumExplorer";

import {
  fetchAcademicSubjects, fetchAllCourses, fetchChapters, fetchCourseMappings,
  fetchLectures, fetchStandards, type Course,
} from "@/lib/curriculum/hierarchy";

export function SharedCurriculumManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"shared" | "specific" | "all">("shared");
  const [standardFilter, setStandardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openCourse, setOpenCourse] = useState<Course | null>(null);

  const standards = useQuery({ queryKey: ["cx-standards", ""], queryFn: () => fetchStandards() });
  const courses = useQuery({ queryKey: ["admin-courses"], queryFn: fetchAllCourses });
  const mappings = useQuery({ queryKey: ["admin-course-mappings"], queryFn: () => fetchCourseMappings({}) });

  const subjectsByStandard = useQuery({
    queryKey: ["admin-subject-names", standards.data?.length ?? 0],
    enabled: !!standards.data?.length,
    queryFn: async () => {
      const lists = await Promise.all((standards.data ?? []).map((s) => fetchAcademicSubjects(s.id)));
      return Object.fromEntries(lists.flat().map((s) => [s.id, s.display_name || s.name]));
    },
  });

  const counts = useQuery({
    queryKey: ["admin-course-counts", courses.data?.length ?? 0],
    enabled: !!courses.data?.length,
    queryFn: async () => {
      const chapters = (await Promise.all((courses.data ?? []).map((c) => fetchChapters(c.id, { includeInactive: true })))).flat();
      const lectures = await fetchLectures(chapters.map((c) => c.id), { includeUnpublished: true });
      const out: Record<string, { chapters: number; lectures: number }> = {};
      for (const c of courses.data ?? []) {
        const chs = chapters.filter((ch) => ch.subject_id === c.id);
        out[c.id] = { chapters: chs.length, lectures: lectures.filter((l) => chs.some((ch) => ch.id === l.chapter_id)).length };
      }
      return out;
    },
  });

  const standardName = new Map((standards.data ?? []).map((s) => [s.id, s.name]));

  const filtered = useMemo(() => {
    return (courses.data ?? []).filter((c) => {
      if (kind === "shared" && !c.is_shared) return false;
      if (kind === "specific" && c.is_shared) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (standardFilter !== "all" && !(mappings.data ?? []).some((m) => m.subject_id === c.id && m.standard_id === standardFilter)) return false;
      if (search && !c.subject_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [courses.data, mappings.data, kind, statusFilter, standardFilter, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["admin-course-mappings"] });
    qc.invalidateQueries({ queryKey: ["admin-course-counts"] });
    qc.invalidateQueries({ queryKey: ["cx-courses"] });
  };

  if (openCourse) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => setOpenCourse(null)}>← Back to shared courses</Button>
        <CourseContentPanel course={openCourse} onChanged={invalidate} />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search courses" />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shared">Shared courses</SelectItem>
            <SelectItem value="specific">Standard-specific</SelectItem>
            <SelectItem value="all">All courses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={standardFilter} onValueChange={setStandardFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Standard" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All standards</SelectItem>
            {standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
        <CourseDialog onSaved={invalidate} trigger={<Button><Plus className="h-4 w-4 mr-1" />New course</Button>} />
      </div>

      {courses.isLoading && <AcademySkeleton />}
      {!courses.isLoading && filtered.length === 0 && (
        <AcademyEmpty title="No courses found" description="Create a shared course such as English Grammar and map it to several standards." />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((c) => {
          const rows = (mappings.data ?? []).filter((m) => m.subject_id === c.id);
          return (
            <Card key={c.id} className="min-w-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.subject_name}</div>
                    <Badge variant={c.is_shared ? "default" : "outline"} className="mt-1">
                      {c.is_shared ? <><Share2 className="h-3 w-3 mr-1" />Shared</> : "Standard-specific"}
                    </Badge>
                  </div>
                  {c.status !== "active" && <Badge variant="outline">{c.status}</Badge>}
                </div>

                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {rows.length === 0 && <li>No assignments yet</li>}
                  {rows.map((m) => (
                    <li key={m.id} className="truncate">
                      {standardName.get(m.standard_id) ?? "—"}
                      {m.academic_subject_id ? ` · ${subjectsByStandard.data?.[m.academic_subject_id] ?? "—"}` : ""}
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers3 className="h-3.5 w-3.5" />
                  {counts.data?.[c.id]?.chapters ?? 0} chapters • {counts.data?.[c.id]?.lectures ?? 0} lectures
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setOpenCourse(c)}>Manage content</Button>
                  <CourseDialog initial={c} onSaved={invalidate} trigger={<Button size="sm" variant="outline">Edit &amp; assignments</Button>} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
