import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Swords, Crown, Users, Plus, LogIn, Trophy, BarChart3, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listPvpOpponents,
  createDuel,
  listMyDuels,
} from "@/lib/api/pvp-duels.functions";
import {
  createBrRoom,
  joinBrRoom,
  listOpenBrRooms,
} from "@/lib/api/pvp-br.functions";

export const Route = createFileRoute("/app/pvp/")({ component: PvpHub });

function PvpHub() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 glass-card glow-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,#EF4444_0%,transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl glow-primary">
            ⚔️
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              Arena
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">Player vs Player</h1>
            <p className="text-xs text-muted-foreground">
              Duel a friend or join the Battle Royale.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/leaderboard" className="rounded-2xl glass-card p-3 flex items-center gap-2 hover:scale-[1.02] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 grid place-items-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">Rankings</div>
            <div className="text-[10px] text-muted-foreground">Leaderboards</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/app/profile" className="rounded-2xl glass-card p-3 flex items-center gap-2 hover:scale-[1.02] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">Arena Statistics</div>
            <div className="text-[10px] text-muted-foreground">Wins · streaks · rank</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>


      <Tabs defaultValue="duels">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="duels">
            <Swords className="h-4 w-4 mr-1" /> Duels
          </TabsTrigger>
          <TabsTrigger value="br">
            <Crown className="h-4 w-4 mr-1" /> Battle Royale
          </TabsTrigger>
        </TabsList>
        <TabsContent value="duels" className="mt-3 space-y-3">
          <DuelsTab />
        </TabsContent>
        <TabsContent value="br" className="mt-3 space-y-3">
          <BrTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DuelsTab() {
  const oppFn = useServerFn(listPvpOpponents);
  const duelsFn = useServerFn(listMyDuels);
  const createFn = useServerFn(createDuel);
  const qc = useQueryClient();

  const opps = useQuery({ queryKey: ["pvp-opps"], queryFn: () => oppFn() });
  const duels = useQuery({ queryKey: ["pvp-duels"], queryFn: () => duelsFn() });

  const challenge = useMutation({
    mutationFn: (opponentId: string) => createFn({ data: { opponentId } }),
    onSuccess: () => {
      toast.success("Challenge sent!");
      qc.invalidateQueries({ queryKey: ["pvp-duels"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="font-extrabold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" /> Challenge a classmate
          </div>
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {opps.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">No classmates yet.</p>
            )}
            {opps.data?.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate text-sm">{o.name}</div>
                  <div className="text-[10px] text-muted-foreground">Lvl {o.level}</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => challenge.mutate(o.id)}
                  disabled={challenge.isPending}
                >
                  Duel
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-extrabold text-sm mb-2 uppercase tracking-wider text-muted-foreground">
          My duels
        </h2>
        <div className="space-y-2">
          {duels.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No duels yet.</p>
          )}
          {duels.data?.map((d) => {
            const me = d.isChallenger ? d.challenger : d.opponent;
            const other = d.isChallenger ? d.opponent : d.challenger;
            const wonByMe = d.winner?.id === me.id;
            return (
              <Link
                key={d.id}
                to="/app/pvp/duel/$id"
                params={{ id: d.id }}
                className="block"
              >
                <Card>
                  <CardContent className="p-3 flex items-center gap-2">
                    <Swords className="h-5 w-5 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">
                        vs {other.name}
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {d.status.replace("_", " ")}
                      </div>
                    </div>
                    <div className="text-right">
                      {d.status === "finished" ? (
                        <div
                          className={`text-xs font-extrabold ${
                            wonByMe
                              ? "text-emerald-400"
                              : d.winner
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {wonByMe ? "WON" : d.winner ? "LOST" : "DRAW"}
                        </div>
                      ) : (
                        <div className="text-xs text-amber-300 font-bold">
                          {d.prize_coins}🪙 / {d.prize_xp}✨
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function BrTab() {
  const createFn = useServerFn(createBrRoom);
  const joinFn = useServerFn(joinBrRoom);
  const listFn = useServerFn(listOpenBrRooms);
  const qc = useQueryClient();
  const [code, setCode] = useState("");

  const rooms = useQuery({ queryKey: ["pvp-br-rooms"], queryFn: () => listFn() });

  const create = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (r) => {
      toast.success(`Room ${r.code} created`);
      qc.invalidateQueries({ queryKey: ["pvp-br-rooms"] });
      window.location.assign(`/app/pvp/br/${r.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const join = useMutation({
    mutationFn: (c: string) => joinFn({ data: { code: c } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["pvp-br-rooms"] });
      window.location.assign(`/app/pvp/br/${r.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Create room
        </Button>
        <div className="flex gap-1">
          <Input
            placeholder="CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="uppercase"
          />
          <Button
            size="icon"
            variant="secondary"
            onClick={() => code && join.mutate(code)}
            disabled={!code || join.isPending}
          >
            <LogIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <h2 className="font-extrabold text-sm mb-2 uppercase tracking-wider text-muted-foreground">
          Open rooms
        </h2>
        <div className="space-y-2">
          {rooms.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No rooms open.</p>
          )}
          {rooms.data?.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold">
                  {r.code.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold">{r.code}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {r.status} · {r.player_count} players
                  </div>
                </div>
                <div className="text-right text-xs font-bold text-amber-300">
                  {r.prize_coins}🪙
                </div>
                <Button size="sm" onClick={() => join.mutate(r.code)}>
                  Join
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
