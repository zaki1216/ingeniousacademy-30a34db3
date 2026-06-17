import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTestForStudent, submitTest } from "@/lib/api/academy.functions";
import { awardQuizRewards } from "@/lib/api/gamification.functions";
import { RewardPopup, type RewardPayload } from "@/components/gamification/RewardPopup";
import { FloatingReward, type FloatingRewardPayload } from "@/components/rpg/FloatingReward";

export const Route = createFileRoute("/app/tests/$testId")({ component: TakeTestPage });

function TakeTestPage() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getTestForStudent);
  const submitFn = useServerFn(submitTest);
  const awardFn = useServerFn(awardQuizRewards);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [floating, setFloating] = useState<FloatingRewardPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["take-test", testId],
    queryFn: () => getFn({ data: { testId } }),
  });

  const questions = data?.questions ?? [];
  const progress = useMemo(
    () => (questions.length ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0),
    [answers, questions.length],
  );

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      if (!confirm("Some questions are unanswered. Submit anyway?")) return;
    }
    setSubmitting(true);
    try {
      const r = await submitFn({ data: { testId, answers } });
      setResult({ score: r.score, total: r.total, percentage: r.percentage });
      try {
        const rw = await awardFn({ data: { testId } });
        if (!rw.alreadyAwarded) {
          setFloating({ xp: rw.xpAwarded, coins: rw.coinsAwarded, label: "Battle won", key: Date.now() });
          setReward({ ...rw, title: "Quiz complete!" });
          qc.invalidateQueries({ queryKey: ["gam-dashboard"] });
        }
      } catch { /* ignore reward errors */ }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Loading test…</p>;
  if (!data) return <p className="text-muted-foreground">Test not found.</p>;

  if (result) {
    return (
      <>
        <RewardPopup reward={reward} onClose={() => setReward(null)} />
        <FloatingReward reward={floating} />
        <div className="space-y-4 max-w-md mx-auto">
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Test submitted!</h2>
              <div className="text-5xl font-bold text-primary">{result.percentage}%</div>
              <div className="text-muted-foreground">
                {result.score} / {result.total} marks
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <Button asChild variant="outline"><Link to="/app/tests">Back to tests</Link></Button>
                <Button asChild><Link to="/app/results">View all results</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/app/tests" })}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{data.test.title}</CardTitle>
          <div className="text-sm text-muted-foreground">Total: {data.test.total_marks} marks · {questions.length} questions</div>
          <Progress value={progress} className="h-2 mt-2" />
        </CardHeader>
      </Card>

      {questions.map((q, idx) => {
        const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
        return (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-2">
              <div className="font-medium">
                Q{idx + 1}. {q.question_text}{" "}
                <span className="text-xs text-muted-foreground">({q.marks} mark{q.marks > 1 ? "s" : ""})</span>
              </div>
              <div className="space-y-1.5">
                {opts.map((o, i) => {
                  const selected = answers[q.id] === i;
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition ${
                        selected ? "border-primary bg-primary/5" : "hover:bg-accent/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        onChange={() => setAnswers({ ...answers, [q.id]: i })}
                      />
                      <span><b>{String.fromCharCode(65 + i)}.</b> {o}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="sticky bottom-0 bg-background pt-2 pb-4">
        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit test"}
        </Button>
      </div>
    </div>
  );
}
