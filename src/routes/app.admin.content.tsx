import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileText, Eye, Upload, ListChecks, FileSpreadsheet, Library } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/content")({
  head: () => ({ meta: [{ title: "Academy Content — Academy Office" }] }),
  component: ContentHub,
});

const tiles = [
  { to: "/app/content", label: "Content Library", desc: "Subjects → Chapters → Lectures", icon: BookOpen },
  { to: "/app/content", label: "Upload Content", desc: "Create new lectures & resources", icon: Upload },
  { to: "/app/notes", label: "Notes & Resources", desc: "Downloadable notes for Cadets", icon: FileText },
  { to: "/app/admin/lecture-quizzes", label: "Lecture Quizzes", desc: "Unlock rules and quiz mapping", icon: ListChecks },
  { to: "/app/admin/quiz-import", label: "Bulk Quiz Import", desc: "Upload questions from XLSX or CSV", icon: FileSpreadsheet },
  { to: "/app/admin/lecture-views", label: "Engagement Analytics", desc: "Watch counts, drop-off, viewers", icon: Eye },
];

function ContentHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Library className="h-7 w-7" />}
        title="Academy Content"
        tagline="The Great Library — every Subject, Chapter, Lecture and Quest of Ingenious Academy."
        lumi="Everything Cadets learn from flows through this wing. Shape the curriculum here and every classroom updates instantly."
      />
      <div className="mb-1 text-xs font-orbitron uppercase tracking-widest text-muted-foreground">
        Subject → Chapter → Lecture → Quiz → Boss
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} to={t.to}>
              <Card className="hover:border-amber-500/50 transition group h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition">
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
