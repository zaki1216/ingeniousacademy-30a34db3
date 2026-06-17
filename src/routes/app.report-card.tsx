import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GraduationCap, Trophy, BookOpen, ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMyReportCard } from "@/lib/api/academic.functions";

export const Route = createFileRoute("/app/report-card")({ component: ReportCardPage });

function ReportCardPage() {
  const fn = useServerFn(getMyReportCard);
  const q = useQuery({ queryKey: ["report-card"], queryFn: () => fn() });

  const d = q.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/app/profile" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Academic Report Card
          </h1>
          <p className="text-xs text-muted-foreground">
            Based on teacher-entered offline tests only. Game activity does not affect these marks.
          </p>
        </div>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {d && (
        <>
          <Card className="rune-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Scholar</div>
                  <div className="text-lg font-bold">{d.profile.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold font-orbitron">{d.overallPercentage}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.totalObtained} / {d.totalMax} marks
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Scholar Rank:</span>
                {d.academicRank ? (
                  <Badge>#{d.academicRank} of {d.cohortSize}</Badge>
                ) : (
                  <span className="text-muted-foreground">Unranked</span>
                )}
              </div>
            </CardContent>
          </Card>

          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Subject Performance</h2>
            {d.subjects_summary.length === 0 && <p className="text-sm text-muted-foreground">No subject marks yet.</p>}
            {d.subjects_summary.map((s) => (
              <Card key={s.subject_id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.subject_name}</span>
                    <span className="font-orbitron text-sm">{s.percentage}%</span>
                  </div>
                  <Progress value={s.percentage} />
                  <div className="text-[11px] text-muted-foreground">{s.obtained} / {s.max} marks</div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Chapter Performance</h2>
            {d.chapters_summary.length === 0 && <p className="text-sm text-muted-foreground">No chapter-tagged marks yet.</p>}
            {d.chapters_summary.map((c) => (
              <Card key={c.chapter_id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.chapter_name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.subject_name} · {c.obtained}/{c.max}</div>
                  </div>
                  <Badge variant="secondary">{c.percentage}%</Badge>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">All Offline Tests</h2>
            {d.rows.length === 0 && <p className="text-sm text-muted-foreground">No tests recorded yet.</p>}
            {d.rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.subject_name}{r.chapter_name ? ` · ${r.chapter_name}` : ""} · {new Date(r.test_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.marks_obtained != null ? (
                      <>
                        <div className="font-bold">{r.marks_obtained}/{r.max_marks}</div>
                        <div className="text-[10px] text-muted-foreground">{r.percentage}%</div>
                      </>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {d.remarks.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Teacher Remarks</h2>
              {d.remarks.map((r, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{r.term}</div>
                    <p className="text-sm whitespace-pre-wrap">{r.remarks}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
