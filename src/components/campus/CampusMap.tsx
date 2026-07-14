import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Building = {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  kind: "subject" | "route";
  match?: string[]; // subject name keywords, if kind="subject"
  to?: string; // route target if kind="route"
  x: number;
  y: number;
  gradient: string;
  glow: string;
};

const BUILDINGS: Building[] = [
  {
    id: "math",
    name: "Mathematics Building",
    tag: "Numeric Halls",
    emoji: "🏫",
    kind: "subject",
    match: ["math"],
    x: 18,
    y: 28,
    gradient: "linear-gradient(135deg,#2563eb,#38bdf8)",
    glow: "rgba(56,189,248,0.55)",
  },
  {
    id: "science",
    name: "Science Laboratory",
    tag: "Alchemy Wing",
    emoji: "🧪",
    kind: "subject",
    match: ["science", "physics", "chem", "bio"],
    x: 46,
    y: 22,
    gradient: "linear-gradient(135deg,#059669,#34d399)",
    glow: "rgba(52,211,153,0.55)",
  },
  {
    id: "library",
    name: "Language Library",
    tag: "Scriptorium",
    emoji: "📚",
    kind: "subject",
    match: ["english", "hindi", "language", "lang", "urdu", "sanskrit"],
    x: 74,
    y: 30,
    gradient: "linear-gradient(135deg,#b45309,#fbbf24)",
    glow: "rgba(251,191,36,0.6)",
  },
  {
    id: "worlds",
    name: "World Atlas",
    tag: "All Subjects",
    emoji: "🗺️",
    kind: "route",
    to: "/app/journey",
    x: 50,
    y: 38,
    gradient: "linear-gradient(135deg,#0f766e,#22d3ee)",
    glow: "rgba(34,211,238,0.5)",
  },
  {
    id: "arena",
    name: "Arena Coliseum",
    tag: "Duelists' Ring",
    emoji: "⚔️",
    kind: "route",
    to: "/app/pvp",
    x: 22,
    y: 58,
    gradient: "linear-gradient(135deg,#b91c1c,#f97316)",
    glow: "rgba(249,115,22,0.6)",
  },
  {
    id: "shop",
    name: "Merchant Shop",
    tag: "Bazaar",
    emoji: "🛒",
    kind: "route",
    to: "/app/shop",
    x: 50,
    y: 52,
    gradient: "linear-gradient(135deg,#7c3aed,#c084fc)",
    glow: "rgba(192,132,252,0.6)",
  },
  {
    id: "hall",
    name: "Hall of Fame",
    tag: "Champions",
    emoji: "🏆",
    kind: "route",
    to: "/app/leaderboard",
    x: 78,
    y: 58,
    gradient: "linear-gradient(135deg,#d97706,#fcd34d)",
    glow: "rgba(252,211,77,0.65)",
  },
  {
    id: "residence",
    name: "Residence",
    tag: "Your Quarters",
    emoji: "🏠",
    kind: "route",
    to: "/app/profile",
    x: 50,
    y: 82,
    gradient: "linear-gradient(135deg,#0ea5e9,#a78bfa)",
    glow: "rgba(167,139,250,0.55)",
  },
];

const GATE = { x: 50, y: 96 };

