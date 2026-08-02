import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Section shell used across the Hero Profile.
 * On mobile the body collapses (expandable sections); from `sm` up it is
 * always open so tablet/desktop keep the full RPG layout.
 */
export function HeroSection({
  eyebrow,
  title,
  action,
  children,
  defaultOpen = true,
  className,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("relative", className)}>
      <div className="mb-3 px-1 flex items-end justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-left min-w-0 group sm:cursor-default"
          aria-expanded={open}
        >
          <div className="text-[10px] font-orbitron uppercase tracking-[0.28em] text-[var(--rune)]">
            {eyebrow}
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-1.5">
            {title}
            <ChevronDown
              className={cn(
                "h-4 w-4 sm:hidden transition-transform text-muted-foreground",
                open && "rotate-180",
              )}
            />
          </h3>
        </button>
        {action}
      </div>

      <div className="hidden sm:block">{children}</div>
      <div className="sm:hidden">
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
