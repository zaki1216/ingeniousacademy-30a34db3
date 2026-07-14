import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const SEEN_KEY = "lumi.seen.v1";

type SeenMap = Record<string, number>;

type LumiState = {
  open: boolean;
  view: "chat" | "guide";
  focusEntryId: string | null;
  activeTip: LumiTip | null;
  seen: SeenMap;
};

export type LumiTip = {
  id: string;
  title: string;
  message: string;
  cta?: { label: string; to: string };
};

type LumiCtx = {
  state: LumiState;
  openLumi: (opts?: { view?: "chat" | "guide"; entryId?: string }) => void;
  closeLumi: () => void;
  markSeen: (id: string) => void;
  hasSeen: (id: string) => boolean;
  pushTip: (tip: LumiTip) => void;
  dismissTip: () => void;
};

const Ctx = createContext<LumiCtx | null>(null);

function readSeen(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}") as SeenMap;
  } catch {
    return {};
  }
}

export function LumiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "guide">("chat");
  const [focusEntryId, setFocus] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<LumiTip | null>(null);
  const [seen, setSeen] = useState<SeenMap>({});

  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => {
    setSeen(readSeen());
  }, []);

  const persist = useCallback((next: SeenMap) => {
    setSeen(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    }
  }, []);

  const openLumi: LumiCtx["openLumi"] = useCallback((opts) => {
    setView(opts?.view ?? "chat");
    setFocus(opts?.entryId ?? null);
    setOpen(true);
  }, []);

  const closeLumi = useCallback(() => setOpen(false), []);

  const markSeen = useCallback(
    (id: string) => {
      persist({ ...readSeen(), [id]: Date.now() });
    },
    [persist],
  );

  const hasSeen = useCallback(
    (id: string) => Boolean(readSeen()[id]),
    [],
  );

  const pushTip = useCallback((tip: LumiTip) => {
    setActiveTip(tip);
  }, []);

  const dismissTip = useCallback(() => setActiveTip(null), []);

  const value = useMemo<LumiCtx>(
    () => ({
      state: { open, view, focusEntryId, activeTip, seen },
      openLumi,
      closeLumi,
      markSeen,
      hasSeen,
      pushTip,
      dismissTip,
    }),
    [open, view, focusEntryId, activeTip, seen, openLumi, closeLumi, markSeen, hasSeen, pushTip, dismissTip],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLumi(): LumiCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLumi must be used inside <LumiProvider>");
  return c;
}
