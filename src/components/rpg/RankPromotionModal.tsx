import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth/AuthContext";
import { getGamificationDashboard } from "@/lib/api/gamification.functions";
import { listAcademyRanks } from "@/lib/api/ranks.functions";
import { rankFromXp } from "@/lib/rpg/academyRanks";
import { getIcon } from "@/lib/gamification/icons";

/**
 * Watches the current student's Academy Rank and, when it changes upward,
 * plays a lightweight promotion animation. Non-blocking and dismissable.
 */
export function RankPromotionModal() {
  const { user, role } = useAuth();
  const getDash = useServerFn(getGamificationDashboard);
  const listRanks = useServerFn(listAcademyRanks);

  const dash = useQuery({
    queryKey: ["gam-dashboard", user?.id],
    enabled: !!user?.id && role === "student",
    queryFn: () => getDash(),
    staleTime: 30_000,
  });
  const ranksQ = useQuery({
    queryKey: ["academy-ranks"],
    enabled: !!user?.id && role === "student",
    queryFn: () => listRanks(),
    staleTime: 5 * 60_000,
  });

  const [promotedCode, setPromotedCode] = useState<string | null>(null);
  const ranks = ranksQ.data ?? [];
  const xp = dash.data?.stats?.xp ?? 0;
  const current = rankFromXp(xp, ranks);

  useEffect(() => {
    if (!user?.id || !current) return;
    const key = `academyRank:${user.id}`;
    const prev = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (prev === null) {
      // First observation — remember silently, no promotion popup.
      try { localStorage.setItem(key, current.code); } catch {/* ignore */}
      return;
    }
    if (prev !== current.code) {
      // Only celebrate if new rank has HIGHER xp_required than the old one.
      const prevRank = ranks.find((r) => r.code === prev);
      if (!prevRank || current.xp_required > prevRank.xp_required) {
        setPromotedCode(current.code);
      }
      try { localStorage.setItem(key, current.code); } catch {/* ignore */}
    }
  }, [user?.id, current?.code, current, ranks]);

  const promoted = promotedCode ? ranks.find((r) => r.code === promotedCode) ?? null : null;
  const Icon = promoted ? getIcon(promoted.icon) : null;

  return (
    <AnimatePresence>
      {promoted && (
        <motion.div
          key="rank-promo"
          className="fixed inset-0 z-[120] grid place-items-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-label="New Academy Rank"
          onClick={() => setPromotedCode(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            className="relative rune-border holo-card p-6 sm:p-8 max-w-md w-[92%] text-center"
            initial={{ scale: 0.6, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            style={{ boxShadow: `0 0 80px -10px ${promoted.color}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] font-orbitron uppercase tracking-[0.4em]" style={{ color: promoted.color }}>
              <Sparkles className="inline h-3 w-3 mr-1" /> Promotion
            </div>
            <div className="text-sm mt-1 text-muted-foreground">You've reached a new Academy Rank!</div>
            <motion.div
              className="mx-auto mt-5 h-24 w-24 rounded-3xl grid place-items-center text-white"
              style={{
                background: promoted.gradient,
                boxShadow: `0 0 40px ${promoted.color}`,
              }}
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
            >
              {Icon && <Icon className="h-12 w-12" />}
            </motion.div>
            <div className="mt-4 text-2xl font-extrabold font-orbitron" style={{ color: promoted.color }}>
              {promoted.name}
            </div>
            {promoted.message && (
              <p className="mt-2 text-sm text-muted-foreground">{promoted.message}</p>
            )}
            <button
              onClick={() => setPromotedCode(null)}
              className="mt-6 rune-border holo-card px-5 py-2 text-sm font-bold hover:monarch-glow transition"
            >
              Continue Journey
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
