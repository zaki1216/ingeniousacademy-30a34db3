import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankByTier, type RankTier, type RankInfo } from "@/lib/rpg/ranks";

type Props = {
  tier?: RankTier;
  rank?: RankInfo;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function RankBadge({ tier, rank, size = "md", showLabel = false, className }: Props) {
  const r = rank ?? (tier ? rankByTier(tier) : rankByTier("E"));
  const sizes = {
    sm: "h-7 w-7 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };
  const isMonarch = r.tier === "MONARCH";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative rounded-xl font-orbitron font-black grid place-items-center text-white shrink-0",
          sizes[size],
        )}
        style={{
          background: r.gradient,
          boxShadow: `0 0 18px -2px ${r.glow}, inset 0 0 0 1px rgba(255,255,255,0.18)`,
        }}
      >
        {isMonarch ? <Crown className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} /> : r.shortLabel}
        {(r.tier === "S" || r.tier === "NATIONAL" || r.tier === "MONARCH") && (
          <span className="pointer-events-none absolute inset-0 rounded-xl animate-pulse-glow" />
        )}
      </div>
      {showLabel && (
        <div className="leading-tight min-w-0">
          <div className="text-xs font-extrabold font-orbitron tracking-wider truncate" style={{ color: r.color }}>
            {r.label.toUpperCase()}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{r.description}</div>
        </div>
      )}
    </div>
  );
}
