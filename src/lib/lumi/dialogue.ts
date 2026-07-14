// Lumi's voice — canonical phrasing so tone stays consistent everywhere.
// When an AI model is wired in later, this same interface can feed prompts.

export type LumiTone = "greeting" | "encourage" | "hint" | "gentle-block" | "celebrate";

export function lumiGreeting(name?: string | null): string {
  const who = name?.trim() ? name.trim() : "Cadet";
  const lines = [
    `Ah, ${who}. The Campus feels brighter when you return.`,
    `Welcome back, ${who}. I have been keeping watch over your progress.`,
    `There you are, ${who}. Every legend rests — then continues.`,
    `The rune-lights bow to you, ${who}. Shall we continue your journey?`,
  ];
  return lines[Math.floor(Date.now() / 3_600_000) % lines.length];
}

export function lumiSay(tone: LumiTone, message: string): string {
  const prefix: Record<LumiTone, string> = {
    greeting: "",
    encourage: "",
    hint: "",
    "gentle-block": "",
    celebrate: "",
  };
  return `${prefix[tone]}${message}`;
}

// Rephrased system messages Lumi should use instead of raw errors.
export const LUMI_VOICE = {
  purchaseSuccess: "Wonderful choice. I've safely placed it inside your Inventory Chest.",
  purchaseFailNoCoins: "You are close, but not quite ready. A few more Quests will earn the coins you need.",
  accessLocked: "Only Cadets who complete the previous Quest may continue. Return, prove your mastery, and the path will open.",
  questLocked: "This path is still sealed. Let's master the previous Learning Quest first.",
  streakSafe: "Your streak is safe — a Streak Shield glimmers in your Inventory.",
  dailyClaimed: "You already accepted today's blessing. Return tomorrow for the next.",
  chestReady: "A chest is glowing in your Residence — the Academy has a gift for you.",
  bossUnlocked: "Every Quest of this Dungeon is cleared. The Boss Gate is open — approach when you are ready.",
} as const;
