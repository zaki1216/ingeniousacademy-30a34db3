import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Award, Download } from "lucide-react";

import type { LegacyCertificate } from "@/lib/legacy/config";

/** Compact certificate tile used on the Legacy page, Hero Profile and My Academy. */
export function CertificateCard({ certificate: c, index = 0 }: { certificate: LegacyCertificate; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="rune-border holo-card p-3 flex items-center gap-3"
    >
      <div
        className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-2xl"
        style={{ background: "linear-gradient(135deg,#f59e0b,#fde68a)", color: "#3b2a12" }}
      >
        🎓
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold truncate">{c.subject_name}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          Graduated {new Date(c.issued_at).toLocaleDateString()} · {c.serial}
        </div>
      </div>
      <Link
        to="/app/certificate/$id"
        params={{ id: c.id }}
        className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 hover:bg-white/10 transition"
      >
        <Download className="h-3.5 w-3.5" /> View
      </Link>
    </motion.div>
  );
}

export function CertificatesEmpty() {
  return (
    <div className="rune-border holo-card p-4 text-sm text-muted-foreground flex items-center gap-2">
      <Award className="h-4 w-4 text-amber-300" />
      Complete every Quest in a subject to earn your first graduation certificate.
    </div>
  );
}
