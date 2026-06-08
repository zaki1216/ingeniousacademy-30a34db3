import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getDuel, submitDuelAnswers } from "@/lib/api/pvp-duels.functions";

export const Route = createFileRoute("/app/pvp/duel/$id")({
  component: DuelPage,
});

function DuelPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getFn = useServerFn(getDuel);
  const submitFn = useServerFn(submitDuelAnswers);

  const q = useQuery({
    queryKey: ["pvp-duel", id],
    queryFn: () => getFn({ data: { id } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`duel-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pvp_duels", filter: `id=eq.${id}` },
        () => q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, q]);

  const alreadyAnswered = (q.data?.my_answers.length ?? 0) > 0;
  const finished = q.data?.status === "finished";

  const startTime = useMemo(() => Date.now(), [q.data?.id]);
  const [picks, setPicks] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          duelId: id,
          answers: (q.data?.questions ?? []).map((qq) => ({
            questionId: qq.id,
            selected: picks[qq.id] ?? "-1",
            timeMs: Date.now() - startTime,
          })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Submitted! Your score: ${r.score}/5`);
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !q.data) return <p className="text-sm text-muted-foreground">Loading duel…</p>;
  const d = q.data;
  const opts = (o: unknown) => (Array.isArray(o) ? (o as string[]) : []);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/app/pvp" })}>
        ← Back to Arena
      </Button>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
            Status
          </div>
          <div className="text-xl font-extrabold">{d.status.replace("_", " ")}</div>
          {finished && (
            <div className="mt-2 text-2xl font-extrabold">
              {d.challenger_score} - {d.opponent_score}
              <div className="text-xs text-muted-foreground mt-1">
                {d.winner_id
                  ? d.winner_id === (d.isChallenger ? "self" : "self")
                    ? ""
                    : ""
                  : "Draw"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!alreadyAnswered && !finished && (
        <>
          {d.questions.map((qq, i) => (
            <Card key={qq.id}>
              <CardContent className="p-4 space-y-2">
                <div className="text-xs text-muted-foreground">Question {i + 1}</div>
                <div className="font-bold">{qq.question_text}</div>
                <div className="grid gap-1.5">
                  {opts(qq.options).map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setPicks((p) => ({ ...p, [qq.id]: String(idx) }))
                      }
                      className={`text-left px-3 py-2 rounded-lg border ${
                        picks[qq.id] === String(idx)
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button
            className="w-full"
            onClick={() => submit.mutate()}
            disabled={
              submit.isPending ||
              d.questions.some((qq) => picks[qq.id] === undefined)
            }
          >
            Submit answers
          </Button>
        </>
      )}

      {alreadyAnswered && !finished && (
        <p className="text-sm text-center text-muted-foreground">
          Waiting for opponent…
        </p>
      )}

      {finished && (
        <div className="space-y-2">
          {d.questions.map((qq, i) => {
            const mine = d.my_answers.find((a) => a.question_id === qq.id);
            return (
              <Card key={qq.id}>
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Q{i + 1}</div>
                  <div className="text-sm font-medium">{qq.question_text}</div>
                  <div className="text-xs mt-1">
                    Your pick:{" "}
                    <span className={mine?.is_correct ? "text-emerald-400" : "text-red-400"}>
                      {opts(qq.options)[Number(mine?.selected ?? -1)] ?? "—"}
                    </span>
                  </div>
                  {qq.correct_option !== null && (
                    <div className="text-xs text-emerald-400">
                      Correct: {opts(qq.options)[qq.correct_option]}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
