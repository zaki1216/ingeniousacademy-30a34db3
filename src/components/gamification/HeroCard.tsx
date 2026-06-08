import { motion } from "framer-motion";
import { Coins, Flame, Zap } from "lucide-react";
import { levelProgress } from "@/lib/gamification/leveling";

type Props = {
  name: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  avatar?: string | null;
  frame?: string | null;
  title?: string | null;
};

export function HeroCard({ name, xp, level, coins, streak, avatar, frame, title }: Props) {
  const p = levelProgress(xp);
  const avatarEmoji = avatar || "🧑‍🎓";
  const heroTitle = title || "Hero";
  const frameStyle = frame
    ? frame.includes("gradient")
      ? { background: frame }
      : { background: frame }
    : { background: "linear-gradient(135deg,#2563EB,#7C3AED)" };

  return (
    <div className="relative overflow-hidden rounded-3xl glass-card p-5">
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_70%_-10%,#7C3AED_0%,transparent_55%),radial-gradient(circle_at_-10%_120%,#2563EB_0%,transparent_50%)]" />
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="h-20 w-20 rounded-2xl p-[3px] glow-primary"
            style={frameStyle}
          >
            <div className="h-full w-full rounded-[14px] bg-card flex items-center justify-center text-4xl">
              {avatarEmoji}
            </div>
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-[image:var(--gradient-gold)] text-amber-950 text-xs font-extrabold flex items-center justify-center ring-2 ring-card shadow-md">
            {level}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
            {heroTitle}
          </div>
          <div className="text-xl font-extrabold leading-tight truncate">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary-glow" />
            {xp.toLocaleString()} XP · Level {level}
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5 font-semibold">
          <span>Adventure Progress</span>
          <span>{p.xpIntoLevel} / {p.xpForNextLevel}</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden relative">
          <motion.div
            className="h-full bg-[image:var(--gradient-primary)] relative"
            initial={{ width: 0 }}
            animate={{ width: `${p.progressPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
          </motion.div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Pill icon={<Coins className="h-4 w-4 text-amber-300" />} value={coins.toLocaleString()} label="Coins" />
        <Pill icon={<Flame className="h-4 w-4 text-orange-400" />} value={`${streak}d`} label="Streak" />
      </div>
    </div>
  );
}

function Pill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <div className="font-extrabold leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
