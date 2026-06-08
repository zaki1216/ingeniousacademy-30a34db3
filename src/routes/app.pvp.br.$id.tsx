import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Crown, Skull } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  getBrRoom,
  startBrRoom,
  advanceBrRoom,
  answerBrQuestion,
} from "@/lib/api/pvp-br.functions";

export const Route = createFileRoute("/app/pvp/br/$id")({ component: BrRoomPage });

function BrRoomPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const getFn = useServerFn(getBrRoom);
  const startFn = useServerFn(startBrRoom);
  const advanceFn = useServerFn(advanceBrRoom);
  const answerFn = useServerFn(answerBrQuestion);

  const q = useQuery({
    queryKey: ["br-room", id],
    queryFn: () => getFn({ data: { id } }),
    refetchInterval: 4000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`br-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pvp_br_rooms", filter: `id=eq.${id}` },
        () => q.refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pvp_br_players", filter: `room_id=eq.${id}` },
        () => q.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, q]);

  const start = useMutation({
    mutationFn: () => startFn({ data: { id } }),
    onSuccess: () => q.refetch(),
    onError: (e: Error) => toast.error(e.message),
  });
  const advance = useMutation({
    mutationFn: () => advanceFn({ data: { id } }),
    onSuccess: () => q.refetch(),
    onError: (e: Error) => toast.error(e.message),
  });

  const room = q.data;
  const myPlayer = room?.players.find((p) => p.isMe);
  const currentQ = room?.currentQuestion;
  const startedAt = useMemo(() => Date.now(), [currentQ?.order_index]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [currentQ?.order_index]);

  const answer = useMutation({
    mutationFn: (selected: string) =>
      answerFn({
        data: {
          roomId: id,
          orderIndex: currentQ!.order_index,
          selected,
          timeMs: Date.now() - startedAt,
        },
      }),
    onSuccess: (r) => {
      if (r.correct) toast.success("Correct! ✨");
      else toast.error(`Eliminated · #${r.finish_place} place`);
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!room) return <p className="text-sm text-muted-foreground">Loading room…</p>;
  const opts = (o: unknown) => (Array.isArray(o) ? (o as string[]) : []);

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" onClick={() => nav({ to: "/app/pvp" })}>
        ← Back to Arena
      </Button>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                Battle Royale
              </div>
              <div className="text-xl font-extrabold">Room {room.code}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {room.status} · {room.players.filter((p) => !p.eliminated).length}/
                {room.players.length} alive
              </div>
            </div>
            <div className="text-right text-sm font-bold text-amber-300">
              {room.prize_coins}🪙 / {room.prize_xp}✨
            </div>
          </div>

          {room.status === "waiting" && room.isHost && (
            <Button
              className="w-full mt-3"
              onClick={() => start.mutate()}
              disabled={start.isPending || room.players.length < 2}
            >
              Start ({room.players.length} ready)
            </Button>
          )}
          {room.status === "active" && room.isHost && (
            <Button
              className="w-full mt-3"
              variant="secondary"
              onClick={() => advance.mutate()}
              disabled={advance.isPending}
            >
              Next question / End round
            </Button>
          )}
        </CardContent>
      </Card>

      {room.status === "active" && currentQ && myPlayer && !myPlayer.eliminated && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-xs text-muted-foreground">
              Question {currentQ.order_index + 1}
            </div>
            <div className="font-bold">{currentQ.question_text}</div>
            <div className="grid gap-1.5">
              {opts(currentQ.options).map((opt, idx) => (
                <button
                  key={idx}
                  disabled={picked !== null || answer.isPending}
                  onClick={() => {
                    setPicked(String(idx));
                    answer.mutate(String(idx));
                  }}
                  className={`text-left px-3 py-2 rounded-lg border ${
                    picked === String(idx)
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
      )}

      {myPlayer?.eliminated && room.status === "active" && (
        <Card>
          <CardContent className="p-4 text-center">
            <Skull className="h-8 w-8 mx-auto text-red-500" />
            <div className="font-extrabold mt-1">Eliminated</div>
            <div className="text-xs text-muted-foreground">
              Finished #{myPlayer.finish_place}
            </div>
          </CardContent>
        </Card>
      )}

      {room.status === "finished" && (
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="h-10 w-10 mx-auto text-amber-400" />
            <div className="font-extrabold mt-1">
              {room.winner_id
                ? `Winner: ${room.players.find((p) => p.user_id === room.winner_id)?.name ?? "—"}`
                : "No winner"}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-extrabold text-sm mb-2 uppercase tracking-wider text-muted-foreground">
          Players
        </h2>
        <div className="space-y-1">
          {room.players
            .slice()
            .sort((a, b) => (a.finish_place ?? 99) - (b.finish_place ?? 99))
            .map((p) => (
              <div
                key={p.user_id}
                className={`flex items-center gap-2 p-2 rounded-lg border ${
                  p.eliminated ? "opacity-60 border-border" : "border-emerald-500/40 bg-emerald-500/5"
                }`}
              >
                <div className="flex-1 truncate text-sm font-medium">
                  {p.name} {p.isMe && <span className="text-[10px] text-amber-300">YOU</span>}
                </div>
                {p.eliminated ? (
                  <Skull className="h-4 w-4 text-red-500" />
                ) : (
                  <span className="text-emerald-400 text-xs font-bold">ALIVE</span>
                )}
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {p.score}pt
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
