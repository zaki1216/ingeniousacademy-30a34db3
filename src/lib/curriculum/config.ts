/**
 * Curriculum configuration registry.
 *
 * Editing this file is enough to add/remove Buildings, Wings, and to change
 * how subjects/chapters map into the campus. Components should NEVER check
 * subject names directly — they consume records returned from this module.
 */

import type {
  BuildingCurriculum,
  BoardDef,
  ChapterPredicate,
  SubjectPredicate,
} from "./types";

/* ------------------------------ Matcher helpers ------------------------------ */

const lower = (s: string | null | undefined) => (s ?? "").toLowerCase();

function includesAny(haystack: string, needles: string[]): boolean {
  const h = lower(haystack);
  return needles.some((n) => h.includes(n));
}

const subjectIncludes =
  (...needles: string[]): SubjectPredicate =>
  (s) =>
    includesAny(s.subject_name, needles);

const chapterIncludes =
  (...needles: string[]): ChapterPredicate =>
  (c) =>
    includesAny(c.chapter_name, needles);

const chapterMatches =
  (re: RegExp): ChapterPredicate =>
  (c) =>
    re.test(lower(c.chapter_name));

/* ------------------------------ Keyword banks ------------------------------ */

const ALGEBRA_KEYS = [
  "algebra",
  "equation",
  "polynomial",
  "quadratic",
  "linear",
  "expression",
  "exponent",
  "factor",
  "real number",
  "number system",
  "arithmetic",
  "progression",
  "statistic",
  "probab",
  "sequence",
  "series",
];

const GEOMETRY_KEYS = [
  "geometry",
  "triangle",
  "circle",
  "coordinate",
  "quadrilateral",
  "area",
  "volume",
  "mensuration",
  "trigonom",
  "angle",
  "surface",
  "line",
  "polygon",
  "construction",
  "similar",
];

const SCIENCE_KEYS = ["science", "physic", "chem", "bio"];

export const LANGUAGE_KEYS = [
  "english",
  "hindi",
  "marathi",
  "urdu",
  "sanskrit",
  "gujarati",
  "tamil",
  "telugu",
  "kannada",
  "bengali",
  "punjabi",
];

const isLanguageSubject: SubjectPredicate = (s) =>
  LANGUAGE_KEYS.some((k) => lower(s.subject_name).includes(k)) ||
  lower(s.subject_name).includes("language");

function languageOf(name: string): string {
  const n = lower(name);
  const hit = LANGUAGE_KEYS.find((k) => n.includes(k));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : name;
}

/* ------------------------------ Language hall visuals ------------------------------ */

const LANGUAGE_HALL_STYLES: Record<
  string,
  { emoji: string; gradient: string; glow: string; tag: string }
> = {
  english: {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#7c2d12,#b45309,#78350f)",
    glow: "rgba(251,191,36,0.5)",
    tag: "English Hall",
  },
  hindi: {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#7f1d1d,#c2410c,#7c2d12)",
    glow: "rgba(248,113,113,0.5)",
    tag: "Hindi Hall",
  },
  marathi: {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#134e4a,#0f766e,#065f46)",
    glow: "rgba(45,212,191,0.5)",
    tag: "Marathi Hall",
  },
  urdu: {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#3b0764,#6d28d9,#4c1d95)",
    glow: "rgba(167,139,250,0.5)",
    tag: "Urdu Hall",
  },
  sanskrit: {
    emoji: "📖",
    gradient: "linear-gradient(135deg,#78350f,#f59e0b,#b45309)",
    glow: "rgba(253,224,71,0.5)",
    tag: "Sanskrit Hall",
  },
};

/* ------------------------------ Building registry ------------------------------ */

export const BUILDINGS: BuildingCurriculum[] = [
  {
    id: "math",
    title: "Mathematics Building",
    subtitle: "The Numeric Halls await — choose the wing you wish to master.",
    accent: "amber",
    subjectMatcher: subjectIncludes("math"),
    wingStrategy: "split-chapters",
    wings: [
      {
        id: "algebra",
        name: "Algebra Wing",
        tag: "Hall of Numbers",
        emoji: "📘",
        description: "Master equations, polynomials and the arcane laws of number.",
        gradient: "linear-gradient(135deg,#1e3a8a,#3b5aa8,#0f1e40)",
        glow: "rgba(59,130,246,0.5)",
        chapterMatcher: chapterIncludes(...ALGEBRA_KEYS),
        fallback: true,
      },
      {
        id: "geometry",
        name: "Geometry Wing",
        tag: "Chamber of Shapes",
        emoji: "📐",
        description:
          "Bend space, angles and form to your will inside the geometric fortress.",
        gradient: "linear-gradient(135deg,#7c2d12,#c2410c,#78350f)",
        glow: "rgba(251,146,60,0.5)",
        chapterMatcher: chapterIncludes(...GEOMETRY_KEYS),
      },
    ],
    emptyText: "No dungeons prepared in this wing yet.",
  },

  {
    id: "science",
    title: "Science Laboratory",
    subtitle: "The Alchemy Wing — choose your laboratory to begin experimentation.",
    accent: "emerald",
    subjectMatcher: subjectIncludes(...SCIENCE_KEYS),
    wingStrategy: "split-subjects",
    wings: [
      {
        id: "sci01",
        name: "Science 01 Laboratory",
        tag: "First Laboratory",
        emoji: "🧪",
        description: "Foundational experiments and elemental studies.",
        gradient: "linear-gradient(135deg,#065f46,#0f766e,#134e4a)",
        glow: "rgba(52,211,153,0.5)",
        subjectMatcher: (s) =>
          /\b(01|1)\b/.test(lower(s.subject_name)) ||
          /part\s*i\b|part\s*1/.test(lower(s.subject_name)),
        fallback: true,
      },
      {
        id: "sci02",
        name: "Science 02 Laboratory",
        tag: "Second Laboratory",
        emoji: "⚗️",
        description: "Advanced reactions, forces and living systems.",
        gradient: "linear-gradient(135deg,#3b0764,#7c3aed,#4c1d95)",
        glow: "rgba(167,139,250,0.5)",
        subjectMatcher: (s) =>
          /\b(02|2)\b/.test(lower(s.subject_name)) ||
          /part\s*ii\b|part\s*2/.test(lower(s.subject_name)),
      },
    ],
    emptyText: "No dungeons prepared in this laboratory yet.",
  },

  {
    id: "library",
    title: "Language Library",
    subtitle:
      "The Scriptorium — every tongue has its own hall. Choose one to begin.",
    accent: "amber",
    subjectMatcher: isLanguageSubject,
    wingStrategy: "per-subject",
    labelSubject: (name) => languageOf(name),
    perSubjectStyle: ({ subject_name }) => {
      const lang = languageOf(subject_name);
      const style = LANGUAGE_HALL_STYLES[lower(lang)] ?? {
        emoji: "📖",
        gradient: "linear-gradient(135deg,#334155,#475569,#1e293b)",
        glow: "rgba(148,163,184,0.5)",
        tag: `${lang} Hall`,
      };
      return {
        name: `${lang} Hall`,
        tag: style.tag,
        emoji: style.emoji,
        gradient: style.gradient,
        glow: style.glow,
        description: `Enter the ${lang} scriptorium — quests of grammar, verse and story.`,
      };
    },
    emptyText: "This hall's tomes are being prepared.",
  },
];