export function CampusMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [target, setTarget] = useState<Building | null>(null);

  const profile = useQuery({
    queryKey: ["campus-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("name, equipped_avatar, standard_id")
          .eq("id", user!.id)
          .maybeSingle()
      ).data,
    staleTime: 60_000,
  });

  const standardId = profile.data?.standard_id;

  const subjects = useQuery({
    queryKey: ["campus-subjects", standardId],
    enabled: !!standardId,
    queryFn: async () =>
      (await supabase.from("subjects").select("id, subject_name").eq("standard_id", standardId!)).data ?? [],
    staleTime: 60_000,
  });

  const subjectMap = useMemo(() => {
    const list = subjects.data ?? [];
    return (b: Building): string | null => {
      if (b.kind !== "subject" || !b.match) return null;
      const found = list.find((s) =>
        b.match!.some((kw) => (s.subject_name ?? "").toLowerCase().includes(kw)),
      );
      return found?.id ?? null;
    };
  }, [subjects.data]);

  const avatar = (profile.data?.equipped_avatar as string | null) || "🧑‍🎓";

  function resolveTarget(b: Building): string {
    if (b.kind === "route") return b.to!;
    const sid = subjectMap(b);
    if (sid) return `/app/journey/${sid}`;
    return "/app/journey";
  }

  function handleEnter(b: Building) {
    if (target) return;
    setTarget(b);
    setTimeout(() => {
      navigate({ to: resolveTarget(b) as any });
    }, 850);
  }

  const walkTo = target ?? { x: GATE.x, y: GATE.y };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
      <div
        className="relative"
        style={{
          aspectRatio: "16 / 10",
          minHeight: 460,
          background:
            "linear-gradient(180deg,#1e1b4b 0%,#312e81 35%,#4c1d95 60%,#7c2d12 100%)",
        }}
      >
        {/* Stars */}
        {Array.from({ length: 40 }).map((_, i) => {
          const left = (i * 53) % 100;
          const top = (i * 29) % 45;
          const size = 1 + ((i * 7) % 3);
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                opacity: 0.5 + ((i * 13) % 5) / 10,
                animationDelay: `${(i * 0.2) % 3}s`,
              }}
            />
          );
        })}

        {/* Mountains */}
        <svg
          className="absolute bottom-[42%] left-0 right-0 w-full"
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
          style={{ height: "22%" }}
        >
          <path
            d="M0,180 L120,80 L220,140 L340,50 L460,130 L560,70 L700,150 L820,60 L940,120 L1000,90 L1000,200 L0,200 Z"
            fill="url(#mountains)"
            opacity="0.75"
          />
          <defs>
            <linearGradient id="mountains" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>

        {/* Grass */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "58%",
            background:
              "linear-gradient(180deg, #14532d 0%, #166534 35%, #052e16 100%)",
          }}
        />

        {/* Pathways */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M50,96 C50,85 30,80 22,68 C18,60 30,55 50,52 C70,50 82,60 78,68 C72,80 50,85 50,96"
            fill="none"
            stroke="rgba(251,191,36,0.25)"
            strokeWidth="0.8"
            strokeDasharray="1.5 1"
          />
          <path
            d="M50,96 L50,38"
            stroke="rgba(251,191,36,0.2)"
            strokeWidth="0.6"
            strokeDasharray="1 1"
            fill="none"
          />
        </svg>

        {/* Trees / lanterns */}
        {[
          { x: 8, y: 78, e: "🌲" },
          { x: 92, y: 76, e: "🌲" },
          { x: 4, y: 90, e: "🌳" },
          { x: 95, y: 90, e: "🌳" },
          { x: 36, y: 40, e: "🏮" },
          { x: 64, y: 40, e: "🏮" },
          { x: 12, y: 48, e: "🌲" },
          { x: 88, y: 48, e: "🌲" },
        ].map((t, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl md:text-3xl select-none pointer-events-none"
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              transform: "translate(-50%, -50%)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {t.e}
          </motion.span>
        ))}

        {/* Particles */}
        {Array.from({ length: 22 }).map((_, i) => {
          const left = (i * 43) % 100;
          const dur = 5 + ((i * 3) % 6);
          return (
            <motion.span
              key={`p-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-200/80 pointer-events-none"
              style={{
                left: `${left}%`,
                boxShadow: "0 0 8px rgba(253,224,71,0.9)",
              }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "-10%", opacity: [0, 1, 1, 0] }}
              transition={{
                duration: dur,
                delay: (i * 0.4) % 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}

        {/* Buildings */}
        {BUILDINGS.map((b, i) => (
          <BuildingCard
            key={b.id}
            b={b}
            index={i}
            disabled={!!target}
            onEnter={() => handleEnter(b)}
          />
        ))}

        {/* Gate banner */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${GATE.x}%`,
            top: `${GATE.y - 8}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="px-3 py-1 rounded-lg text-[10px] md:text-xs font-orbitron font-black tracking-[0.25em] text-amber-100"
            style={{
              background:
                "linear-gradient(135deg,rgba(120,53,15,0.9),rgba(180,83,9,0.9))",
              boxShadow: "0 0 20px rgba(251,191,36,0.4)",
              border: "1px solid rgba(251,191,36,0.5)",
            }}
          >
            ACADEMY GATE
          </div>
        </div>

        {/* Avatar */}
        <motion.div
          className="absolute z-20 pointer-events-none"
          initial={false}
          animate={{
            left: `${walkTo.x}%`,
            top: `${walkTo.y}%`,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="relative"
          >
            <div
              className="h-12 w-12 md:h-14 md:w-14 rounded-full grid place-items-center text-2xl md:text-3xl"
              style={{
                background: "linear-gradient(135deg,#a78bfa,#ec4899)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.5), 0 0 25px rgba(167,139,250,0.6)",
                border: "2px solid rgba(255,255,255,0.6)",
              }}
            >
              {avatar}
            </div>
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-8 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,0,0,0.55), transparent 70%)",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Overlay */}
        <AnimatePresence>
          {target && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur text-xs md:text-sm font-bold text-amber-100 border border-amber-300/40"
            >
              Traveling to {target.name}…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BuildingCard({
  b,
  index,
  disabled,
  onEnter,
}: {
  b: Building;
  index: number;
  disabled: boolean;
  onEnter: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onEnter}
      disabled={disabled}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.5 }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.94 }}
      className="absolute z-10 group focus:outline-none"
      style={{
        left: `${b.x}%`,
        top: `${b.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="relative h-16 w-16 md:h-20 md:w-20 rounded-2xl grid place-items-center text-3xl md:text-4xl transition-shadow"
          style={{
            background: b.gradient,
            boxShadow: `0 10px 25px rgba(0,0,0,0.55), 0 0 30px ${b.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
            border: "2px solid rgba(255,255,255,0.25)",
          }}
        >
          <span style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))" }}>
            {b.emoji}
          </span>
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              boxShadow: `0 0 40px ${b.glow}, inset 0 0 20px rgba(255,255,255,0.25)`,
            }}
          />
        </div>
        <div
          className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-orbitron font-black tracking-widest text-white whitespace-nowrap"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {b.name.toUpperCase()}
        </div>
        <div className="text-[9px] md:text-[10px] text-amber-100/70 tracking-wide whitespace-nowrap">
          {b.tag}
        </div>
      </div>
    </motion.button>
  );
}
