import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/results")({ component: ResultsPage });

function ResultsPage() {
  const { role, user } = useAuth();

  const { data } = useQuery({
    queryKey: ["results", role, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const q = supabase
        .from("results")
        .select("id, score, total_marks, percentage, attempt_date, test_id, student_id")
        .order("attempt_date", { ascending: false });
      if (role === "student") q.eq("student_id", user!.id);
      const rs = (await q).data ?? [];
      const tests = (await supabase.from("tests").select("id, title")).data ?? [];
      const profiles = role === "admin"
        ? (await supabase.from("profiles").select("id, name, email")).data ?? []
        : [];
      return rs.map((r) => ({
        ...r,
        test_title: tests.find((t) => t.id === r.test_id)?.title ?? "—",
        student_name: profiles.find((p) => p.id === r.student_id)?.name,
        student_email: profiles.find((p) => p.id === r.student_id)?.email,
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{role === "admin" ? "All Results" : "My Results"}</h1>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} attempts</p>
      </div>

      <div className="space-y-2">
        {data?.map((r) => {
          const grade = r.percentage >= 75 ? "default" : r.percentage >= 40 ? "secondary" : "destructive";
          return (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.test_title}</div>
                  {role === "admin" && (
                    <div className="text-xs text-muted-foreground truncate">{r.student_name} · {r.student_email}</div>
                  )}
                  <div className="text-xs text-muted-foreground">{new Date(r.attempt_date).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <Badge variant={grade as any}>{r.percentage}%</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{r.score}/{r.total_marks}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No results yet.</p>
        )}
      </div>
    </div>
  );
}
