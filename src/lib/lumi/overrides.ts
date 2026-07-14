// Local-only override layer for Lumi dialogue.
// The Headmaster (admin) can override any Lumi entry's summary or body
// through the Lumi Manager. Overrides persist to localStorage — no
// database changes required. Consumers should call `applyLumiOverrides`
// on any entry before rendering.

import type { LumiEntry } from "./knowledge";

const OVERRIDE_KEY = "lumi.overrides.v1";

export type LumiOverride = {
  summary?: string;
  body?: string[];
};

export type LumiOverrideMap = Record<string, LumiOverride>;

export function readLumiOverrides(): LumiOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}") as LumiOverrideMap;
  } catch {
    return {};
  }
}

export function writeLumiOverrides(next: LumiOverrideMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
}

export function setLumiOverride(id: string, override: LumiOverride | null) {
  const next = readLumiOverrides();
  if (!override || (!override.summary && (!override.body || override.body.length === 0))) {
    delete next[id];
  } else {
    next[id] = override;
  }
  writeLumiOverrides(next);
}

export function applyLumiOverride(entry: LumiEntry, overrides?: LumiOverrideMap): LumiEntry {
  const map = overrides ?? readLumiOverrides();
  const o = map[entry.id];
  if (!o) return entry;
  return {
    ...entry,
    summary: o.summary ?? entry.summary,
    body: o.body && o.body.length ? o.body : entry.body,
  };
}

export function applyLumiOverrides(entries: LumiEntry[]): LumiEntry[] {
  const map = readLumiOverrides();
  return entries.map((e) => applyLumiOverride(e, map));
}
