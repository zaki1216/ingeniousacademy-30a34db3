import { createFileRoute, Link } from "@tanstack/react-router";
import { Cog, Trophy, Coins, Zap, Shield, Palette, Store, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";

export const Route = createFileRoute("/app/admin/settings")({
  head: () => ({ meta: [{ title: "Academy Settings — Academy Office" }] }),
  component: SettingsPage,
});

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-2">
        <Badge variant="outline">Coming soon</Badge>
        <div className="font-semibold text-lg">{title}</div>
        <div className="text-sm text-muted-foreground max-w-md mx-auto">{desc}</div>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Cog className="h-7 w-7" />}
        title="Academy Settings"
        tagline="Every rule, ceremony and clockwork gear of Ingenious Academy — in one place."
        lumi="Adjust a setting here and every classroom, hall and dungeon adapts."
      />

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general"><Cog className="h-3.5 w-3.5 mr-1" />General</TabsTrigger>
          <TabsTrigger value="ranks"><Trophy className="h-3.5 w-3.5 mr-1" />Academy Ranks</TabsTrigger>
          <TabsTrigger value="coins"><Coins className="h-3.5 w-3.5 mr-1" />Coin Economy</TabsTrigger>
          <TabsTrigger value="xp"><Zap className="h-3.5 w-3.5 mr-1" />XP Config</TabsTrigger>
          <TabsTrigger value="guardian"><Shield className="h-3.5 w-3.5 mr-1" />Guardian</TabsTrigger>
          <TabsTrigger value="market"><Store className="h-3.5 w-3.5 mr-1" />Marketplace</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="h-3.5 w-3.5 mr-1" />Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Academy Preferences</div>
              <div className="text-sm text-muted-foreground">
                Use the profile-level preferences page for account and interface settings.
              </div>
              <Link to="/app/settings" className="inline-block text-sm text-amber-400 hover:underline">
                Open profile preferences →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4" />Announcements</div>
              <div className="text-sm text-muted-foreground">
                Broadcast a message to every Cadet from the Lumi Manager.
              </div>
              <Link to="/app/admin/lumi" className="inline-block text-sm text-amber-400 hover:underline">
                Open Lumi Manager →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranks" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">Academy Ranks</div>
              <div className="text-sm text-muted-foreground">
                Manage the long-term promotion ladder, XP thresholds, icons and rank messages.
              </div>
              <Link to="/app/admin/ranks" className="inline-block text-sm text-amber-400 hover:underline">
                Open Rank Manager →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coins" className="mt-4">
          <ComingSoon title="Coin Economy" desc="Configure coin rewards, multipliers, spend rules and daily caps." />
        </TabsContent>
        <TabsContent value="xp" className="mt-4">
          <ComingSoon title="XP Configuration" desc="Tune how much XP each action awards across the Academy." />
        </TabsContent>
        <TabsContent value="guardian" className="mt-4">
          <ComingSoon title="Guardian Configuration" desc="Set parent-guardian notification preferences and reporting cadence." />
        </TabsContent>
        <TabsContent value="market" className="mt-4">
          <ComingSoon title="Marketplace" desc="Future rewards shop configuration — items, prices, availability." />
        </TabsContent>
        <TabsContent value="theme" className="mt-4">
          <ComingSoon title="Theme & Branding" desc="Academy logo, palette, hero copy and share metadata." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
