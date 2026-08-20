import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  listNotifications,
  markNotificationsRead,
} from "@/lib/api/notifications.functions";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const list = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: () => list(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;

  async function openItem(n: { id: string; url: string | null; read_at: string | null }) {
    if (!n.read_at) {
      await markRead({ data: { ids: [n.id] } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
    if (n.url) navigate({ to: n.url as never });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative h-8 w-8 rounded-lg flex items-center justify-center bg-black/55 border border-white/10 backdrop-blur-xl text-amber-100/80 hover:text-amber-100 hover:border-amber-400/40"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[9px] font-black text-black grid place-items-center ring-2 ring-black/80">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0a0616]/95 backdrop-blur-2xl border-amber-400/20 text-amber-50 overflow-y-auto">
        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-lg font-black tracking-[0.2em] bg-gradient-to-b from-amber-100 to-amber-500 bg-clip-text text-transparent"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              NOTICES
            </h3>
            {unread > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
                onClick={async () => {
                  await markRead({ data: {} });
                  qc.invalidateQueries({ queryKey: ["notifications"] });
                }}
              >
                Mark all read
              </Button>
            )}
          </div>

          {items.length === 0 && (
            <p className="text-sm text-amber-200/60">No notices yet. New lectures, notes and Academy news will appear here.</p>
          )}

          <div className="space-y-2">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition ${
                  n.read_at
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/15"
                }`}
              >
                <div className="text-sm font-bold text-amber-50">{n.title}</div>
                <div className="text-xs text-amber-200/70 whitespace-pre-line mt-0.5">{n.body}</div>
                <div className="text-[10px] text-amber-200/40 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
