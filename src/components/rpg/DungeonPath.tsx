import { motion } from "framer-motion";
import { CheckCircle2, Lock, PlayCircle, Crown, Skull, Coins, Sparkles } from "lucide-react";
import type { LectureUnlockState } from "@/lib/api/lecture-progression.functions";
import { cn } from "@/lib/utils";

type Lecture = { id: string; lecture_title: string; lecture_number: number; youtube_url: string };

export function DungeonPath({
  lectures,
  stateById,
  completedSet,
  onSelect,
  bossReady,
  bossDefeated,
  bossXp,
  bossCoins,
  bossAwardedXp,
  bossAwardedCoins,
  totalQuests,
  onBossClick,
}: {
  lectures: Lecture[];
  stateById: Map<string, LectureUnlockState>;
  completedSet: Set<string>;
  onSelect: (l: Lecture, locked: boolean, prevNum: number | null) => void;
  bossReady: boolean;
  bossDefeated: boolean;
  bossXp: number;
  bossCoins: number;
  bossAwardedXp: number | null;
  bossAwardedCoins: number | null;
  totalQuests: number;
  onBossClick: () => void;
}) {
  if (lectures.length === 0) return null;

  return (
    <div
      className="relative rounded-3xl border border-white/10 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.75) 50%, rgba(76,29,149,0.55) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px -20px rgba(0,0,0,0.6)",
      }}
    >
      {/* torch corners */}
      <div className="absolute top-2 left-3 text-2xl select-none pointer-events-none" style={{ filter: "drop-shadow(0 0 12px rgba(251,146,60,0.7))" }}>🔥</div>
      <div className="absolute top-2 right-3 text-2xl select-none pointer-events-none" style={{ filter: "drop-shadow(0 0 12px rgba(251,146,60,0.7))" }}>🔥</div>

      <div className="text-center pt-4 pb-2">
        <div className="text-[10px] uppercase tracking-[0.4em] text-amber-300 font-orbitron font-bold">
          Dungeon Path
        </div>
      </div>

      <div className="relative px-4 pb-6 pt-2">
        {lectures.map((l, i) => {
          const st = stateById.get(l.id);
          const locked = st ? !st.unlocked : i !== 0;
          const done = completedSet.has(l.id);
          const passed = !!st?.quiz_passed;
          const side = i % 2 === 0 ? "left" : "right";
          const nextLocked = i < lectures.length - 1 ? !(stateById.get(lectures[i + 1].id)?.unlocked ?? false) : false;

          return (
            <div key={l.id} className="relative">
              <QuestNode
                l={l}
                locked={locked}
                done={done}
                passed={passed}
                prevNum={st?.prev_lecture_number ?? null}
                passingMarks={st?.passing_marks ?? 0}
                totalMarks={st?.total_marks ?? 0}
                hasQuiz={!!st?.test_id}
                side={side}
                onClick={() => onSelect(l, locked, st?.prev_lecture_number ?? null)}
                delay={i * 0.05}
              />
              {/* connector to next node */}
              {i < lectures.length - 1 && <PathConnector locked={nextLocked} />}
            </div>
          );
        })}

        {/* Boss node at the tail */}
        <PathConnector locked={!bossReady && !bossDefeated} />
        <BossNode
          ready={bossReady}
          defeated={bossDefeated}
          xp={bossAwardedXp ?? bossXp}
          coins={bossAwardedCoins ?? bossCoins}
          totalQuests={totalQuests}
          onClick={onBossClick}
        />
      </div>
    </div>
  );
}

