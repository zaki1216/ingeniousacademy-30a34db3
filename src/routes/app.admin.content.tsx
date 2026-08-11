import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy hub route — Academy Content now opens the Curriculum Explorer directly.
export const Route = createFileRoute("/app/admin/content")({
  beforeLoad: () => {
    throw redirect({ to: "/app/content" });
  },
});
