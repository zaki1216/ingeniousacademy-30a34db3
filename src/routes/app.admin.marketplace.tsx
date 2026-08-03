import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeadmasterHeader } from "@/components/admin/HeadmasterHeader";
import { useAuth } from "@/lib/auth/AuthContext";
import { adminDeleteItem, adminListItems, adminUpsertItem } from "@/lib/api/marketplace.functions";
import { SHOPS, SHOP_BY_CODE, type MarketplaceItem } from "@/lib/marketplace/config";

export const Route = createFileRoute("/app/admin/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace Manager — Academy Office" }] }),
  component: MarketplaceAdmin,
});

type FormState = {
  id?: string;
  shop_code: string;
  type: string;
  code: string;
  name: string;
  value: string;
  description: string;
  icon: string;
  price_coins: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  sort_order: number;
  enabled: boolean;
  release_at: string;
};

const emptyForm: FormState = {
  shop_code: "avatar_studio",
  type: "avatar",
  code: "",
  name: "",
  value: "",
  description: "",
  icon: "",
  price_coins: 100,
  rarity: "common",
  sort_order: 1,
  enabled: true,
  release_at: "",
};

function MarketplaceAdmin() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListItems);
  const upsertFn = useServerFn(adminUpsertItem);
  const deleteFn = useServerFn(adminDeleteItem);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [shopFilter, setShopFilter] = useState<string>("all");

  const q = useQuery({
    queryKey: ["admin-marketplace-items"],
    queryFn: () => listFn(),
    enabled: role === "admin",
  });

  const save = useMutation({
    mutationFn: (f: FormState) =>
      upsertFn({
        data: {
          ...(f.id ? { id: f.id } : {}),
          shop_code: f.shop_code,
          type: f.type,
          code: f.code.trim(),
          name: f.name.trim(),
          value: f.value.trim(),
          description: f.description.trim() || null,
          icon: f.icon.trim() || null,
          price_coins: Number(f.price_coins) || 0,
          rarity: f.rarity,
          sort_order: Number(f.sort_order) || 0,
          enabled: f.enabled,
          release_at: f.release_at ? new Date(f.release_at).toISOString() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Item saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["admin-marketplace-items"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const items = (q.data ?? []) as MarketplaceItem[];
  const filtered = useMemo(
    () => (shopFilter === "all" ? items : items.filter((i) => i.shop_code === shopFilter)),
    [items, shopFilter],
  );

  const shopTypes = SHOP_BY_CODE.get(form.shop_code)?.types ?? [];

  if (role !== "admin") {
    return <div className="p-6 text-sm text-muted-foreground">Headmaster access only.</div>;
  }

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (it: MarketplaceItem) => {
    setForm({
      id: it.id,
      shop_code: it.shop_code,
      type: it.type,
      code: it.code,
      name: it.name,
      value: it.value,
      description: it.description ?? "",
      icon: it.icon ?? "",
      price_coins: it.price_coins,
      rarity: it.rarity,
      sort_order: it.sort_order,
      enabled: it.enabled,
      release_at: it.release_at ? it.release_at.slice(0, 10) : "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <HeadmasterHeader
        icon={Store}
        title="Marketplace Manager"
        subtitle="Create, price and organise every cosmetic on Academy Street."
      />

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={shopFilter}
          onChange={(e) => setShopFilter(e.target.value)}
          className="h-9 rounded-lg bg-background border border-white/10 px-3 text-sm"
        >
          <option value="all">All shops</option>
          {SHOPS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
        <Button onClick={openNew} size="sm" className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> New item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((it) => (
          <div key={it.id} className="rune-border holo-card p-3 flex gap-3 items-start">
            <div className="h-12 w-12 shrink-0 rounded-xl grid place-items-center text-2xl bg-white/5 border border-white/10">
              {it.icon || it.value.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold truncate">{it.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {it.rarity}
                </Badge>
                {!it.enabled && (
                  <Badge variant="outline" className="text-[10px]">
                    disabled
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {SHOP_BY_CODE.get(it.shop_code)?.name ?? it.shop_code} · {it.type} ·{" "}
                {it.price_coins} coins
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remove.mutate(it.id)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!q.isLoading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No items in this shop yet.</div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit item" : "New item"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Shop</Label>
              <select
                value={form.shop_code}
                onChange={(e) => {
                  const shop = SHOP_BY_CODE.get(e.target.value);
                  setForm((f) => ({
                    ...f,
                    shop_code: e.target.value,
                    type: shop?.types[0]?.code ?? f.type,
                  }));
                }}
                className="mt-1 w-full h-9 rounded-lg bg-background border border-white/10 px-2 text-sm"
              >
                {SHOPS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Category</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg bg-background border border-white/10 px-2 text-sm"
              >
                {shopTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="mk_av_hero"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label>Value (emoji, colour or CSS gradient applied when equipped)</Label>
              <Input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="🧙 or linear-gradient(135deg,#f59e0b,#fde68a)"
              />
            </div>
            <div className="col-span-2">
              <Label>Icon / image (emoji or image URL)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>Price (coins)</Label>
              <Input
                type="number"
                value={form.price_coins}
                onChange={(e) => setForm((f) => ({ ...f, price_coins: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Rarity</Label>
              <select
                value={form.rarity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rarity: e.target.value as FormState["rarity"] }))
                }
                className="mt-1 w-full h-9 rounded-lg bg-background border border-white/10 px-2 text-sm"
              >
                {["common", "rare", "epic", "legendary"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label>Release date (optional)</Label>
              <Input
                type="date"
                value={form.release_at}
                onChange={(e) => setForm((f) => ({ ...f, release_at: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
              <span className="text-sm">Enabled (visible in the Marketplace)</span>
            </div>

            {/* Live preview */}
            <div className="col-span-2 rune-border holo-card p-3 flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-xl grid place-items-center text-2xl border border-white/10"
                style={{
                  background:
                    form.value.includes("gradient") || form.value.startsWith("#")
                      ? form.value
                      : "rgba(255,255,255,0.04)",
                }}
              >
                {form.icon || form.value || "✨"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{form.name || "Item preview"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {form.rarity} · {form.price_coins} coins
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              Save item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