function QuestNode({
  l, locked, done, passed, prevNum, passingMarks, totalMarks, hasQuiz, side, onClick, delay,
}: {
  l: Lecture;
  locked: boolean;
  done: boolean;
  passed: boolean;
  prevNum: number | null;
  passingMarks: number;
  totalMarks: number;
  hasQuiz: boolean;
  side: "left" | "right";
  onClick: () => void;
  delay: number;
}) {
  const state: "passed" | "done" | "unlocked" | "locked" = passed ? "passed" : done ? "done" : locked ? "locked" : "unlocked";
  const bg =
    state === "passed" ? "linear-gradient(135deg,#fbbf24,#b45309)"
    : state === "done" ? "linear-gradient(135deg,#22d3ee,#0e7490)"
    : state === "unlocked" ? "linear-gradient(135deg,#a78bfa,#6d28d9)"
    : "linear-gradient(135deg,#475569,#1e293b)";
  const glow =
    state === "passed" ? "rgba(251,191,36,0.75)"
    : state === "done" ? "rgba(34,211,238,0.6)"
    : state === "unlocked" ? "rgba(167,139,250,0.7)"
    : "rgba(0,0,0,0.4)";

  const alignLeft = side === "left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn("flex items-stretch gap-3", alignLeft ? "flex-row" : "flex-row-reverse")}
    >
      {/* Node medallion */}
      <button
        type="button"
        onClick={onClick}
        className="relative shrink-0 focus:outline-none group"
      >
        <motion.div
          whileHover={{ scale: locked ? 1 : 1.08 }}
          whileTap={{ scale: locked ? 1 : 0.94 }}
          animate={state === "unlocked" ? { boxShadow: [`0 0 0px ${glow}`, `0 0 30px ${glow}`, `0 0 0px ${glow}`] } : undefined}
          transition={state === "unlocked" ? { duration: 1.8, repeat: Infinity } : undefined}
          className="h-16 w-16 md:h-20 md:w-20 rounded-full grid place-items-center font-orbitron font-black text-lg md:text-xl relative"
          style={{
            background: bg,
            boxShadow: `0 8px 20px rgba(0,0,0,0.5), 0 0 25px ${glow}`,
            border: "3px solid rgba(255,255,255,0.35)",
            color: "white",
          }}
        >
          {state === "passed" ? <CheckCircle2 className="h-7 w-7" />
          : state === "done" ? <PlayCircle className="h-7 w-7" />
          : state === "locked" ? <Lock className="h-6 w-6 text-amber-100/70" />
          : String(l.lecture_number).padStart(2, "0")}

          {/* Chain overlay when locked */}
          {state === "locked" && (
            <svg className="absolute -inset-1 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(120,53,15,0.7)" strokeWidth="3" strokeDasharray="6 4" />
            </svg>
          )}
        </motion.div>
        {/* Quest number label */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[9px] font-orbitron font-black tracking-widest text-amber-100 whitespace-nowrap"
          style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(251,191,36,0.4)" }}>
          QUEST {String(l.lecture_number).padStart(2, "0")}
        </div>
      </button>

      {/* Scroll card */}
      <button
        type="button"
        onClick={onClick}
        disabled={locked}
        className={cn(
          "flex-1 min-w-0 text-left rounded-2xl p-3 border transition relative overflow-hidden",
          locked ? "border-white/10 opacity-70 cursor-not-allowed" : "border-amber-400/25 hover:border-amber-300/60 cursor-pointer",
        )}
        style={{
          background: locked
            ? "rgba(15,23,42,0.5)"
            : "linear-gradient(135deg, rgba(30,27,75,0.7), rgba(76,29,149,0.5))",
        }}
      >
        <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
          {state === "passed" ? "Cleared" : state === "done" ? "Awaiting Quiz" : state === "locked" ? "Sealed" : "Unlocked"}
        </div>
        <div className="font-extrabold truncate text-amber-50">{l.lecture_title}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {locked
            ? `🔒 Pass Quest ${String(prevNum ?? "").padStart(2, "0")} quiz to break the chain`
            : passed
            ? "Quiz cleared · path forward opened"
            : hasQuiz
            ? `Quiz gate · pass ${passingMarks}/${totalMarks}`
            : "Watch to earn XP"}
        </div>
        {!locked && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-100/90">
              <Sparkles className="h-3 w-3" /> +50 XP
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-100/90">
              ⏱ ≈ 10 min
            </span>
            {hasQuiz && (
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border",
                passed ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
              )}>
                {passed ? "Quiz ✓" : "Quiz Required"}
              </span>
            )}
          </div>
        )}
      </button>
    </motion.div>
  );
}

function PathConnector({ locked }: { locked: boolean }) {
  return (
    <div className="flex justify-center my-2">
      <svg width="24" height="36" viewBox="0 0 24 36">
        <line
          x1="12" y1="0" x2="12" y2="36"
          stroke={locked ? "rgba(120,53,15,0.5)" : "rgba(251,191,36,0.6)"}
          strokeWidth="3"
          strokeDasharray="4 3"
        />
        {locked && (
          <text x="12" y="22" fontSize="14" textAnchor="middle" fill="rgba(251,191,36,0.85)">⛓</text>
        )}
      </svg>
    </div>
  );
}

function BossNode({
  ready, defeated, xp, coins, totalQuests, onClick,
}: {
  ready: boolean;
  defeated: boolean;
  xp: number;
  coins: number;
  totalQuests: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!ready && !defeated}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      whileHover={ready || defeated ? { scale: 1.02 } : undefined}
      className={cn(
        "w-full mt-2 rounded-2xl p-4 border-2 relative overflow-hidden text-left",
        defeated
          ? "border-amber-400/60"
          : ready
          ? "border-rose-500/60 cursor-pointer"
          : "border-white/10 opacity-70 cursor-not-allowed",
      )}
      style={{
        background: defeated
          ? "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(180,83,9,0.35))"
          : ready
          ? "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(127,29,29,0.5))"
          : "rgba(15,23,42,0.6)",
        boxShadow: defeated
          ? "0 15px 40px -10px rgba(251,191,36,0.4)"
          : ready
          ? "0 15px 40px -10px rgba(244,63,94,0.5)"
          : undefined,
      }}
    >
      {ready && !defeated && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            background: "radial-gradient(circle at 30% 50%, rgba(244,63,94,0.5), transparent 60%)",
          }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <div
          className="h-16 w-16 md:h-20 md:w-20 rounded-2xl grid place-items-center shrink-0"
          style={{
            background: defeated
              ? "linear-gradient(135deg,#f59e0b,#b45309)"
              : ready
              ? "linear-gradient(135deg,#ef4444,#7f1d1d)"
              : "linear-gradient(135deg,#475569,#1e293b)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.55), 0 0 30px rgba(0,0,0,0.4)",
            border: "3px solid rgba(255,255,255,0.35)",
          }}
        >
          {defeated ? <Crown className="h-9 w-9 text-amber-100 drop-shadow" />
            : ready ? <Skull className="h-9 w-9 text-rose-100 drop-shadow" />
            : <Lock className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300 font-orbitron font-bold">
            Chapter Final Challenge
          </div>
          <div className="font-extrabold font-orbitron text-xl md:text-2xl text-amber-50">
            {defeated ? "BOSS DEFEATED" : ready ? "BOSS BATTLE" : "SEALED BOSS ROOM"}
          </div>
          <div className="text-xs text-muted-foreground">
            {defeated
              ? `Cleared · +${xp} XP · +${coins} coins`
              : ready
              ? `Reward: +${xp} XP · +${coins} coins`
              : `Clear all ${totalQuests} Quests to break the seal`}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
              <Sparkles className="h-3 w-3" /> +{xp} XP
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-bold">
              <Coins className="h-3 w-3" /> +{coins}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
