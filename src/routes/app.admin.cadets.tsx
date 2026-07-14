import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, CalendarCheck, Ticket, Award, ClipboardList, GraduationCap, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/cadets")({
  head: () => ({ meta: [{ title: "Cadets — Academy Office" }] }),
  component: CadetsHub,
});

const tiles = [
  { to: "/app/students", label: "All Cadets", desc: "Roster, profiles, progression", icon: Users },
  { to: "/app/admin/attendance", label: "Attendance", desc: "Mark present or absent · daily rolls", icon: CalendarCheck },
  { to: "/app/admin/passes", label: "Passes", desc: "Review and approve pass requests", icon: Ticket },
  { to: "/app/admin/dashboard", label: "Report Cards", desc: "Per-Cadet analytics and exports", icon: ClipboardList },
  { to: "/app/admin/lecture-views", label: "Learning Timeline", desc: "Watch history & engagement", icon: GraduationCap },
  { to: "/app/admin/gamification", label: "Achievements & Titles", desc: "Award badges, titles, unlocks", icon: Award },
];

function CadetsHub() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<ShieldCheck className="h-7 w-7" />}
        title="Cadets"
        tagline="Every Cadet of the Academy — their journey, records and honours."
        lumi="This wing is where the Headmaster keeps watch over every Cadet. Click any tile to command a facet of their journey."
      />
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
