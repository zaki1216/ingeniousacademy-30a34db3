import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, BarChart3, TrendingUp, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/admin/assessment")({ component: AssessmentHub });

const tiles = [
  { to: "/app/admin/offline-tests", label: "Offline Tests (Academic)", desc: "Teacher-entered marks for the Report Card", icon: GraduationCap },
  { to: "/app/tests", label: "Lecture & Boss Quizzes", desc: "In-app quizzes (game economy)", icon: ClipboardList },
  { to: "/app/results", label: "Quiz Results", desc: "Review in-app quiz attempts", icon: BarChart3 },
  { to: "/app/analytics", label: "Test Analytics", desc: "Question & test insights", icon: TrendingUp },
];

function AssessmentHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Assessment</h1>
        <p className="text-sm text-muted-foreground">Tests, results, and analytics</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.to}>
              <Card className="hover:border-primary/50 transition">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
