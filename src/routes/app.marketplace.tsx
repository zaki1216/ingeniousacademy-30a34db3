import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

const MarketplaceStreet = lazy(() =>
  import("@/components/marketplace/MarketplaceStreet").then((m) => ({
    default: m.MarketplaceStreet,
  })),
);

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({
    meta: [
      { title: "Academy Marketplace — Ingenious Academy" },
      {
        name: "description",
        content:
          "Spend your earned Coins on Academy Street — outfits, avatars, badges, frames and celebrations for your Hero Profile.",
      },
      { property: "og:title", content: "Academy Marketplace — Ingenious Academy" },
      {
        property: "og:description",
        content: "A living street of Academy shops where every Coin personalises your hero.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Suspense
      fallback={<div className="h-64 rounded-2xl border border-white/10 bg-black/40 animate-pulse" />}
    >
      <MarketplaceStreet />
    </Suspense>
  ),
});
