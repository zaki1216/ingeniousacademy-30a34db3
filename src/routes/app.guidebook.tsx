import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { LumiAvatar } from "@/components/lumi/LumiAvatar";
import {
  LUMI_CATEGORIES,
  entryForCategory,
  searchLumi,
  type LumiCategoryId,
  type LumiEntry,
} from "@/lib/lumi/knowledge";
import { lumiGreeting } from "@/lib/lumi/dialogue";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/guidebook")({
  head: () => ({
    meta: [
      { title: "Lumi's Guidebook — Ingenious Academy" },
      { name: "description", content: "The complete encyclopedia of Ingenious Academy — every building, quest, coin, pass and companion, told by Lumi." },
    ],
  }),
  component: GuidebookPage,
});

function GuidebookPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<LumiCategoryId>("getting-started");
  const [entry, setEntry] = useState<LumiEntry | null>(null);
  const results = useMemo(() => searchLumi(query, 20), [query]);
  const items = query.trim() ? results : entryForCategory(cat);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rune-border holo-card monarch-glow relative overflow-hidden p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(120, 90, 255, 0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(180, 220, 255, 0.25), transparent 55%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <LumiAvatar size="xl" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
              Academy Spirit · Since the founding
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Lumi's Guidebook</h1>
            <p className="text-sm text-white/85 italic mt-1 max-w-2xl">
              "{lumiGreeting()} Every lantern of knowledge in Ingenious Academy is kept safe within these pages."
            </p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setEntry(null); }}
            placeholder="Search the Academy — e.g. What are Keys?"
            className="pl-9 h-11 bg-white/5 border-white/10"
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Category rail */}
        <aside className="rune-border holo-card p-2 h-fit sticky top-20">
          <div className="text-[10px] font-orbitron uppercase tracking-widest text-muted-foreground px-2 py-1.5">
            Categories
          </div>
          <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
            {LUMI_CATEGORIES.map((c) => {
              const active = c.id === cat && !query.trim();
              return (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); setQuery(""); setEntry(null); }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-all",
                    active ? "bg-white/10 border border-white/20 font-bold" : "hover:bg-white/5",
                  )}
                >
                  <span>{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <section>
          {entry ? (
            <EntryDetail entry={entry} onBack={() => setEntry(null)} />
          ) : (
            <div>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="text-lg font-extrabold">
                  {query.trim()
                    ? `Search — ${items.length} scroll${items.length === 1 ? "" : "s"}`
                    : LUMI_CATEGORIES.find((c) => c.id === cat)?.label}
                </h2>
                {!query.trim() && (
                  <span className="text-[11px] text-muted-foreground italic">
                    {LUMI_CATEGORIES.find((c) => c.id === cat)?.blurb}
                  </span>
                )}
              </div>
              {items.length === 0 ? (
                <div className="rune-border holo-card p-6 text-sm text-muted-foreground text-center">
                  Hmm, no scroll on that yet — but the Academy grows every week.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEntry(e)}
                      className="text-left rune-border holo-card p-4 hover:monarch-glow transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{e.icon ?? "📘"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold">{e.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.summary}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3" /> New wisdom is added to Lumi's Guidebook as the Academy grows.
      </div>
    </div>
  );
}

function EntryDetail({ entry, onBack }: { entry: LumiEntry; onBack: () => void }) {
  const cat = LUMI_CATEGORIES.find((c) => c.id === entry.category);
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rune-border holo-card p-5 space-y-4"
    >
      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to {cat?.label}
      </button>
      <div className="flex items-center gap-4">
        <div className="text-5xl">{entry.icon ?? "📘"}</div>
        <div>
          <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
            {cat?.label}
          </div>
          <h1 className="text-2xl font-extrabold">{entry.title}</h1>
        </div>
      </div>
      <p className="text-base italic text-white/90 border-l-2 border-white/20 pl-3">
        "{entry.summary}"
      </p>
      <div className="prose prose-invert prose-sm max-w-none space-y-3 text-white/85">
        {entry.body.map((p, i) => (
          <p key={i} className="leading-relaxed">{p}</p>
        ))}
      </div>
      <div className="pt-2 flex flex-wrap gap-1.5">
        {entry.keywords.map((k) => (
          <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
            #{k}
          </span>
        ))}
      </div>
    </motion.article>
  );
}
