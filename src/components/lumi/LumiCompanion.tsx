import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import { Search, X, BookOpen, MessageCircleQuestion, ChevronRight, Sparkles } from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LumiAvatar } from "./LumiAvatar";
import { useLumi, type LumiTip } from "@/lib/lumi/LumiProvider";
import {
  LUMI_CATEGORIES,
  LUMI_ENTRIES,
  entryForCategory,
  findEntry,
  searchLumi,
  type LumiCategoryId,
  type LumiEntry,
} from "@/lib/lumi/knowledge";
import { lumiGreeting } from "@/lib/lumi/dialogue";

// Contextual tip triggers based on route visits.
const ROUTE_TIPS: { match: (path: string) => boolean; tip: LumiTip; seenId: string }[] = [
  {
    seenId: "tip.shop.first",
    match: (p) => p.startsWith("/app/shop"),
    tip: {
      id: "tip.shop.first",
      title: "The Merchant's Emporium",
      message:
        "Welcome to the Merchant. Every item here was earned through your effort — hover the Coin Goal to see what to save for next.",
      cta: { label: "Learn more", to: "/app/guidebook" },
    },
  },
  {
    seenId: "tip.arena.first",
    match: (p) => p.startsWith("/app/pvp"),
    tip: {
      id: "tip.arena.first",
      title: "The Arena awaits",
      message:
        "Challenge another Hunter to a Duel or enter a Battle Royale. Every victory earns Coins and climbs you up the Hall of Fame.",
    },
  },
  {
    seenId: "tip.journey.first",
    match: (p) => p.startsWith("/app/journey"),
    tip: {
      id: "tip.journey.first",
      title: "Choose your World",
      message:
        "Each Subject is a World, each Chapter a Dungeon. Clear every Quest to awaken the Boss inside.",
    },
  },
  {
    seenId: "tip.residence.first",
    match: (p) => p === "/app/profile",
    tip: {
      id: "tip.residence.first",
      title: "Your Academy Residence",
      message:
        "This is your home. Trophies, chests, cosmetics and your daily reward all live here — visit whenever you need to admire your progress.",
    },
  },
  {
    seenId: "tip.spin.first",
    match: (p) => p.startsWith("/app/spin"),
    tip: {
      id: "tip.spin.first",
      title: "One spin every day",
      message: "The Wheel resets each morning. Never miss it — it is one of the fastest paths to surprise loot.",
    },
  },
  {
    seenId: "tip.passes.first",
    match: (p) => p.startsWith("/app/passes"),
    tip: {
      id: "tip.passes.first",
      title: "Sealed Passes",
      message:
        "Homework Shields, Streak Shields, Retry Tokens and XP Potions — each pass grants a rare privilege. Use them wisely.",
    },
  },
  {
    seenId: "tip.inventory.first",
    match: (p) => p.startsWith("/app/inventory"),
    tip: {
      id: "tip.inventory.first",
      title: "Your Inventory Chest",
      message: "Everything you own rests here. Passes must be activated before they take effect.",
    },
  },
];

