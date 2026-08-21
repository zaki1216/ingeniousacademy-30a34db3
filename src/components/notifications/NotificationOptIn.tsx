import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { enablePush, isPushEnabledHere, isPushSupported } from "@/lib/notifications/pushBrowser";

const DISMISS_KEY = "academy-push-prompt-dismissed";

export function NotificationOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isPushSupported()) return;
      if (Notification.permission !== "default") return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      if (await isPushEnabledHere()) return;
      if (!cancelled) setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  async function enable() {
    setBusy(true);
    try {
      const res = await enablePush();
      if (res.ok) {
        toast.success("Academy notifications enabled");
        setShow(false);
      } else if (res.reason === "denied") {
        toast.error("Notifications were blocked in your browser settings");
        setShow(false);
      } else if (res.reason === "not-configured") {
        toast.error("Notifications aren't available right now");
        setShow(false);
      } else {
        setShow(false);
      }
    } catch {
      toast.error("Could not enable notifications");
    } finally {
      setBusy(false);
    }
  }

  function later() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="pointer-events-auto fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,420px)] rounded-2xl border border-amber-400/30 bg-black/85 backdrop-blur-xl p-4 shadow-[0_20px_60px_-20px_rgba(251,191,36,0.5)]">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl grid place-items-center bg-amber-500/15 border border-amber-400/30">
          <BellRing className="h-4 w-4 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-amber-100">🔔 Turn on Academy Notifications</div>
          <p className="text-xs text-amber-200/70 mt-1">
            Get important updates directly on your phone:
          </p>
          <ul className="text-xs text-amber-200/60 mt-1 space-y-0.5">
            <li>• New lectures</li>
            <li>• New study material</li>
            <li>• Academy announcements</li>
            <li>• Attendance updates</li>
            <li>• Rewards and achievements</li>
          </ul>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
          onClick={enable}
          disabled={busy}
        >
          {busy ? "Enabling…" : "Enable Notifications"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
          onClick={later}
        >
          Maybe Later
        </Button>
      </div>
    </div>
  );
}
