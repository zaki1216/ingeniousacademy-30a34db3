import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, RotateCcw, Save, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import { LUMI_CATEGORIES, LUMI_ENTRIES, type LumiEntry } from "@/lib/lumi/knowledge";
import { readLumiOverrides, setLumiOverride, applyLumiOverride } from "@/lib/lumi/overrides";

export const Route = createFileRoute("/app/admin/lumi")({
  head: () => ({ meta: [{ title: "Lumi Manager — Academy Office" }] }),
  component: LumiManagerPage,
});

function LumiManagerPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(LUMI_ENTRIES[0]?.id ?? "");
  const [overridesTick, setOverridesTick] = useState(0);

  const overrides = useMemo(() => {
    void overridesTick;
    return readLumiOverrides();
  }, [overridesTick]);

  const merged = useMemo(
    () => LUMI_ENTRIES.map((e) => applyLumiOverride(e, overrides)),
    [overrides],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [merged, search]);

  const selected = merged.find((e) => e.id === selectedId) ?? merged[0];
  const original = LUMI_ENTRIES.find((e) => e.id === selectedId);

  const [draftSummary, setDraftSummary] = useState<string>("");
  const [draftBody, setDraftBody] = useState<string>("");

  // Seed drafts when selection changes.
  useMemo(() => {
    if (selected) {
      setDraftSummary(selected.summary);
      setDraftBody(selected.body.join("\n\n"));
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;
  if (!selected || !original) return null;

  const isOverridden = Boolean(overrides[selected.id]);

  function save() {
    const bodyLines = draftBody.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    const summaryChanged = draftSummary.trim() !== original!.summary;
    const bodyChanged = JSON.stringify(bodyLines) !== JSON.stringify(original!.body);
    if (!summaryChanged && !bodyChanged) {
      setLumiOverride(selected!.id, null);
      toast.success("Reverted to Lumi's original words.");
    } else {
      setLumiOverride(selected!.id, {
        summary: summaryChanged ? draftSummary.trim() : undefined,
        body: bodyChanged ? bodyLines : undefined,
      });
      toast.success("Lumi will now speak with your voice.");
    }
    setOverridesTick((t) => t + 1);
  }

  function revert() {
    setLumiOverride(selected!.id, null);
    setDraftSummary(original!.summary);
    setDraftBody(original!.body.join("\n\n"));
    setOverridesTick((t) => t + 1);
    toast.success("Restored.");
  }

  const categoryLabel = LUMI_CATEGORIES.find((c) => c.id === selected.category)?.label ?? selected.category;

  return (
    <div className="space-y-5">
      <HeadmasterHeader
        icon={<Sparkles className="h-7 w-7" />}
        title="Lumi Manager"
        tagline="Shape the words the Academy Spirit speaks to every Cadet."
        lumi="Rewrite any entry to match your Academy's voice. Cadets will see your edits instantly across the Guidebook and Lumi's whispers."
      />

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        {/* Entry list */}
        <Card className="h-fit">
          <CardHeader className="pb-2 space-y-2">
            <CardTitle className="text-sm font-orbitron uppercase tracking-widest">Dialogue Entries</CardTitle>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </CardHeader>
          <CardContent className="p-2 max-h-[560px] overflow-y-auto space-y-1">
            {filtered.map((e) => {
              const overridden = Boolean(overrides[e.id]);
              const active = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left p-2 rounded-lg border transition ${
                    active
                      ? "border-amber-500/60 bg-amber-500/10"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{e.title}</span>
                    {overridden && <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[9px] shrink-0">custom</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {LUMI_CATEGORIES.find((c) => c.id === e.category)?.icon} {LUMI_CATEGORIES.find((c) => c.id === e.category)?.label}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{selected.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">{categoryLabel}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOverridden && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-300">Overridden</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={revert} disabled={!isOverridden}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Revert
                  </Button>
                  <Button size="sm" onClick={save} className="bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 hover:from-amber-400 hover:to-amber-500">
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-orbitron uppercase tracking-wider text-muted-foreground">Summary</label>
                <Textarea
                  value={draftSummary}
                  onChange={(e) => setDraftSummary(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
                <div className="text-[10px] text-muted-foreground mt-1">
                  Original: <span className="italic">{original.summary}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-orbitron uppercase tracking-wider text-muted-foreground">
                  Body (separate paragraphs with a blank line)
                </label>
                <Textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={10}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-orbitron uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Lumi Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <LumiBubble text={draftSummary || selected.summary} />
              {draftBody.split(/\n{2,}/).filter(Boolean).map((p, i) => (
                <LumiBubble key={i} text={p} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LumiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-7 w-7 shrink-0 rounded-full grid place-items-center bg-gradient-to-br from-sky-400 to-violet-500 text-white text-xs">
        ✨
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-sm px-3 py-2 bg-background border border-amber-500/20 text-sm leading-relaxed italic">
        {text}
      </div>
    </div>
  );
}
