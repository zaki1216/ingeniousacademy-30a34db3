import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logoAsset from "@/assets/ingenious-logo.jpg.asset.json";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { checkSetupNeeded } from "@/lib/api/academy.functions";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
    const status = await checkSetupNeeded();
    if (status.setupNeeded) throw redirect({ to: "/setup" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check is_active
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error("Your account is disabled. Please contact your admin.");
      }
      toast.success("Welcome back");
      navigate({ to: "/app" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden mb-2 shadow-[var(--shadow-card)]">
            <img src={logoAsset.url} alt="Ingenious Academy" className="h-14 w-14 object-contain" />
          </div>
          <CardTitle className="text-2xl">Ingenious Academy</CardTitle>
          <CardDescription>Learn Smart. Understand Better. Score Higher.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setMode("student")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === "student"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setMode("admin")}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <p className="text-xs text-center text-muted-foreground pt-2">
              {mode === "student"
                ? "Accounts are created by your academy admin. No public signup."
                : "Super Admin account created during first-time setup only."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
