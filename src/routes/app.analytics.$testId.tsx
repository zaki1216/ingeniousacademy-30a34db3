import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Check, X, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/analytics/$testId")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: TestDrilldown,
});

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  marks: number;
  question_order: number;
};

type Result = {
  id: string;
  student_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  attempt_date: string;
  answers: Record<string, number>;
};

function TestDrilldown() {
  const { testId } = Route.useParams();
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-test", testId],
    enabled: role === "admin",
    queryFn: async () => {
      const [testRes, qRes, rRes, sRes] = await Promise.all([
        supabase.from("tests").select("id, title, chapter_id, total_marks").eq("id", testId).maybeSingle(),
        supabase
          .from("questions")
          .select("id, question_text, options, correct_option, marks, question_order")
          .eq("test_id", testId)
          .order("question_order", { ascending: true }),
        supabase
          .from("results")
          .select("id, student_id, score, total_marks, percentage, attempt_date, answers")
          .eq("test_id", testId)
          .order("attempt_date", { ascending: false }),
        supabase.from("profiles").select("id, name, email"),
      ]);
      return {
        test: testRes.data,
        questions: (qRes.data ?? []) as unknown as Question[],
        results: (rRes.data ?? []) as unknown as Result[],
        students: sRes.data ?? [],
      };
    },
  });

  const test = data?.test;
  const questions = data?.questions ?? [];
  const results = data?.results ?? [];
  const students = data?.students ?? [];

  // Latest attempt per student
  const latestByStudent = useMemo(() => {
    const map = new Map<string, Result>();
    for (const r of results) {
      if (!map.has(r.student_id)) map.set(r.student_id, r); // results already desc
    }
    return Array.from(map.values());
  }, [results]);

  // Per-question accuracy across latest attempts
  const perQuestionStats = useMemo(() => {
    return questions.map((q) => {
      let correct = 0;
      let answered = 0;
      for (const r of latestByStudent) {
        const a = r.answers?.[q.id];
        if (typeof a === "number") {
          answered += 1;
          if (a === q.correct_option) correct += 1;
        }
      }
      const pct = answered ? Math.round((correct / answered) * 1000) / 10 : 0;
      return { q, correct, answered, pct };
    });
  }, [questions, latestByStudent]);

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? "—";

  if (role !== "admin") {
    return <div className="p-4 text-sm text-muted-foreground">Admins only.</div>;
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/analytics">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{test?.title ?? "Test"}</h1>
        <p className="text-sm text-muted-foreground">
          {questions.length} questions · {latestByStudent.length} students attempted
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-question accuracy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {perQuestionStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions.</p>
          ) : (
            perQuestionStats.map(({ q, correct, answered, pct }, idx) => (
              <div key={q.id} className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium">
                    Q{idx + 1}. {q.question_text}
                  </div>
                  <Badge variant={pct >= 75 ? "default" : pct >= 40 ? "secondary" : "destructive"}>
                    {pct}%
                  </Badge>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {correct}/{answered} correct · Answer: {q.options?.[q.correct_option] ?? "—"} · {q.marks} marks
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question-wise scores per student</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {latestByStudent.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">
                    Student
                  </TableHead>
                  {questions.map((q, i) => (
                    <TableHead key={q.id} className="text-center whitespace-nowrap">
                      Q{i + 1}
                    </TableHead>
                  ))}
                  <TableHead className="text-right whitespace-nowrap">Score</TableHead>
                  <TableHead className="text-right whitespace-nowrap">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestByStudent.map((r) => {
                  const pct = Number(r.percentage);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {nameOf(r.student_id)}
                      </TableCell>
                      {questions.map((q) => {
                        const a = r.answers?.[q.id];
                        if (typeof a !== "number") {
                          return (
                            <TableCell key={q.id} className="text-center text-muted-foreground">
                              <Minus className="h-4 w-4 inline" />
                            </TableCell>
                          );
                        }
                        const ok = a === q.correct_option;
                        return (
                          <TableCell
                            key={q.id}
                            className={`text-center ${ok ? "text-primary" : "text-destructive"}`}
                            title={`Picked: ${q.options?.[a] ?? a}`}
                          >
                            {ok ? (
                              <Check className="h-4 w-4 inline" />
                            ) : (
                              <X className="h-4 w-4 inline" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right whitespace-nowrap">
                        {r.score}/{r.total_marks}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={pct >= 75 ? "default" : pct >= 40 ? "secondary" : "destructive"}>
                          {pct.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
