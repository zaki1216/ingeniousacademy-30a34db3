import { forwardRef } from "react";

import type { LegacyCertificate, LegacySettings } from "@/lib/legacy/config";

/**
 * Digital graduation certificate. Rendered as plain DOM so it prints and
 * exports to PDF (browser "Save as PDF") with crisp text at any size.
 */
export const Certificate = forwardRef<
  HTMLDivElement,
  { certificate: LegacyCertificate; settings: LegacySettings }
>(function Certificate({ certificate: c, settings }, ref) {
  const issued = new Date(c.issued_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      ref={ref}
      className="certificate-sheet relative mx-auto w-full max-w-3xl aspect-[1.414/1] overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(140deg,#fdf8ec 0%,#f7edd7 45%,#fbf4e4 100%)",
        color: "#3b2a12",
        boxShadow: "0 24px 60px -24px rgba(0,0,0,0.7)",
      }}
    >
      {/* Ornamental borders */}
      <div className="absolute inset-3 sm:inset-4 rounded-xl border-[3px] border-[#b08328]" />
      <div className="absolute inset-5 sm:inset-6 rounded-lg border border-[#c8a44f]" />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,#8a6a1f 0 1px,transparent 1px 14px)",
        }}
      />

      <div className="relative h-full flex flex-col items-center justify-between px-[6%] py-[5%] text-center">
        <div>
          <div className="text-[clamp(8px,1.1vw,12px)] font-orbitron tracking-[0.5em] uppercase text-[#8a6a1f]">
            {settings.seal_text}
          </div>
          <div className="mt-1 text-[clamp(16px,3vw,32px)] font-extrabold tracking-tight">
            Certificate of Graduation
          </div>
          <div className="mx-auto mt-2 h-px w-24 bg-[#b08328]" />
        </div>

        <div className="space-y-1">
          <div className="text-[clamp(9px,1.2vw,13px)] uppercase tracking-[0.3em] text-[#8a6a1f]">
            This is to certify that
          </div>
          <div className="text-[clamp(18px,3.4vw,38px)] font-extrabold leading-tight">
            {c.student_name}
          </div>
          {c.username && (
            <div className="text-[clamp(9px,1.2vw,13px)] font-orbitron text-[#8a6a1f]">
              @{c.username}
            </div>
          )}
          <div className="text-[clamp(9px,1.3vw,14px)] max-w-xl mx-auto leading-relaxed pt-1">
            has successfully graduated from{" "}
            <span className="font-extrabold">{c.subject_name}</span>
            {c.standard_name ? ` (${c.standard_name})` : ""} at Ingenious Academy.
          </div>
          <div className="text-[clamp(8px,1.05vw,12px)] italic text-[#6a5220] max-w-xl mx-auto">
            {settings.certificate_note}
          </div>
        </div>

        <div className="w-full flex items-end justify-between gap-3 text-left">
          <div className="min-w-0">
            <div className="text-[clamp(8px,1vw,11px)] uppercase tracking-[0.25em] text-[#8a6a1f]">
              Date
            </div>
            <div className="text-[clamp(9px,1.2vw,13px)] font-bold">{issued}</div>
            {c.rank_name && (
              <div className="text-[clamp(8px,1vw,11px)] text-[#6a5220]">
                Academy Rank: {c.rank_name}
              </div>
            )}
          </div>

          <div
            className="shrink-0 grid place-items-center rounded-full border-[3px] border-[#b08328] text-center"
            style={{ width: "clamp(52px,9vw,96px)", height: "clamp(52px,9vw,96px)" }}
          >
            <div>
              <div className="text-[clamp(14px,2.4vw,26px)] leading-none">🎓</div>
              <div className="text-[clamp(6px,0.75vw,9px)] font-orbitron tracking-[0.2em] uppercase text-[#8a6a1f]">
                Seal
              </div>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div
              className="text-[clamp(11px,1.8vw,20px)] leading-none"
              style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}
            >
              {settings.headmaster_signature}
            </div>
            <div className="mt-1 h-px w-28 ml-auto bg-[#b08328]" />
            <div className="text-[clamp(8px,1vw,11px)] uppercase tracking-[0.25em] text-[#8a6a1f]">
              {settings.headmaster_name}
            </div>
            <div className="text-[clamp(7px,0.9vw,10px)] text-[#6a5220]">Serial {c.serial}</div>
          </div>
        </div>
      </div>
    </div>
  );
});
