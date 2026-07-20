import { createFileRoute } from "@tanstack/react-router";
import { BuildingEngine } from "@/components/building/BuildingEngine";

export const Route = createFileRoute("/app/building/math")({
  component: () => <BuildingEngine buildingId="math" />,
  head: () => ({
    meta: [
      { title: "Mathematics Building — Ingenious Academy" },
      { name: "description", content: "Enter the Mathematics Hall of Ingenious Academy. Choose your dungeon and continue your adventure." },
    ],
  }),
});
