// Lumi's structured knowledge base for Ingenious Academy.
// Add new entries here as the Academy grows — Lumi and the Guidebook
// will surface them automatically.

export type LumiCategoryId =
  | "getting-started"
  | "campus"
  | "buildings"
  | "journey"
  | "quests"
  | "quizzes"
  | "bosses"
  | "economy"
  | "progression"
  | "merchant"
  | "inventory"
  | "arena"
  | "collections"
  | "seasons"
  | "records"
  | "faq";

export type LumiEntry = {
  id: string;
  title: string;
  category: LumiCategoryId;
  summary: string;
  body: string[];
  keywords: string[];
  icon?: string;
};

export const LUMI_CATEGORIES: { id: LumiCategoryId; label: string; icon: string; blurb: string }[] = [
  { id: "getting-started", label: "Getting Started", icon: "✨", blurb: "Your first steps inside Ingenious Academy." },
  { id: "campus",          label: "Academy Campus",  icon: "🏰", blurb: "The living map where every adventure begins." },
  { id: "buildings",       label: "Buildings",       icon: "🏛️", blurb: "Every hall, chamber and gate you can enter." },
  { id: "journey",         label: "Journey",         icon: "🗺️", blurb: "Worlds and dungeons that guide your studies." },
  { id: "quests",          label: "Learning Quests", icon: "📜", blurb: "Lectures, tasks and rewards along the path." },
  { id: "quizzes",         label: "Quizzes",         icon: "🎯", blurb: "How assessments unlock the next chamber." },
  { id: "bosses",          label: "Boss Battles",    icon: "🐉", blurb: "Final challenges that seal each chapter." },
  { id: "economy",         label: "Coins & Keys",    icon: "🪙", blurb: "Currencies you earn through effort." },
  { id: "progression",     label: "XP, Ranks & Titles", icon: "⚔️", blurb: "How Cadets rise to Legends." },
  { id: "merchant",        label: "Merchant's Emporium", icon: "🛒", blurb: "Where hard-won coins become treasures." },
  { id: "inventory",       label: "Inventory & Passes", icon: "🎒", blurb: "Your chest of scrolls, shields and tokens." },
  { id: "arena",           label: "Arena",           icon: "⚔️", blurb: "Duels and Battle Royales for glory." },
  { id: "collections",     label: "Shadows & Pets",  icon: "👻", blurb: "Companions and spirits you gather." },
  { id: "seasons",         label: "Season System",   icon: "🌙", blurb: "Limited chapters with exclusive rewards." },
  { id: "records",         label: "Report Card & Records", icon: "📖", blurb: "Attendance, offline tests and history." },
  { id: "faq",             label: "Frequently Asked", icon: "❓", blurb: "Answers to what most Cadets wonder." },
];

