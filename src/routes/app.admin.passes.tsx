import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Ticket, Coins, ShieldCheck, ScrollText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import {
  adminListPasses,
  adminDecidePass,
  adminListPassAudit,
} from "@/lib/api/passes-admin.functions";
import { getPass } from "@/lib/rpg/passes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/passes")({
  component: AdminPassesPage,
});

function AdminPassesPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_18px_rgba(251,191,36,0.45)]">
          <Ticket className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pass Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Review student pass requests, approve or reject with reason, and inspect the audit
            trail.
          </p>
        </div>
      </header>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="recent">Recent Decisions</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PassList status="pending_approval" emptyText="No pending pass requests." />
        </TabsContent>
        <TabsContent value="recent" className="mt-4">
          <PassList status="approved" emptyText="No approved passes yet." />
          <div className="mt-4">
            <PassList status="rejected" emptyText="No rejected passes." />
          </div>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PassList({
  status,
  emptyText,
}: {
  status: "pending_approval" | "approved" | "rejected";
  emptyText: string;
}) {
  const qc = useQueryClient();
  const list = useServerFn(adminListPasses);
  const decide = useServerFn(adminDecidePass);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["admin-passes", status],
    queryFn: () => list({ data: { status, limit: 100 } }),
    staleTime: 10_000,
  });

  const mut = useMutation({
    mutationFn: (input: { passId: string; decision: "approve" | "reject"; reason?: string }) =>
      decide({ data: input }),
    onSuccess: (_res, vars) => {
      toast.success(`Pass ${vars.decision === "approve" ? "approved" : "rejected"}`);
      qc.invalidateQueries({ queryKey: ["admin-passes"] });
      qc.invalidateQueries({ queryKey: ["admin-pass-audit"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
  const passes = q.data?.passes ?? [];
  if (!passes.length)
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {passes.map((p) => {
          const def = getPass(p.pass_code);
          const pending = p.status === "pending_approval";
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${def?.tint ?? "#888"}33, ${
                      def?.tint ?? "#888"
                    }11)`,
                    border: `1px solid ${def?.tint ?? "#888"}55`,
                  }}
                >
                  {def?.emoji ?? "🎫"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{def?.name ?? p.pass_code}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {p.status.replace("_", " ")}
                    </Badge>
                    {def?.examBlocked && (
                      <Badge variant="outline" className="text-[10px] gap-1 text-rose-400">
                        <AlertCircle className="h-3 w-3" /> exam-blocked
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-foreground/85">
                    {p.student_name ?? "Unknown student"}{" "}
                    <span className="text-muted-foreground">({p.student_email ?? "—"})</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span>Requested {new Date(p.created_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3 text-amber-300" />
                      {p.cost_coins.toLocaleString()}
                    </span>
                  </div>
                  {p.notes && !pending && (
                    <div className="mt-1 text-xs italic text-muted-foreground">
                      Reason: {p.notes}
                    </div>
                  )}
                </div>
              </div>

              {pending && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Textarea
                    placeholder="Optional reason (shown to student)…"
                    value={reasons[p.id] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                    className="min-h-[40px] h-10 flex-1 bg-white/5 border-white/10"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        mut.mutate({
                          passId: p.id,
                          decision: "reject",
                          reason: reasons[p.id] || undefined,
                        })
                      }
                      disabled={mut.isPending}
                      className="gap-1 text-rose-400 hover:text-rose-300"
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        mut.mutate({
                          passId: p.id,
                          decision: "approve",
                          reason: reasons[p.id] || undefined,
                        })
                      }
                      disabled={mut.isPending}
                      className="gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function AuditLog() {
  const list = useServerFn(adminListPassAudit);
  const q = useQuery({
    queryKey: ["admin-pass-audit"],
    queryFn: () => list({ data: { limit: 100 } }),
    staleTime: 10_000,
  });

  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
  const logs = q.data?.logs ?? [];
  if (!logs.length)
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
        No audit entries yet.
      </div>
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
      {logs.map((l) => {
        const def = l.pass_code ? getPass(l.pass_code) : undefined;
        const isApprove = l.action === "approve";
        return (
          <div key={l.id} className="px-4 py-2.5 flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-lg grid place-items-center",
                isApprove ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
              )}
            >
              {isApprove ? <ShieldCheck className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{l.admin_name ?? "Admin"}</span>
                <span className="text-muted-foreground">{l.action}d</span>
                <span>{def?.emoji} {def?.name ?? l.pass_code}</span>
                <span className="text-muted-foreground">for</span>
                <span className="font-bold">{l.student_name ?? "student"}</span>
              </div>
              {l.reason && (
                <div className="text-xs italic text-muted-foreground truncate">"{l.reason}"</div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <ScrollText className="h-3 w-3" />
              {new Date(l.created_at).toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