export function LumiCompanion() {
  const { state, openLumi, closeLumi, pushTip, dismissTip, hasSeen, markSeen } = useLumi();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Route-based contextual tips (fire once per lifetime).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = ROUTE_TIPS.find((r) => r.match(pathname) && !hasSeen(r.seenId));
    if (!match) return;
    const t = setTimeout(() => {
      pushTip(match.tip);
      markSeen(match.seenId);
    }, 900);
    return () => clearTimeout(t);
  }, [pathname, hasSeen, pushTip, markSeen]);

  // Auto-dismiss tip after a while
  useEffect(() => {
    if (!state.activeTip) return;
    const t = setTimeout(() => dismissTip(), 10_000);
    return () => clearTimeout(t);
  }, [state.activeTip, dismissTip]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => openLumi({ view: "chat" })}
        className="fixed z-40 bottom-24 md:bottom-6 right-4 md:right-6 group"
        aria-label="Ask Lumi"
      >
        <motion.div
          className="rune-border holo-card monarch-glow rounded-full p-2 pr-4 flex items-center gap-2 hover:scale-105 transition-transform"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <LumiAvatar size="sm" />
          <span className="text-xs font-orbitron font-bold tracking-wider hidden sm:inline">
            Ask Lumi
          </span>
        </motion.div>
      </button>

      {/* Contextual tip popover */}
      <AnimatePresence>
        {state.activeTip && !state.open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed z-40 bottom-40 md:bottom-24 right-4 md:right-6 max-w-xs rune-border holo-card p-3"
          >
            <div className="flex items-start gap-2">
              <LumiAvatar size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-orbitron uppercase tracking-widest text-[var(--rune)]">
                  Lumi whispers
                </div>
                <div className="text-sm font-extrabold">{state.activeTip.title}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {state.activeTip.message}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {state.activeTip.cta && (
                    <Link
                      to={state.activeTip.cta.to}
                      onClick={dismissTip}
                      className="text-[11px] font-bold text-[var(--rune)] hover:underline"
                    >
                      {state.activeTip.cta.label}
                    </Link>
                  )}
                  <button
                    onClick={dismissTip}
                    className="text-[11px] text-muted-foreground hover:text-foreground ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <Sheet open={state.open} onOpenChange={(o) => (o ? openLumi() : closeLumi())}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 bg-[var(--bg-void)] border-l border-white/10"
        >
          <LumiDrawer initialEntryId={state.focusEntryId} initialView={state.view} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function LumiDrawer({
  initialEntryId,
  initialView,
}: {
  initialEntryId: string | null;
  initialView: "chat" | "guide";
}) {
  const [view, setView] = useState<"chat" | "guide">(initialView);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LumiEntry | null>(
    initialEntryId ? findEntry(initialEntryId) ?? null : null,
  );
  const results = useMemo(() => searchLumi(query, 10), [query]);
  const { closeLumi } = useLumi();

  useEffect(() => {
    if (initialEntryId) {
      setView("guide");
      setSelected(findEntry(initialEntryId) ?? null);
    }
  }, [initialEntryId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative p-4 border-b border-white/10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(120, 90, 255, 0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(180, 220, 255, 0.25), transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LumiAvatar size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
              Academy Spirit
            </div>
            <div className="text-xl font-extrabold">Lumi</div>
            <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-2">
              "{lumiGreeting()}"
            </p>
          </div>
          <button
            onClick={closeLumi}
            className="h-8 w-8 rounded-lg grid place-items-center bg-white/5 hover:bg-white/10 border border-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <TabButton active={view === "chat"} onClick={() => setView("chat")} icon={<MessageCircleQuestion className="h-4 w-4" />}>
            Ask Lumi
          </TabButton>
          <TabButton active={view === "guide"} onClick={() => setView("guide")} icon={<BookOpen className="h-4 w-4" />}>
            Guidebook
          </TabButton>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {view === "chat" ? (
          <ChatView query={query} setQuery={setQuery} results={results} onOpen={(e) => { setSelected(e); setView("guide"); }} />
        ) : selected ? (
          <EntryView entry={selected} onBack={() => setSelected(null)} />
        ) : (
          <GuideIndex onOpen={(e) => setSelected(e)} />
        )}
      </div>

      <div className="p-3 border-t border-white/10 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Lumi has watched over every Cadet since the founding.
        </span>
        <Link to="/app/guidebook" onClick={closeLumi} className="font-bold text-[var(--rune)] hover:underline">
          Open full Guidebook
        </Link>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-orbitron font-bold tracking-wider border transition-all",
        active
          ? "bg-white/10 border-white/25 text-white"
          : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground",
      )}
    >
      {icon} {children}
    </button>
  );
}

const SUGGESTED_QUESTIONS = [
  "What are Keys?",
  "How do I earn Coins?",
  "How do Passes work?",
  "What is a Boss Battle?",
  "How do I raise my Rank?",
  "What are Shadows?",
];

function ChatView({
  query, setQuery, results, onOpen,
}: {
  query: string;
  setQuery: (v: string) => void;
  results: LumiEntry[];
  onOpen: (e: LumiEntry) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rune-border holo-card p-3">
        <p className="text-sm leading-relaxed">
          I am <span className="font-bold text-[var(--rune)]">Lumi</span>, spirit of Ingenious Academy.
          Ask me anything about the Campus, Journey, Merchant, Arena or Residence — I have guided every Cadet before you.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Lumi — e.g. what are Keys?"
          className="pl-9 h-10 bg-white/5 border-white/10"
        />
      </div>

      {query.trim() === "" ? (
        <div>
          <div className="text-[10px] font-orbitron uppercase tracking-widest text-muted-foreground mb-2">
            Try asking
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="text-[11px] px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="rune-border holo-card p-4 text-sm text-muted-foreground text-center">
          Hmm, I have no scroll on that yet — but the Academy grows every week. Try a different word.
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((e) => (
            <button
              key={e.id}
              onClick={() => onOpen(e)}
              className="w-full text-left rune-border holo-card p-3 hover:monarch-glow transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">{e.icon ?? "📘"}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{e.summary}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GuideIndex({ onOpen }: { onOpen: (e: LumiEntry) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        The complete lore of Ingenious Academy. New chapters are added as the Academy grows.
      </p>
      {LUMI_CATEGORIES.map((cat) => (
        <CategoryBlock key={cat.id} catId={cat.id} label={cat.label} icon={cat.icon} blurb={cat.blurb} onOpen={onOpen} />
      ))}
    </div>
  );
}

function CategoryBlock({
  catId, label, icon, blurb, onOpen,
}: {
  catId: LumiCategoryId; label: string; icon: string; blurb: string; onOpen: (e: LumiEntry) => void;
}) {
  const entries = entryForCategory(catId);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-sm font-extrabold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{blurb}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            className="w-full text-left flex items-center gap-2 rune-border holo-card px-3 py-2 hover:monarch-glow transition-all"
          >
            <span className="text-sm">{e.icon ?? "📘"}</span>
            <span className="text-sm font-bold flex-1 truncate">{e.title}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryView({ entry, onBack }: { entry: LumiEntry; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
        ← Back to Guidebook
      </Button>
      <div className="flex items-center gap-3">
        <div className="text-4xl">{entry.icon ?? "📘"}</div>
        <div>
          <div className="text-[10px] font-orbitron uppercase tracking-widest text-[var(--rune)]">
            {LUMI_CATEGORIES.find((c) => c.id === entry.category)?.label}
          </div>
          <h3 className="text-xl font-extrabold">{entry.title}</h3>
        </div>
      </div>
      <p className="text-sm italic text-white/85">"{entry.summary}"</p>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {entry.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="pt-2 flex flex-wrap gap-1.5">
        {entry.keywords.slice(0, 6).map((k) => (
          <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
            #{k}
          </span>
        ))}
      </div>
    </div>
  );
}

// Ambient reference — re-export for convenience
export { LUMI_ENTRIES };