export const LUMI_ENTRIES: LumiEntry[] = [
  {
    id: "welcome",
    title: "Welcome to Ingenious Academy",
    category: "getting-started",
    summary: "The Academy is a living world where studying earns you real adventure.",
    body: [
      "You are a Cadet of Ingenious Academy. Every lecture you master, every quiz you clear and every day you attend shapes your Hunter Rank.",
      "Explore the Campus at your own pace — the buildings will glow whenever a new adventure awaits you.",
    ],
    keywords: ["welcome", "start", "begin", "intro", "cadet", "new"],
    icon: "✨",
  },
  {
    id: "campus",
    title: "The Academy Campus",
    category: "campus",
    summary: "Your home base and the map of every building you can visit.",
    body: [
      "The Campus is the beating heart of Ingenious Academy. From here you enter the Journey, the Arena, the Merchant's Emporium, the Hall of Fame and your own Residence.",
      "Tap any building to walk toward it — each one holds a different kind of adventure.",
    ],
    keywords: ["campus", "map", "home", "buildings", "hub"],
    icon: "🏰",
  },
  {
    id: "journey",
    title: "The Journey",
    category: "journey",
    summary: "Worlds and dungeons that mirror your subjects and chapters.",
    body: [
      "Every Subject is a World. Every Chapter is a Dungeon. Every Lecture is a Quest.",
      "Complete Quests in order — each one you clear opens the path to the next. Finish every Quest in a Dungeon to challenge the Boss Battle at its tail.",
    ],
    keywords: ["journey", "world", "dungeon", "chapter", "subject"],
    icon: "🗺️",
  },
  {
    id: "quests",
    title: "Learning Quests",
    category: "quests",
    summary: "Lectures and study tasks that reward XP and coins.",
    body: [
      "Each Quest holds a lecture and a short assessment. Watch the lecture and answer the Quiz Gate to prove your mastery.",
      "Passing a Quest awards XP, Coins and unlocks the next stone on the dungeon path.",
    ],
    keywords: ["quest", "lecture", "learning", "video", "task"],
    icon: "📜",
  },
  {
    id: "quizzes",
    title: "Quizzes & Quiz Gates",
    category: "quizzes",
    summary: "Short assessments at the end of every Quest.",
    body: [
      "A Quiz Gate seals each Quest. You may attempt it as many times as you need — only your best attempt counts toward unlocking the next path.",
      "Passing every Quiz Gate in a Dungeon awakens the Boss Battle.",
    ],
    keywords: ["quiz", "test", "assessment", "gate", "score", "attempt"],
    icon: "🎯",
  },
  {
    id: "bosses",
    title: "Boss Battles",
    category: "bosses",
    summary: "The chapter-final challenge that grants legendary rewards.",
    body: [
      "When every Quest of a Dungeon is cleared, the Boss Gate opens. Defeating a Boss rewards bonus XP, Coins, a trophy and often a rare drop.",
      "Bosses are optional in progress, but they are the surest way to gain Rank.",
    ],
    keywords: ["boss", "battle", "final", "chapter", "trophy"],
    icon: "🐉",
  },
  {
    id: "coins",
    title: "Academy Coins",
    category: "economy",
    summary: "The primary currency earned by studying and attending.",
    body: [
      "Coins drop from Quests, Quizzes, Boss Battles, streaks and daily attendance.",
      "Spend them at the Merchant's Emporium for cosmetics, at the Spin Wheel for surprise rewards, or save toward rare Passes.",
    ],
    keywords: ["coin", "coins", "gold", "currency", "money", "earn"],
    icon: "🪙",
  },
  {
    id: "keys",
    title: "Keys",
    category: "economy",
    summary: "Sacred keys that open sealed treasure chests.",
    body: [
      "Keys are rarer than Coins and only appear from Boss Battles, streak milestones and seasonal events.",
      "Use them to unlock premium chests inside the Treasure Chest Corner.",
    ],
    keywords: ["key", "keys", "chest", "unlock"],
    icon: "🗝️",
  },
  {
    id: "xp",
    title: "Experience (XP)",
    category: "progression",
    summary: "The energy of learning — it raises your Level.",
    body: [
      "Every Quest, Quiz and Boss awards XP. XP fills your Level bar; each new Level pushes you closer to the next Rank.",
      "An XP Potion doubles all XP gains for 24 hours.",
    ],
    keywords: ["xp", "experience", "level", "levels"],
    icon: "⚡",
  },
  {
    id: "ranks",
    title: "Hunter Ranks",
    category: "progression",
    summary: "Your title of power — E-Rank Cadet all the way to Monarch.",
    body: [
      "Ranks are earned through Levels, streaks and Boss victories. Each Rank unlocks new frames, badges and Arena tiers.",
      "The path is E → D → C → B → A → S → National → Monarch. Very few reach Monarch — but every Cadet begins the climb the same way: one Quest at a time.",
    ],
    keywords: ["rank", "hunter", "monarch", "tier", "s rank"],
    icon: "⚔️",
  },
  {
    id: "titles",
    title: "Titles",
    category: "progression",
    summary: "Cosmetic names earned or purchased.",
    body: [
      "Titles like Rookie Hunter, Homework Slayer, Dungeon Explorer or Quiz Assassin appear beneath your name.",
      "You may equip one Title at a time from your Wardrobe in the Residence.",
    ],
    keywords: ["title", "titles", "name", "wardrobe"],
    icon: "🎖️",
  },
  {
    id: "badges",
    title: "Badges & Achievements",
    category: "progression",
    summary: "Trophies for milestones — 7-day Streak, First Boss, Perfect Quiz and more.",
    body: [
      "Badges are permanent proof of your feats. Rarer badges have colored glows and can be pinned to your Player Card.",
      "See them all on the Achievement Wall inside your Residence.",
    ],
    keywords: ["badge", "achievement", "trophy", "milestone"],
    icon: "🏅",
  },
  {
    id: "merchant",
    title: "The Merchant's Emporium",
    category: "merchant",
    summary: "Trade coins for cosmetics, passes, titles and chests.",
    body: [
      "The Merchant restocks daily. Watch the Daily Deal for one discounted item and the Coin Goal to know how close you are to your next unlock.",
      "Nothing here changes your Rank — the Emporium is where hard work becomes personal style.",
    ],
    keywords: ["shop", "merchant", "emporium", "buy", "spend"],
    icon: "🛒",
  },
  {
    id: "inventory",
    title: "Inventory Chest",
    category: "inventory",
    summary: "The safe-keeping chest for every item you own.",
    body: [
      "Everything you win or buy — Passes, Tokens, Potions, Keys — rests inside your Inventory Chest in the Residence.",
      "Passes must be equipped or activated before they can be used.",
    ],
    keywords: ["inventory", "chest", "backpack", "items"],
    icon: "🎒",
  },
  {
    id: "passes",
    title: "Passes",
    category: "inventory",
    summary: "Special scrolls that unlock rare abilities.",
    body: [
      "Homework Shield — skip one homework, teacher approval required, once per month.",
      "Holiday Pass — one approved leave, cannot be used during exams, once per term.",
      "Streak Shield — protects one missed day of your streak.",
      "Quiz Retry Token — attempt any failed quiz once more.",
      "XP Potion — double XP for 24 hours.",
    ],
    keywords: ["pass", "passes", "homework", "holiday", "streak", "retry", "potion"],
    icon: "📜",
  },
  {
    id: "chests",
    title: "Treasure Chests",
    category: "inventory",
    summary: "Common, Rare, Epic and Legendary — each brimming with surprises.",
    body: [
      "Chests may contain Coins, Passes, Titles, Cosmetics and one day Shadows and Pets.",
      "Legendary Chests appear only from Boss Battles, top Arena finishes and rare Seasonal events.",
    ],
    keywords: ["chest", "chests", "treasure", "loot"],
    icon: "🎁",
  },
  {
    id: "spin",
    title: "Daily Fortune Spin",
    category: "inventory",
    summary: "One free spin every day at the Merchant's chest.",
    body: [
      "The Spin Wheel resets every 24 hours. Rewards range from Coins to rare cosmetics.",
      "Never miss a day — the wheel is one of the fastest paths to surprise loot.",
    ],
    keywords: ["spin", "wheel", "daily", "fortune"],
    icon: "🎡",
  },
  {
    id: "arena",
    title: "The Arena",
    category: "arena",
    summary: "Duels and Battle Royales against other Cadets.",
    body: [
      "Challenge another Hunter to a Duel, or enter a Battle Royale for many rivals at once.",
      "Every victory adds to your Arena Wins and climbs you up the Hall of Fame.",
    ],
    keywords: ["arena", "pvp", "duel", "battle royale", "fight"],
    icon: "⚔️",
  },
  {
    id: "hall-of-fame",
    title: "Hall of Fame",
    category: "arena",
    summary: "The eternal leaderboard of Ingenious Academy.",
    body: [
      "Rankings update daily. Only the finest Hunters see their names shine at the top.",
      "Rewards, seasonal titles and boasting rights await the top ranks.",
    ],
    keywords: ["hall of fame", "leaderboard", "ranking", "top"],
    icon: "🏆",
  },
  {
    id: "residence",
    title: "Academy Residence",
    category: "buildings",
    summary: "Your personal room — the heart of your progress.",
    body: [
      "Return to your Residence to admire trophies, equip cosmetics, tend to your pet and claim the Daily Chest.",
      "Everything you have earned lives here.",
    ],
    keywords: ["residence", "profile", "room", "home"],
    icon: "🏠",
  },
  {
    id: "attendance",
    title: "Attendance",
    category: "records",
    summary: "Your daily presence at the Academy.",
    body: [
      "Every day you attend adds Coins, XP and streak progress. Missing a day risks your streak unless a Streak Shield is active.",
      "Your Attendance % is shown proudly on your Player Card.",
    ],
    keywords: ["attendance", "present", "streak", "daily"],
    icon: "📅",
  },
  {
    id: "streaks",
    title: "Streaks",
    category: "records",
    summary: "Consecutive days of study — every Cadet's proudest number.",
    body: [
      "Long streaks unlock badges, keys and rare titles. Losing a streak resets you to day 1, so guard it carefully.",
      "A Streak Shield in your Inventory forgives one missed day.",
    ],
    keywords: ["streak", "days", "shield"],
    icon: "🔥",
  },
  {
    id: "report-card",
    title: "Report Card",
    category: "records",
    summary: "Your official academic record inside the Academy.",
    body: [
      "The Report Card tracks quizzes, offline tests, attendance and teacher notes.",
      "It is the mirror between your adventures and your school life.",
    ],
    keywords: ["report", "card", "grades", "record"],
    icon: "📖",
  },
  {
    id: "offline-tests",
    title: "Offline Tests",
    category: "records",
    summary: "Real classroom exams recorded in the Academy Ledger.",
    body: [
      "Teachers record offline test results into the Academy. Strong performances still reward XP and Coins.",
      "Review them in your Report Card any time.",
    ],
    keywords: ["offline", "test", "exam", "paper"],
    icon: "📝",
  },
  {
    id: "shadows",
    title: "Shadow Collection",
    category: "collections",
    summary: "Spirits you collect from Bosses, chests and rare events.",
    body: [
      "Each Shadow has a rarity, an unlock source and a lore description. Locked Shadows appear as silhouettes until you claim them.",
      "The full collection lives in the Shadow Gallery of your Residence.",
    ],
    keywords: ["shadow", "shadows", "collection", "monarch"],
    icon: "👻",
  },
  {
    id: "pets",
    title: "Pets",
    category: "collections",
    summary: "Loyal companions who follow you across the Academy.",
    body: [
      "You may equip one active Pet at a time. Pets have names, rarities and glowing auras.",
      "New pets are earned through Chests, Seasons and special milestones.",
    ],
    keywords: ["pet", "pets", "companion"],
    icon: "🐾",
  },
  {
    id: "seasons",
    title: "Season System",
    category: "seasons",
    summary: "Limited-time chapters with exclusive rewards.",
    body: [
      "Each Season runs for a set number of weeks. Complete Seasonal Quests to unlock unique titles, frames and pets that will not return.",
      "Watch the Seasonal Shelf inside the Emporium for time-limited wares.",
    ],
    keywords: ["season", "seasonal", "battle pass", "limited"],
    icon: "🌙",
  },
  {
    id: "how-to-unlock",
    title: "How do I unlock the next Quest?",
    category: "faq",
    summary: "Clear the previous Quiz Gate — that path is your key.",
    body: [
      "Every Quest is sealed until you pass the Quiz Gate of the Quest before it.",
      "If a path glows grey and rune-locked, return to the previous Quest and clear the Quiz — you can retry as many times as needed.",
    ],
    keywords: ["unlock", "next quest", "locked", "path", "gate"],
    icon: "🔓",
  },
  {
    id: "earn-coins",
    title: "How do I earn Coins?",
    category: "faq",
    summary: "Study, attend and adventure — the Academy rewards effort.",
    body: [
      "Coins drop from Quests, Quizzes, Boss Battles, daily attendance, the Spin Wheel and streak milestones.",
      "The Merchant sometimes hands out bonus Coins during Seasons — keep watch.",
    ],
    keywords: ["earn coins", "get coins", "farm", "money"],
    icon: "🪙",
  },
  {
    id: "spend-coins",
    title: "Where do I spend Coins?",
    category: "faq",
    summary: "At the Merchant's Emporium and the Spin Wheel.",
    body: [
      "The Merchant sells cosmetics, titles, passes and chests. The Spin Wheel trades small amounts for a chance at surprise loot.",
      "Coins never expire — save patiently for the rarest items.",
    ],
    keywords: ["spend coins", "shop", "buy"],
    icon: "🛒",
  },
  {
    id: "raise-rank",
    title: "How do I raise my Rank?",
    category: "faq",
    summary: "Levels, Boss victories and long streaks lift you upward.",
    body: [
      "Ranks respond to sustained effort. Level up through XP, defeat Bosses, hold a strong streak and finish each Season with pride.",
      "There are no shortcuts — but every day of study counts.",
    ],
    keywords: ["rank up", "increase rank", "promotion"],
    icon: "⬆️",
  },
];

import { applyLumiOverride, readLumiOverrides } from "./overrides";

export function searchLumi(query: string, limit = 12): LumiEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const overrides = readLumiOverrides();
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = LUMI_ENTRIES.map((raw) => {
    const e = applyLumiOverride(raw, overrides);
    const hay = [e.title, e.summary, e.category, ...e.keywords, ...e.body].join(" ").toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (!hay.includes(t)) continue;
      score += 1;
      if (e.title.toLowerCase().includes(t)) score += 3;
      if (e.keywords.some((k) => k.toLowerCase() === t)) score += 4;
    }
    return { e, score };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((r) => r.e);
}

export function entryForCategory(cat: LumiCategoryId): LumiEntry[] {
  const overrides = readLumiOverrides();
  return LUMI_ENTRIES.filter((e) => e.category === cat).map((e) => applyLumiOverride(e, overrides));
}

export function findEntry(id: string): LumiEntry | undefined {
  const raw = LUMI_ENTRIES.find((e) => e.id === id);
  return raw ? applyLumiOverride(raw) : undefined;
}

