import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AcademyPageSkeleton } from "@/components/academy/AcademyStates";
import { DormRoom } from "@/components/dorm/DormRoom";
import { HeroShowcaseWall } from "@/components/dorm/HeroShowcaseWall";
import { TrophyShelf } from "@/components/dorm/TrophyShelf";
import { AchievementWall } from "@/components/dorm/AchievementWall";
import { useDorm, useDormActions } from "@/lib/dorm/useDorm";
import { DORM_SLOTS, DORM_SLOT_BY_ID, type DormDecoration } from "@/lib/dorm/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/dorm")({
  head: () => ({
    meta: [
      { title: "My Academy — Your Dorm Room | Ingenious Academy" },
      {
        name: "description",
        content:
          "Your own Academy quarters: decorate your study space, display trophies, achievements and your Hero showcase.",
      },
      { property: "og:title", content: "My Academy — Your Dorm Room" },
      {
        property: "og:description",
        content: "A personal Academy room that grows with every Quest you complete.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyAcademy,
});

function MyAcademy() {
  const { data, isLoading } = useDorm();
  const { placeItem } = useDormActions();
  const [editing, setEditing] = useState<string | null>(null);

  const itemsById = useMemo(
    () => new Map((data?.owned ?? []).map((i) => [i.id, i])),
    [data?.owned],
  );

  const slot = editing ? DORM_SLOT_BY_ID.get(editing) : undefined;
  const options: DormDecoration[] = useMemo(
    () => (slot ? (data?.owned ?? []).filter((i) => i.type === slot.category) : []),
    [data?.owned, slot],
  );

  const layout = data?.layout ?? {};

  const choose = (itemId: string | null) => {
    if (!editing) return;
    placeItem.mutate(
      { slotId: editing, itemId },
      {
        onSuccess: () => {
          toast.success(itemId ? "Room updated" : "Slot cleared");
          setEditing(null);
        },
      },
    );
  };

  if (isLoading || !data) {
    return <AcademyPageSkeleton label="Unlocking your quarters…" />;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 flex-wrap">
        <div className="h-11 w-11 rounded-2xl grid place-items-center bg-white/5 border border-white/10 text-2xl">
          🏠
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight">My Academy</h1>
          <p className="text-xs text-muted-foreground">
            Your personal quarters — decorate it, fill the shelves, make it yours.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/app/marketplace">
            <ShoppingBag className="h-4 w-4 mr-1" /> Dorm Decor Store
          </Link>
        </Button>
      </header>

      <DormRoom
        layout={layout}
        itemsById={itemsById}
        avatar={data.hero.avatar || "🧑‍🎓"}
        onEdit={setEditing}
      />

      {/* Mobile-friendly vertical exploration: tap any spot to edit it. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {DORM_SLOTS.map((s) => {
          const item = layout[s.id] ? itemsById.get(layout[s.id]!) : undefined;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setEditing(s.id)}
              className="rune-border holo-card p-2.5 text-left flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              <div className="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-xl bg-white/5 border border-white/10">
                {item?.value || item?.icon || s.placeholder}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{s.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {item ? item.name : "Empty"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <HeroShowcaseWall hero={data.hero} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrophyShelf trophies={data.trophies} />
        <AchievementWall achievements={data.achievements} />
      </div>

      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Home className="h-3 w-3" /> Your room is cosmetic only — it never changes XP, Coins or your
        learning progress.
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{slot ? slot.label : "Decorate"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">{slot?.hint}</p>

          {options.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-2">
              <Sparkles className="h-5 w-5 mx-auto text-amber-300" />
              <div className="text-sm font-bold">Nothing for this spot yet</div>
              <p className="text-xs text-muted-foreground">
                Buy decorations at the Dorm Decor Store on Academy Street.
              </p>
              <Button asChild size="sm">
                <Link to="/app/marketplace">Visit the Marketplace</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => choose(null)}
                disabled={placeItem.isPending}
                className="rounded-xl border border-dashed border-white/20 p-3 text-xs text-muted-foreground hover:bg-white/5"
              >
                Empty
              </button>
              {options.map((it) => {
                const active = layout[slot!.id] === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => choose(it.id)}
                    disabled={placeItem.isPending}
                    className={cn(
                      "rounded-xl border p-3 text-center transition-colors",
                      active
                        ? "border-amber-300/70 bg-amber-300/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <div className="text-2xl leading-none">{it.value || it.icon || "✨"}</div>
                    <div className="mt-1 text-[10px] font-bold truncate">{it.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
