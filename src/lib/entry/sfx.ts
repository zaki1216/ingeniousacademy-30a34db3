// Placeholder SFX system. No audio is played yet — this exists so future
// audio hooks land in exactly one place.
export type SfxKey = "gate-open" | "click" | "chime" | "success" | "loading";

export function playSfx(_key: SfxKey): void {
  // no-op for now
}
