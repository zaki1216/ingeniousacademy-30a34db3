import { createFileRoute } from "@tanstack/react-router";
import { BuildingEngine } from "@/components/building/BuildingEngine";

export const Route = createFileRoute("/app/building/library")({
  component: () => <BuildingEngine buildingId="library" />,
  head: () => ({
    meta: [
      { title: "Language Library — Ingenious Academy" },
      { name: "description", content: "Enter the Scriptorium of Ingenious Academy. Choose your language hall." },
    ],
  }),
});
