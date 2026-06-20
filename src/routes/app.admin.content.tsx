import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileText, Eye, Upload, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/admin/content")({ component: ContentHub });

const tiles = [
  { to: "/app/content", label: "Content Library", desc: "Subjects, chapters, lectures", icon: BookOpen },
  { to: "/app/notes", label: "Notes", desc: "Manage downloadable notes", icon: FileText },
  { to: "/app/admin/lecture-quizzes", label: "Lecture Quizzes", desc: "Unlock rules, quizzes, progress", icon: ListChecks },
  { to: "/app/admin/lecture-views", label: "Lecture Views", desc: "Engagement & analytics", icon: Eye },
  { to: "/app/content", label: "Upload Content", desc: "Add new lectures & material", icon: Upload },
];

function ContentHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content</h1>
        <p className="text-sm text-muted-foreground">Library, notes, uploads and engagement</p>
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
