import { createFileRoute, redirect } from "@tanstack/react-router";

// Rank management now lives in Progress & Rewards → Ranks (single canonical location).
// Old bookmarks keep working via this redirect.
export const Route = createFileRoute("/app/admin/ranks")({
  beforeLoad: () => {
    throw redirect({ to: "/app/admin/progress" });
  },
});
