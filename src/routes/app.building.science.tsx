import { createFileRoute } from "@tanstack/react-router";
import { BuildingEngine } from "@/components/building/BuildingEngine";

export const Route = createFileRoute("/app/building/science")({
  component: () => <BuildingEngine buildingId="science" />,
  head: () => ({
    meta: [
      { title: "Science Laboratory — Ingenious Academy" },
      { name: "description", content: "Enter the Alchemy Wing of Ingenious Academy. Choose your laboratory." },
    ],
  }),
});
