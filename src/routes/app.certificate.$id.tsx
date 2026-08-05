import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Printer } from "lucide-react";

import { Certificate } from "@/components/legacy/Certificate";
import { Button } from "@/components/ui/button";
import { getMyCertificate } from "@/lib/api/legacy.functions";

export const Route = createFileRoute("/app/certificate/$id")({
  head: () => ({
    meta: [
      { title: "Graduation Certificate | Ingenious Academy" },
      {
        name: "description",
        content:
          "View, print or save your official Ingenious Academy graduation certificate for a completed subject.",
      },
      { property: "og:title", content: "Graduation Certificate — Ingenious Academy" },
      {
        property: "og:description",
        content: "An official Academy certificate recording a completed subject.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getMyCertificate);
  const sheetRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["certificate", id],
    queryFn: () => fn({ data: { id } }),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) {
    return <div className="h-72 rounded-2xl border border-white/10 bg-black/40 animate-pulse" />;
  }

  if (q.isError || !q.data) {
    return (
      <div className="rune-border holo-card p-5 text-center space-y-3">
        <div className="text-3xl">🎓</div>
        <p className="text-sm text-muted-foreground">
          This certificate could not be found in your Academy Legacy.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/legacy">Back to Legacy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 flex-wrap print:hidden">
        <Button asChild size="sm" variant="outline">
          <Link to="/app/legacy">
            <ArrowLeft className="h-4 w-4 mr-1" /> Legacy
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold leading-tight truncate">
            {q.data.certificate.subject_name} Certificate
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Serial {q.data.certificate.serial}
          </p>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print / Save PDF
        </Button>
      </header>

      <Certificate ref={sheetRef} certificate={q.data.certificate} settings={q.data.settings} />

      <p className="text-[11px] text-muted-foreground print:hidden">
        Use “Save as PDF” in the print dialog to keep a copy or share it with your guardians.
      </p>
    </div>
  );
}
