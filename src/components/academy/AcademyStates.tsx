import { motion, useReducedMotion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared Academy-themed state primitives (loading / empty / error) so every
 * student screen speaks the same visual language. Presentation only.
 */

/** A rune-styled shimmering block used to reserve layout while data loads. */
export function AcademySkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5",
        className,
      )}
    >
      <div className="absolute inset-0 opacity-40 animate-shimmer-sweep bg-gradient-to-r from-transparent via-white/12 to-transparent" />
    </div>
  );
}

/** Full-page themed loader that mirrors the usual header + content rhythm. */
export function AcademyPageSkeleton({ label = "Opening the Academy…" }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-3">
        <AcademySkeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 min-w-0 space-y-2">
          <AcademySkeleton className="h-4 w-40 rounded-lg" />
          <AcademySkeleton className="h-3 w-56 max-w-full rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <AcademySkeleton key={i} className="h-20" />
        ))}
      </div>
      <AcademySkeleton className="h-56" />
    </div>
  );
}

/** Friendly Academy-flavoured empty state. */
export function AcademyEmpty({
  icon = "✨",
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rune-border holo-card px-5 py-8 text-center flex flex-col items-center gap-2",
        className,
      )}
    >
      <div className="text-3xl leading-none" aria-hidden>
        {icon}
      </div>
      <p className="text-sm font-bold">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** Friendly Academy-flavoured error state with an optional retry. */
export function AcademyError({
  title = "The Academy couldn't load this area",
  description = "Something interrupted the connection. Please try again in a moment.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rune-border holo-card px-5 py-8 text-center flex flex-col items-center gap-2",
        className,
      )}
    >
      <div className="text-3xl leading-none" aria-hidden>
        🌫️
      </div>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Subtle route-change transition for student pages. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
