import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/ingenious-logo.jpg.asset.json";
import {
  LayoutDashboard,
  LogOut, Menu, Map, Swords, ShoppingBag, Home,
  ShieldCheck, Gamepad2, Library, ScrollText, Cog,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { LumiProvider } from "@/lib/lumi/LumiProvider";
import { LumiCompanion } from "@/components/lumi/LumiCompanion";
import { AcademyHUD } from "@/components/hud/AcademyHUD";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

// Academy Office — 6 hubs only
const adminNav: NavItem[] = [
  { to: "/app/admin/dashboard", label: "Command Center", icon: LayoutDashboard },
  { to: "/app/admin/cadets", label: "Cadets", icon: ShieldCheck },
  { to: "/app/admin/content", label: "Academy Content", icon: Library },
  { to: "/app/admin/assessment", label: "Assessments", icon: ScrollText },
  { to: "/app/admin/gamification", label: "Academy Systems", icon: Gamepad2 },
  { to: "/app/admin/settings", label: "Academy Settings", icon: Cog },
];

const adminSecondaryNav: NavItem[] = [];

// Student navigation now happens via the Academy World HUD (AcademyHUD).
const studentNav: NavItem[] = [];


function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = role === "admin" ? adminNav : studentNav;
  const secondary = role === "admin" ? adminSecondaryNav : [];
  const showSecondary = role === "admin";

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
      {showSecondary && secondary.length > 0 && (
        <>
          <div className="pt-3 pb-1 px-3 text-[10px] font-orbitron font-bold tracking-widest text-muted-foreground uppercase">
            More
          </div>
          {secondary.map((it) => {
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
  const { role } = useAuth();
  const isAdmin = role === "admin";
  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <div className={cn(
        "h-10 w-10 rounded-2xl flex items-center justify-center overflow-hidden",
        isAdmin ? "bg-gradient-to-br from-amber-400 to-amber-700 shadow-[0_0_20px_-4px_rgba(251,191,36,0.6)]" : "bg-white/90 glow-primary",
      )}>
        <img src={logoAsset.url} alt="Ingenious Academy" className="h-9 w-9 object-contain" />
      </div>
      <div>
        <div className={cn(
          "text-sm font-extrabold leading-tight",
          isAdmin && "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent font-orbitron tracking-wider",
        )}>
          {isAdmin ? "Academy Office" : "Ingenious Academy"}
        </div>
        <div className="text-[11px] text-muted-foreground leading-tight">
          {isAdmin ? "Headmaster Control Center" : "Learn Smart. Score Higher."}
        </div>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  const isStudent = role === "student";

  // Student — MMORPG HUD (no sidebar, no header, no bottom tabs)
  if (isStudent) {
    return (
      <LumiProvider>
        <AcademyHUD onSignOut={handleSignOut}>
          <Outlet />
        </AcademyHUD>
        <LumiCompanion />
      </LumiProvider>
    );
  }

  // Admin — Academy Office (sidebar layout preserved)
  return (
    <LumiProvider>
    <div className="min-h-screen flex">
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
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </LumiProvider>
  );
}
