import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, BookOpen, FileText, ClipboardList,
  Megaphone, BarChart3, GraduationCap, LogOut, Menu, Settings, TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

const adminNav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/students", label: "Students", icon: Users },
  { to: "/app/content", label: "Content", icon: BookOpen },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/tests", label: "Tests", icon: ClipboardList },
  { to: "/app/announcements", label: "Announcements", icon: Megaphone },
  { to: "/app/results", label: "Results", icon: BarChart3 },
  { to: "/app/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const studentNav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/lectures", label: "Lectures", icon: BookOpen },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/tests", label: "Tests", icon: ClipboardList },
  { to: "/app/results", label: "My Results", icon: BarChart3 },
  { to: "/app/announcements", label: "Announcements", icon: Megaphone },
];


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = role === "admin" ? adminNav : studentNav;
  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = it.end ? path === it.to : path === it.to || path.startsWith(it.to + "/");
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground flex items-center justify-center">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-bold leading-tight">Ingenious Academy</div>
        <div className="text-[11px] text-muted-foreground leading-tight">Learn. Understand. Score.</div>
      </div>
    </div>
  );
}

function AppLayout() {
  const navigate = useNavigate();
  const { user, role, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-sidebar">
        <Brand />
        <div className="px-3 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-3 border-t">
          <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
            {user?.email} · <span className="capitalize">{role ?? "—"}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-3 md:px-6 gap-2 bg-card sticky top-0 z-10">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <div className="p-3">
                <Brand />
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <div className="pt-4 mt-4 border-t">
                  <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
                    {user?.email} · <span className="capitalize">{role ?? "—"}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold">Ingenious Academy</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
