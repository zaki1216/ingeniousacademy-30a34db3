import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useState } from "react";
import { Search, PlayCircle, CheckCircle2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { YouTubePlayer } from "@/components/gamification/YouTubePlayer";
import { RewardPopup, type RewardPayload } from "@/components/gamification/RewardPopup";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";
import { completeVideo } from "@/lib/api/gamification.functions";

export const Route = createFileRoute("/app/lectures")({ component: LecturesPage });

function LecturesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const completeFn = useServerFn(completeVideo);

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [activeLecture, setActiveLecture] = useState<{ id: string; url: string; title: string } | null>(null);
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("standard_id").eq("id", user!.id).maybeSingle()).data,
  });
  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["subjects-by-std", standardId],
    enabled: !!standardId,
    queryFn: async () => (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [],
  });

  const completions = useQuery({
    queryKey: ["video-completions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("video_completions").select("lecture_id").eq("user_id", user!.id)).data ?? [],
  });
  const completedSet = useMemo(() => new Set((completions.data ?? []).map((c) => c.lecture_id)), [completions.data]);

  const lectures = useQuery({
    queryKey: ["lectures-flat", standardId],
    enabled: !!standardId,
    queryFn: async () => {
      const subs = (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [];
      if (subs.length === 0) return [];
      const chapters = (await supabase.from("chapters").select("id, chapter_name, chapter_number, subject_id").in("subject_id", subs.map((s) => s.id))).data ?? [];
      if (chapters.length === 0) return [];
      const lecs = (await supabase.from("lectures").select("*").in("chapter_id", chapters.map((c) => c.id)).order("lecture_number")).data ?? [];
      return lecs.map((l) => {
        const ch = chapters.find((c) => c.id === l.chapter_id);
        const sub = subs.find((s) => s.id === ch?.subject_id);
        return { ...l, chapter_name: ch?.chapter_name, chapter_number: ch?.chapter_number, subject_id: sub?.id, subject_name: sub?.subject_name };
      });
    },
  });

  const filtered = useMemo(() => {
    return (lectures.data ?? []).filter((l) =>
      (subjectId === "all" || l.subject_id === subjectId) &&
      (search === "" ||
        l.lecture_title.toLowerCase().includes(search.toLowerCase()) ||
        l.chapter_name?.toLowerCase().includes(search.toLowerCase())),
    );
  }, [lectures.data, subjectId, search]);

  const handleVideoEnded = useCallback(async () => {
    if (!activeLecture) return;
    try {
      const r = await completeFn({ data: { lectureId: activeLecture.id } });
      if (!r.alreadyCompleted) {
        setFloating({ xp: r.xpAwarded, coins: r.coinsAwarded, label: "Lecture", key: Date.now() });
        setReward({ ...r, title: "Lecture complete!" });
        qc.invalidateQueries({ queryKey: ["video-completions"] });
        qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
      }
    } catch {
      /* silent */
    }
  }, [activeLecture, completeFn, qc]);

  if (!standardId) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Lectures</h1>
        <p className="text-muted-foreground text-sm">Your standard is not set yet. Please contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RewardPopup reward={reward} onClose={() => setReward(null)} />
      <FloatingReward reward={floating} />
      <div>
        <h1 className="text-2xl font-bold">Lectures</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} videos · Watch fully to earn XP</p>
      </div>

      {activeLecture && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <YouTubePlayer url={activeLecture.url} title={activeLecture.title} onComplete={handleVideoEnded} />
            <div className="flex items-center justify-between">
              <div className="font-semibold">{activeLecture.title}</div>
              <button className="text-sm text-muted-foreground" onClick={() => setActiveLecture(null)}>Close</button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9" />
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((l) => {
          const done = completedSet.has(l.id);
          return (
            <Card key={l.id} className="cursor-pointer hover:bg-accent/30 transition" onClick={() => setActiveLecture({ id: l.id, url: l.youtube_url, title: l.lecture_title })}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"}`}>
                  {done ? <CheckCircle2 className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">L {l.lecture_number}. {l.lecture_title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.subject_name} · Ch {l.chapter_number}. {l.chapter_name}
                  </div>
                </div>
                {done && <span className="text-[10px] font-semibold text-green-600 uppercase">+50 XP</span>}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No lectures found.</p>
        )}
      </div>
    </div>
  );
}
