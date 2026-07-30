import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AtSign, Check, Loader2, X, AlertTriangle, Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  checkUsernameAvailability, getMyUsernameInfo, updateMyUsername,
} from "@/lib/api/students.functions";
import { daysUntilUsernameChange, validateUsername } from "@/lib/username";

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid"; reason: string };

export function UsernameSettings() {
  const qc = useQueryClient();
  const infoFn = useServerFn(getMyUsernameInfo);
  const checkFn = useServerFn(checkUsernameAvailability);
  const saveFn = useServerFn(updateMyUsername);

  const info = useQuery({ queryKey: ["my-username"], queryFn: () => infoFn() });
  const [value, setValue] = useState("");
  const [avail, setAvail] = useState<Availability>({ state: "idle" });

  const currentUsername = info.data?.username ?? "";
  const locked = Boolean(info.data?.username_locked);
  const cooldown = daysUntilUsernameChange(info.data?.username_changed_at);

  useEffect(() => { setValue(currentUsername); }, [currentUsername]);

  useEffect(() => {
    const v = value.trim();
    if (!v || v.toLowerCase() === currentUsername.toLowerCase()) return setAvail({ state: "idle" });
    const local = validateUsername(v);
    if (!local.ok) return setAvail({ state: "invalid", reason: local.reason ?? "Invalid format" });
    setAvail({ state: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await checkFn({ data: { username: v } });
        if (res.status === "available") setAvail({ state: "available" });
        else if (res.status === "taken") setAvail({ state: "taken" });
        else setAvail({ state: "invalid", reason: res.reason ?? "Invalid format" });
      } catch {
        setAvail({ state: "idle" });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value, currentUsername, checkFn]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { username: value.trim() } }),
    onSuccess: () => {
      toast.success("Username updated");
      qc.invalidateQueries({ queryKey: ["my-username"] });
      qc.invalidateQueries({ queryKey: ["profile-cosmetics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    avail.state === "available" && !locked && cooldown === 0 && !save.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><AtSign className="h-4 w-4" /> Username</CardTitle>
        <CardDescription>
          Your public name across the Academy — hero card, leaderboards and profile.
          Official records still use your full name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Choose your username</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\s+/g, ""))}
            maxLength={20}
            disabled={locked}
            placeholder="e.g. shadow_scholar.7"
          />
          <div className="text-xs min-h-[18px]">
            {avail.state === "checking" && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
              </span>
            )}
            {avail.state === "available" && (
              <span className="text-emerald-500 inline-flex items-center gap-1"><Check className="h-3 w-3" /> Available</span>
            )}
            {avail.state === "taken" && (
              <span className="text-red-500 inline-flex items-center gap-1"><X className="h-3 w-3" /> Already taken</span>
            )}
            {avail.state === "invalid" && (
              <span className="text-amber-500 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {avail.reason}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            4–20 characters · letters, numbers, underscore (_) and period (.) · no spaces
          </p>
        </div>

        {locked && (
          <p className="text-xs text-amber-500 inline-flex items-center gap-1">
            <Lock className="h-3 w-3" /> Username changes are locked by the academy. Contact your teacher.
          </p>
        )}
        {!locked && cooldown > 0 && (
          <p className="text-xs text-muted-foreground">
            You can change your username again in {cooldown} day{cooldown === 1 ? "" : "s"}.
          </p>
        )}

        <Button onClick={() => save.mutate()} disabled={!canSave}>
          {save.isPending ? "Saving…" : "Update username"}
        </Button>
      </CardContent>
    </Card>
  );
}
