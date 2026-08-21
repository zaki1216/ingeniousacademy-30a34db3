import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { listPushDevices, removePushDevice } from "@/lib/api/notifications.functions";
import {
  disablePush,
  enablePush,
  isPushEnabledHere,
  isPushSupported,
} from "@/lib/notifications/pushBrowser";

export function NotificationSettings() {
  const qc = useQueryClient();
  const list = useServerFn(listPushDevices);
  const removeDevice = useServerFn(removePushDevice);

  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabledHere, setEnabledHere] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    if (isPushSupported()) {
      setPermission(Notification.permission);
      void isPushEnabledHere().then(setEnabledHere);
    }
  }, []);

  const devices = useQuery({
    queryKey: ["push-devices"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const res = await enablePush();
        if (res.ok) {
          toast.success("Phone notifications on for this device");
          setEnabledHere(true);
        } else if (res.reason === "denied") {
          toast.error("Notifications are blocked in your browser settings");
        } else if (res.reason === "not-configured") {
          toast.error("Notifications aren't available right now");
        }
        setPermission(Notification.permission);
      } else {
        await disablePush();
        setEnabledHere(false);
        toast.success("Phone notifications off for this device");
      }
      qc.invalidateQueries({ queryKey: ["push-devices"] });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academy Notifications</CardTitle>
        <CardDescription>
          {supported
            ? "Get lectures, notes, attendance and Academy news on your phone."
            : "This device or browser doesn't support phone notifications — the Academy works normally without them."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Phone notifications</div>
              <div className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Blocked in browser settings — allow notifications for this site to turn them on."
                  : enabledHere
                    ? "On for this device"
                    : "Off for this device"}
              </div>
            </div>
            <Switch
              checked={enabledHere}
              disabled={busy || permission === "denied"}
              onCheckedChange={toggle}
            />
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-2">Manage devices</div>
          {(devices.data?.devices.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No devices registered yet.</p>
          ) : (
            <div className="space-y-2">
              {devices.data?.devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{d.device_label ?? "Device"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Added {new Date(d.created_at).toLocaleDateString()}
                        {d.is_active ? "" : " · inactive"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await removeDevice({ data: { id: d.id } });
                      qc.invalidateQueries({ queryKey: ["push-devices"] });
                      void isPushEnabledHere().then(setEnabledHere);
                    }}
                    aria-label="Remove device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
