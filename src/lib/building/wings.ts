// Keyword classifiers to split subjects/chapters into RPG "wings".
// Purely presentational — no DB schema changes.

export type WingId = string;

export type ChapterLike = {
  id: string;
  chapter_name: string;
  chapter_number: number;
};

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

function has(name: string, keys: string[]): boolean {
  const n = name.toLowerCase();
  return keys.some((k) => n.includes(k));
}

export function classifyMathWing(name: string): "algebra" | "geometry" | "other" {
  if (has(name, GEOMETRY_KEYS)) return "geometry";
  if (has(name, ALGEBRA_KEYS)) return "algebra";
  return "other";
}

/** Split chapters into Algebra / Geometry — chapters that match nothing go to Algebra by default. */
export function splitMathChapters<T extends ChapterLike>(
  chapters: T[],
): { algebra: T[]; geometry: T[] } {
  const algebra: T[] = [];
  const geometry: T[] = [];
  for (const c of chapters) {
    const w = classifyMathWing(c.chapter_name ?? "");
    if (w === "geometry") geometry.push(c);
    else algebra.push(c);
  }
  return { algebra, geometry };
}

/** Split science subjects/chapters into Science 01 / Science 02.
 * If two subjects exist whose names contain '01'/'02' (or '1'/'2'), pair by that.
 * Otherwise split single subject's chapters in half. */
export function splitScienceChapters<T extends ChapterLike>(
  chapters: T[],
): { sci01: T[]; sci02: T[] } {
  const sci01: T[] = [];
  const sci02: T[] = [];
  for (const c of chapters) {
    const n = c.chapter_name.toLowerCase();
    if (/\b(02|2)\b/.test(n) || /part\s*ii/.test(n) || /part\s*2/.test(n)) sci02.push(c);
    else if (/\b(01|1)\b/.test(n) || /part\s*i/.test(n) || /part\s*1/.test(n)) sci01.push(c);
    else sci01.push(c);
  }
  // Rebalance if one side ended up empty and both had ambiguous names
  if (sci02.length === 0 && sci01.length > 1) {
    const half = Math.ceil(sci01.length / 2);
    return { sci01: sci01.slice(0, half), sci02: sci01.slice(half) };
  }
  if (sci01.length === 0 && sci02.length > 1) {
    const half = Math.ceil(sci02.length / 2);
    return { sci01: sci02.slice(0, half), sci02: sci02.slice(half) };
  }
  return { sci01, sci02 };
}

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

export function isLanguageSubject(name: string): boolean {
  const n = (name ?? "").toLowerCase();
  return LANGUAGE_KEYS.some((k) => n.includes(k)) || n.includes("language");
}

export function languageOf(name: string): string {
  const n = (name ?? "").toLowerCase();
  const hit = LANGUAGE_KEYS.find((k) => n.includes(k));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : name;
}
