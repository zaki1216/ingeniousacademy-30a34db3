// Academy Rank helpers — config-driven, XP-thresholded.
// Ranks are stored in the `academy_ranks` table and fetched via server fn.
// This module only holds types + pure compute helpers.

export type AcademyRank = {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  xp_required: number;
  message: string | null;
  sort_order: number;
  enabled: boolean;
};

export type RankProgress = {
  current: AcademyRank | null;
  next: AcademyRank | null;
  xp: number;
  xpIntoRank: number;
  xpForNext: number;
  progressPct: number;
};

/** Return the highest-threshold enabled rank the student qualifies for. */
export function rankFromXp(xp: number, ranks: AcademyRank[]): AcademyRank | null {
  const list = ranks.filter((r) => r.enabled).sort((a, b) => a.xp_required - b.xp_required);
  if (list.length === 0) return null;
  let current = list[0];
  for (const r of list) {
    if (xp >= r.xp_required) current = r;
    else break;
  }
  return current;
}

export function rankProgress(xp: number, ranks: AcademyRank[]): RankProgress {
  const list = ranks.filter((r) => r.enabled).sort((a, b) => a.xp_required - b.xp_required);
  const current = rankFromXp(xp, list);
  const idx = current ? list.findIndex((r) => r.id === current.id) : -1;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const base = current?.xp_required ?? 0;
  const target = next?.xp_required ?? base;
  const span = Math.max(1, target - base);
  const xpIntoRank = Math.max(0, xp - base);
  const xpForNext = next ? Math.max(0, target - xp) : 0;
  const progressPct = next ? Math.min(100, Math.round((xpIntoRank / span) * 100)) : 100;
  return { current, next, xp, xpIntoRank, xpForNext, progressPct };
}
