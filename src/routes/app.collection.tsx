import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Award, Crown, Ghost, PawPrint, Sparkles, Trophy } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getCollection } from "@/lib/api/rpg-collection.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/collection")({ component: CollectionPage });

const RARITY_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  common:   { ring: "ring-slate-300/40",   chip: "bg-slate-500/20 text-slate-200",       label: "Common" },
  rare:     { ring: "ring-cyan-300/50",    chip: "bg-cyan-500/20 text-cyan-200",         label: "Rare" },
  epic:     { ring: "ring-violet-300/50",  chip: "bg-violet-500/20 text-violet-200",     label: "Epic" },
  legendary:{ ring: "ring-amber-300/60",   chip: "bg-amber-500/20 text-amber-200",       label: "Legendary" },
  mythic:   { ring: "ring-fuchsia-300/70", chip: "bg-fuchsia-500/20 text-fuchsia-100",   label: "Mythic" },
};

function rarity(r: string) {
  return RARITY_STYLE[r] ?? RARITY_STYLE.common;
}

function CollectionPage() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getCollection);
  const data = useQuery({
    queryKey: ["collection", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchFn(),
  });

  const titles = data.data?.titles ?? [];
  const shadows = data.data?.shadows ?? [];
  const season = data.data?.currentSeason;
  const pct = data.data?.collectionPct ?? 0;

  return (
    <div className="space-y-5">
      <div className="rune-border holo-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_0%,var(--monarch)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,var(--rune)_0%,transparent_50%)]" />
        <div className="relative flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-2xl">
            <Trophy className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] font-orbitron text-amber-300">Collection</div>
            <h1 className="text-2xl font-extrabold leading-tight">Hunter's Vault</h1>
            <div className="text-xs text-muted-foreground">Shadows · Titles · Badges · Pets</div>
          </div>
          <div className="text-right">
            <div className="font-orbitron font-black text-3xl">{pct}%</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Complete</div>
          </div>
        </div>
        <div className="relative mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-[image:var(--gradient-primary)]"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9 }}
          />
        </div>
      </div>

      {season && (
        <div className="rounded-2xl glass-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 grid place-items-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-violet-200">Current Season</div>
            <div className="font-extrabold">{season.name}</div>
            <div className="text-xs text-muted-foreground">
              Ends {new Date(season.ends_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="shadows">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="shadows"><Ghost className="h-4 w-4 mr-1" />Shadows</TabsTrigger>
          <TabsTrigger value="titles"><Crown className="h-4 w-4 mr-1" />Titles</TabsTrigger>
          <TabsTrigger value="pets"><PawPrint className="h-4 w-4 mr-1" />Pets</TabsTrigger>
          <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1" />Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="shadows" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shadows.map((s) => {
              const r = rarity(s.rarity);
              return (
                <div
                  key={s.code}
                  className={cn(
                    "rounded-2xl glass-card p-3 relative ring-1",
                    r.ring,
                    !s.owned && "opacity-50 grayscale",
                  )}
                >
                  <div className="text-4xl text-center">{s.icon || "👤"}</div>
                  <div className="text-sm font-extrabold text-center truncate mt-1">{s.name}</div>
                  <div className={cn("mx-auto mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold", r.chip)}>
                    {r.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center mt-1 line-clamp-2">
                    {s.unlock_rule}
                  </div>
                </div>
              );
            })}
            {shadows.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No shadows yet.</p>}
          </div>
        </TabsContent>

        <TabsContent value="titles" className="mt-4">
          <div className="space-y-2">
            {titles.map((t) => {
              const r = rarity(t.rarity);
              return (
                <div
                  key={t.code}
                  className={cn(
                    "rounded-xl glass-card p-3 flex items-center gap-3 ring-1",
                    r.ring,
                    !t.owned && "opacity-60",
                  )}
                >
                  <Crown className="h-5 w-5 text-amber-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", r.chip)}>{r.label}</span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pets" className="mt-4">
          <Link to="/app/pets" className="block rounded-2xl glass-card p-5 text-center">
            <PawPrint className="h-8 w-8 mx-auto text-emerald-300" />
            <div className="mt-2 font-extrabold">Open the Pet Sanctuary</div>
            <div className="text-xs text-muted-foreground">View your companion collection</div>
          </Link>
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          <Link to="/app/achievements" className="block rounded-2xl glass-card p-5 text-center">
            <Award className="h-8 w-8 mx-auto text-amber-300" />
            <div className="mt-2 font-extrabold">Open the Badge Hall</div>
            <div className="text-xs text-muted-foreground">View all achievements & badges</div>
          </Link>
        </TabsContent>
      </Tabs>
    </div>
  );
}
