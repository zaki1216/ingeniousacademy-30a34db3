import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, FileText, ClipboardList, Megaphone, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { role, user } = useAuth();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    enabled: role === "admin",
    queryFn: async () => {
      const [students, active, lectures, notes, tests] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("lectures").select("id", { count: "exact", head: true }),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("tests").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        active: active.count ?? 0,
        lectures: lectures.count ?? 0,
        notes: notes.count ?? 0,
        tests: tests.count ?? 0,
      };
    },
  });

  const announcements = useQuery({
    queryKey: ["recent-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, standard_id, standards(name)")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {role === "admin" ? "Admin Dashboard" : `Welcome${profile.data?.name ? `, ${profile.data.name}` : ""}`}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {role === "admin"
            ? "Manage students, content, tests and announcements."
            : "Learn Smart. Understand Better. Score Higher."}
        </p>
      </div>

      {role === "admin" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Total students" value={stats.data?.students ?? "—"} />
          <StatCard icon={GraduationCap} label="Active students" value={stats.data?.active ?? "—"} />
          <StatCard icon={BookOpen} label="Lectures" value={stats.data?.lectures ?? "—"} />
          <StatCard icon={FileText} label="Notes" value={stats.data?.notes ?? "—"} />
          <StatCard icon={ClipboardList} label="Tests" value={stats.data?.tests ?? "—"} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" /> Recent announcements
          </CardTitle>
          <CardDescription>Latest updates from your academy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
          {announcements.data?.map((a) => (
            <div key={a.id} className="border-l-4 border-primary pl-3 py-1">
              <div className="font-semibold text-sm">{a.title}</div>
              <div className="text-sm text-muted-foreground">{a.message}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(a.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