/* ------------------------------ Lookup helpers ------------------------------ */

export function getBuilding(id: string): BuildingCurriculum | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

export function requireBuilding(id: string): BuildingCurriculum {
  const b = getBuilding(id);
  if (!b) throw new Error(`Unknown building "${id}"`);
  return b;
}

/**
 * Given a list of subjects and chapters coming from the database, return
 * runtime wings for a building. Purely functional — components pass in DB
 * data, receive UI-ready wing groupings.
 */
export function resolveWings<
  S extends { id: string; subject_name: string },
  C extends { id: string; subject_id: string; chapter_name: string },
>(
  building: BuildingCurriculum,
  subjects: S[],
  chapters: C[],
): Array<{
  id: string;
  name: string;
  tag: string;
  emoji: string;
  description: string;
  gradient: string;
  glow: string;
  subject?: S;
  chapters: C[];
}> {
  if (building.wingStrategy === "per-subject") {
    return subjects.map((s) => {
      const style =
        building.perSubjectStyle?.({ subject_name: s.subject_name }) ?? {
          name: s.subject_name,
          tag: s.subject_name,
          emoji: "📖",
          gradient: "linear-gradient(135deg,#334155,#475569,#1e293b)",
          glow: "rgba(148,163,184,0.5)",
          description: s.subject_name,
        };
      return {
        id: s.id,
        ...style,
        subject: s,
        chapters: chapters.filter((c) => c.subject_id === s.id),
      };
    });
  }

  if (building.wingStrategy === "split-subjects") {
    const wingDefs = building.wings ?? [];
    const assigned = new Map<string, S>();
    const fallback = wingDefs.find((w) => w.fallback);
    for (const s of subjects) {
      const w =
        wingDefs.find((w) => w.subjectMatcher?.({ subject_name: s.subject_name })) ??
        fallback;
      if (w) assigned.set(w.id, s);
    }
    return wingDefs.map((w) => {
      const subj = assigned.get(w.id);
      return {
        id: w.id,
        name: subj?.subject_name ?? w.name,
        tag: w.tag,
        emoji: w.emoji,
        description: w.description,
        gradient: w.gradient,
        glow: w.glow,
        subject: subj,
        chapters: subj ? chapters.filter((c) => c.subject_id === subj.id) : [],
      };
    });
  }

  // split-chapters
  const wingDefs = building.wings ?? [];
  const fallback = wingDefs.find((w) => w.fallback);
  const buckets = new Map<string, C[]>();
  wingDefs.forEach((w) => buckets.set(w.id, []));
  for (const c of chapters) {
    const w =
      wingDefs.find((w) => w.chapterMatcher?.({ chapter_name: c.chapter_name })) ??
      fallback;
    if (w) buckets.get(w.id)!.push(c);
  }
  return wingDefs.map((w) => ({
    id: w.id,
    name: w.name,
    tag: w.tag,
    emoji: w.emoji,
    description: w.description,
    gradient: w.gradient,
    glow: w.glow,
    chapters: buckets.get(w.id) ?? [],
  }));
}

/* ------------------------------ Board / Class skeleton ------------------------------ */

/**
 * Minimal board definition. Classes reference building ids from BUILDINGS.
 * Extend this or move it into the database when boards/classes become
 * user-selectable at runtime.
 */
export const BOARDS: BoardDef[] = [
  {
    id: "default",
    name: "Ingenious Academy",
    classes: [
      { id: "8", name: "Grade 8", buildingIds: ["math", "science", "library"] },
      { id: "9", name: "Grade 9", buildingIds: ["math", "science", "library"] },
      { id: "10", name: "Grade 10", buildingIds: ["math", "science", "library"] },
    ],
  },
];
