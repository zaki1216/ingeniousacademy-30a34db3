import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, ScrollText, Trophy } from "lucide-react";

import { CertificateCard, CertificatesEmpty } from "@/components/legacy/CertificateCard";
import { GraduationCeremony } from "@/components/legacy/GraduationCeremony";
import { HallOfFame } from "@/components/legacy/HallOfFame";
import { LegacyTimeline } from "@/components/legacy/LegacyTimeline";
import { TitleGallery } from "@/components/legacy/TitleGallery";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeroProfile } from "@/lib/hero/useHeroProfile";
import { useEquipTitle, useLegacy } from "@/lib/legacy/useLegacy";

export const Route = createFileRoute("/app/legacy")({
  head: () => ({
    meta: [
      { title: "Academy Legacy — Your Permanent Record | Ingenious Academy" },
      {
        name: "description",
        content:
          "Every graduation, title, trophy and milestone you have earned at Ingenious Academy, preserved forever in your Academy Legacy.",
      },
      { property: "og:title", content: "Academy Legacy — Your Permanent Record" },
      {
        property: "og:description",
        content: "Graduation certificates, Academy Titles and your Hall of Fame in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegacyPage,
});

function LegacyPage() {
  const { data, isLoading } = useLegacy();
  const hero = useHeroProfile();
  const equip = useEquipTitle();
  const [ceremony, setCeremony] = useState<string | null>(null);

  // Play the graduation ceremony once for a freshly recorded graduation.
  useEffect(() => {
    if (!data?.settings.ceremony_enabled) return;
    const fresh = (data.fresh ?? []).find((c) => c.startsWith("graduation_"));
    if (!fresh) return;
    const key = `legacy:ceremony:${fresh}`;
    if (typeof window === "undefined" || localStorage.getItem(key)) return;
    const cert = data.certificates[0];
    setCeremony(cert?.subject_name ?? "your subject");
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }, [data]);

  if (isLoading || !data) {
    return <div className="h-72 rounded-2xl border border-white/10 bg-black/40 animate-pulse" />;
  }

  const s = data.summary;
  const equippedTitle = data.titles.find((t) => t.equipped)?.name ?? null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 flex-wrap">
        <div className="h-11 w-11 rounded-2xl grid place-items-center bg-white/5 border border-white/10 text-2xl">
          📜
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight">Academy Legacy</h1>
          <p className="text-xs text-muted-foreground">
            Your permanent record — nothing here can ever be lost.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { icon: "🎓", label: "Graduations", value: s.graduations },
          { icon: "🎖️", label: "Titles", value: s.titles },
          { icon: "🏰", label: "Dungeons", value: s.dungeons },
          { icon: "🏅", label: "Promotions", value: s.promotions },
        ].map((k) => (
          <div key={k.label} className="rune-border holo-card p-3 text-center">
            <div className="text-xl leading-none">{k.icon}</div>
            <div className="mt-1 text-lg font-extrabold font-orbitron">{k.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="timeline">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="timeline" className="text-xs">
            <ScrollText className="h-3.5 w-3.5 mr-1" /> Story
          </TabsTrigger>
          <TabsTrigger value="certificates" className="text-xs">
            <Award className="h-3.5 w-3.5 mr-1" /> Certificates
          </TabsTrigger>
          <TabsTrigger value="titles" className="text-xs">
            🎖️ <span className="ml-1">Titles</span>
          </TabsTrigger>
          <TabsTrigger value="hall" className="text-xs">
            <Trophy className="h-3.5 w-3.5 mr-1" /> Hall
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-3">
          <LegacyTimeline events={data.events} />
        </TabsContent>

        <TabsContent value="certificates" className="mt-3 space-y-2">
          {data.certificates.length === 0 ? (
            <CertificatesEmpty />
          ) : (
            data.certificates.map((c, i) => (
              <CertificateCard key={c.id} certificate={c} index={i} />
            ))
          )}
        </TabsContent>

        <TabsContent value="titles" className="mt-3">
          <TitleGallery
            titles={data.titles}
            busy={equip.isPending}
            onEquip={(code) => equip.mutate({ code })}
          />
        </TabsContent>

        <TabsContent value="hall" className="mt-3">
          <HallOfFame entries={data.hall} categories={data.settings.hall_categories} />
        </TabsContent>
      </Tabs>

      <div className="text-[11px] text-muted-foreground">
        Your Legacy is recognition only — it never changes XP, Coins or what you can learn next.{" "}
        <Link to="/app/profile" className="story-link">
          View Hero Profile
        </Link>
      </div>

      {ceremony && (
        <GraduationCeremony
          subject={ceremony}
          avatar={hero.data?.identity.avatar ?? "🧑‍🎓"}
          studentName={hero.data?.identity.name ?? "Cadet"}
          title={equippedTitle}
          onClose={() => setCeremony(null)}
        />
      )}
    </div>
  );
}
