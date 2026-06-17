import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/ingenious-logo.jpg.asset.json";
import {
  LayoutDashboard, Users, BookOpen, FileText, ClipboardList,
  Megaphone, BarChart3, LogOut, Menu, Settings, TrendingUp,
  Trophy, Coins, Award, Map, Swords, ShoppingBag, Home, User, Sparkles, CalendarCheck, Eye, Gauge, Target, MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { PlayerStatusBar } from "@/components/rpg/PlayerStatusBar";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

const adminNav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/admin/dashboard", label: "Analytics Hub", icon: Gauge },
  { to: "/app/students", label: "Students", icon: Users },
  { to: "/app/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/app/content", label: "Content", icon: BookOpen },
  { to: "/app/admin/lecture-views", label: "Lecture Views", icon: Eye },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/tests", label: "Tests", icon: ClipboardList },
  { to: "/app/announcements", label: "Announcements", icon: Megaphone },
  { to: "/app/results", label: "Results", icon: BarChart3 },
  { to: "/app/analytics", label: "Test Analytics", icon: TrendingUp },
  { to: "/app/admin/talents", label: "Talents", icon: Sparkles },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

// Student "hero" nav — game terminology
const studentNav: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/worlds", label: "Worlds", icon: Map },
  { to: "/app/quests", label: "Quests", icon: Target },
  { to: "/app/lectures", label: "Missions", icon: BookOpen },
  { to: "/app/tests", label: "Battles", icon: Swords },
  { to: "/app/pvp", label: "Arena", icon: Swords },
  { to: "/app/leaderboard", label: "Rank", icon: Trophy },
  { to: "/app/achievements", label: "Badges", icon: Award },
  { to: "/app/talents", label: "Talents", icon: Sparkles },
  { to: "/app/shop", label: "Shop", icon: ShoppingBag },
  { to: "/app/coins", label: "Treasury", icon: Coins },
];

// Secondary menu — less-used screens, decluttered from primary nav
const studentSecondaryNav: NavItem[] = [
  { to: "/app/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/app/notes", label: "Scrolls", icon: FileText },
  { to: "/app/announcements", label: "News", icon: Megaphone },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

// Mobile bottom tab bar for students — the 5 most-used
const studentBottomTabs: NavItem[] = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/worlds", label: "Worlds", icon: Map },
  { to: "/app/quests", label: "Quests", icon: Target },
  { to: "/app/leaderboard", label: "Rank", icon: Trophy },
  { to: "/app/profile", label: "Hero", icon: User },
];


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = role === "admin" ? adminNav : studentNav;
  const isStudent = role === "student";
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
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
              active
                ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
      {isStudent && (
        <>
          <div className="pt-3 pb-1 px-3 text-[10px] font-orbitron font-bold tracking-widest text-muted-foreground uppercase">
            More
          </div>
          {studentSecondaryNav.map((it) => {
            const active = path === it.to || path.startsWith(it.to + "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <div className="h-10 w-10 rounded-2xl bg-white/90 flex items-center justify-center overflow-hidden glow-primary">
        <img src={logoAsset.url} alt="Ingenious Academy" className="h-9 w-9 object-contain" />
      </div>
      <div>
        <div className="text-sm font-extrabold leading-tight">Ingenious Academy</div>
        <div className="text-[11px] text-muted-foreground leading-tight">Learn Smart. Score Higher.</div>
      </div>
    </div>
  );
}

function BottomTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 glass-card pb-[env(safe-area-inset-bottom)]"
      style={{ background: "color-mix(in oklab, var(--card) 88%, transparent)" }}
    >
      <ul className="grid grid-cols-5">
        {studentBottomTabs.map((t) => {
          const active = t.end ? path === t.to : path === t.to || path.startsWith(t.to + "/");
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-9 w-9 rounded-2xl flex items-center justify-center transition-all",
                    active
                      ? "bg-[image:var(--gradient-primary)] glow-primary"
                      : "bg-transparent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={active ? "text-foreground" : ""}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  const isStudent = role === "student";

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r border-white/10 bg-sidebar/80 backdrop-blur-xl">
        <Brand />
        <div className="px-3 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-3 border-t border-white/10">
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
        <header className="h-14 border-b border-white/10 flex items-center px-3 md:px-6 gap-2 bg-card/60 backdrop-blur-xl sticky top-0 z-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar">
              <div className="p-3">
                <Brand />
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <div className="pt-4 mt-4 border-t border-white/10">
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
            <div className="h-8 w-8 rounded-xl bg-white/90 flex items-center justify-center overflow-hidden glow-primary">
              <img src={logoAsset.url} alt="Ingenious Academy" className="h-7 w-7 object-contain" />
            </div>
            <span className="font-extrabold tracking-tight">Ingenious Academy</span>
          </div>
          <div className="ml-auto md:hidden">
            {isStudent && (
              <Link
                to="/app/settings"
                className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-foreground"
                aria-label="Profile"
              >
                <User className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>
        <main className={cn("flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto", isStudent && "pb-24 md:pb-6")}>
          {isStudent && (
            <div className="mb-4 sticky top-14 z-10">
              <PlayerStatusBar />
            </div>
          )}
          <Outlet />
        </main>
        {isStudent && <BottomTabs />}
      </div>
    </div>
  );
}
