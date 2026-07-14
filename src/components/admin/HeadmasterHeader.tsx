import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  tagline: string;
  lumi?: string;
  actions?: ReactNode;
};

export function HeadmasterHeader({ icon, title, tagline, lumi, actions }: Props) {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-background to-background">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(251,191,36,0.25), transparent 60%), radial-gradient(ellipse at bottom, rgba(120,53,15,0.2), transparent 60%)",
          }}
        />
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-300/70"
            style={{ left: `${(i * 41) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -12, 0], opacity: [0.2, 0.85, 0.2] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <div className="relative p-5 md:p-6 flex items-start gap-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-14 w-14 shrink-0 rounded-2xl grid place-items-center bg-gradient-to-br from-amber-400 to-amber-700 shadow-[0_0_30px_-4px_rgba(251,191,36,0.6)] text-amber-950"
          >
            {icon}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-black font-orbitron tracking-wider bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="mt-1 text-sm text-amber-200/70 italic">{tagline}</p>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
      {lumi && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-100/80 italic leading-relaxed">
            <span className="font-orbitron uppercase tracking-wider text-amber-300 not-italic mr-1">
              Lumi:
            </span>
            {lumi}
          </p>
        </div>
      )}
    </div>
  );
}
