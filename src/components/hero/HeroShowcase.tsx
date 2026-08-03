import { Lock, Sparkles } from "lucide-react";

import type { HeroShowcase as HeroShowcaseData } from "@/lib/hero/types";

/**
 * Hero Showcase — architecture only.
 *
 * Slots are reserved for future personalisation systems (Avatar Equipment,
 * Seasonal Frames, Titles, Companions, Dorm Preview, Favourite Badge).
 * Each slot renders the value when a future system fills it, otherwise a
 * locked placeholder. No behaviour is implemented yet.
 */
const SLOTS: { key: keyof HeroShowcaseData; label: string; hint: string; icon: string }[] = [
  { key: "avatar", label: "Avatar", hint: "Customisation coming soon", icon: "🧑‍🎓" },
  { key: "frame", label: "Profile Frame", hint: "Seasonal frames coming soon", icon: "🖼️" },
  { key: "title", label: "Title", hint: "Earned titles coming soon", icon: "🎗️" },
  { key: "outfit", label: "Outfit", hint: "Visit the Outfit Boutique", icon: "👕" },
  { key: "nameplate", label: "Nameplate", hint: "Visit the Frame Studio", icon: "🔷" },
  { key: "celebration", label: "Celebration", hint: "Visit the Celebration Workshop", icon: "✨" },
  { key: "companion", label: "Companion", hint: "Companions coming soon", icon: "🐉" },
  { key: "dorm", label: "Dorm Preview", hint: "Dorm rooms coming soon", icon: "🏠" },
  { key: "favoriteBadge", label: "Favorite Badge", hint: "Visit the Badge Gallery", icon: "⭐" },
];

export function HeroShowcase({ showcase }: { showcase: HeroShowcaseData }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {SLOTS.map((s) => {
        const value = showcase[s.key];
        return (
          <div
            key={s.key}
            className="rune-border holo-card p-3 text-center relative overflow-hidden"
          >
            <div className="h-12 w-12 mx-auto rounded-xl grid place-items-center text-2xl bg-white/5 border border-white/10">
              {value ? <span>{value}</span> : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="mt-2 text-[11px] font-extrabold leading-tight">{s.label}</div>
            <div className="text-[10px] text-muted-foreground leading-snug flex items-center justify-center gap-1">
              {value ? (
                <>
                  <Sparkles className="h-3 w-3 text-amber-300" /> Equipped
                </>
              ) : (
                s.hint
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
