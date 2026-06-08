import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getTalentTree } from "@/lib/api/talents.functions";

type Props = {
  /** Compact = single-row badges, full = bigger card with header. */
  variant?: "full" | "compact";
  title?: string;
};

export function ActiveBonusesCard({ variant = "full", title = "Active Hero Bonuses" }: Props) {
  const fetchTree = useServerFn(getTalentTree);
  const { data } = useQuery({
    queryKey: ["talent-tree"],
    queryFn: () => fetchTree(),
    staleTime: 60_000,
  });

  const talents = data?.talents ?? [];
  const tierOf = (code: string) => talents.find((t: { code: string; tier: number }) => t.code === code)?.tier ?? 0;

  const coinTier = tierOf("coin_multiplier");
  const xpTier = tierOf("xp_boost");
  const shieldTier = tierOf("streak_shield");
  const hintTier = tierOf("hint_orb");

  const items = [
    {
      key: "coin",
      icon: "💰",
      label: "Treasure",
      value: coinTier > 0 ? `+${coinTier * 5}% coins` : "Locked",
      active: coinTier > 0,
      color: "from-amber-400 to-yellow-600",
    },
    {
      key: "xp",
      icon: "✨",
      label: "Wisdom",
      value: xpTier > 0 ? `+${xpTier * 5}% XP` : "Locked",
      active: xpTier > 0,
      color: "from-violet-500 to-fuchsia-600",
    },
    {
      key: "shield",
      icon: "🛡️",
      label: "Shield",
      value: shieldTier > 0 ? `${shieldTier} day grace` : "Locked",
      active: shieldTier > 0,
      color: "from-sky-400 to-blue-600",
    },
    {
      key: "orb",
      icon: "🔮",
      label: "Hints",
      value: hintTier > 0 ? `+${hintTier} per quiz` : "Locked",
      active: hintTier > 0,
      color: "from-emerald-400 to-teal-600",
    },
  ];

  if (variant === "compact") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((it) => (
          <div
            key={it.key}
            className={`shrink-0 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-bold border ${
              it.active
                ? `bg-gradient-to-r ${it.color} text-white border-transparent shadow`
                : "bg-muted text-muted-foreground border-border opacity-70"
            }`}
            title={`${it.label}: ${it.value}`}
          >
            <span className="text-sm leading-none">{it.icon}</span>
            <span>{it.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              Talents
            </div>
            <h3 className="font-extrabold leading-tight text-sm">{title}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((it) => (
            <div
              key={it.key}
              className={`rounded-xl p-2.5 border flex items-center gap-2 ${
                it.active
                  ? `bg-gradient-to-br ${it.color} border-transparent text-white shadow`
                  : "bg-muted/40 border-border opacity-70"
              }`}
            >
              <div className="text-xl leading-none">{it.icon}</div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold opacity-90">
                  {it.label}
                </div>
                <div className="text-xs font-extrabold truncate">{it.value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
