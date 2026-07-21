/**
 * Academy Curriculum — Typed hierarchy.
 *
 * This module defines the shape of the curriculum tree the UI renders. No
 * component is expected to hardcode subject/wing names or colors; instead
 * they read from configuration that conforms to these interfaces.
 *
 * Hierarchy:
 *   Board → Class → Subject → Wing → Campaign → Dungeon → LearningQuest
 *
 * The runtime data model in the database currently maps to a subset of this
 * (Standard → Subject → Chapter → Lecture). The configuration layer bridges
 * DB records to this richer hierarchy by way of matchers and wing definitions.
 */

export type AccentTheme = "amber" | "emerald" | "sky";

/* ------------------------------ Leaf types ------------------------------ */

export interface LearningQuest {
  /** DB `lectures.id` when live. */
  id: string;
  /** Human-facing lecture number. */
  number: number;
  name: string;
}

export interface Dungeon {
  /** DB `chapters.id` when live. */
  id: string;
  number: number;
  name: string;
  quests?: LearningQuest[];
  rewardXp?: number;
  rewardCoins?: number;
}

export interface Campaign {
  id: string;
  name: string;
  dungeons: Dungeon[];
}

/* ------------------------------ Wings ------------------------------ */

export interface WingVisual {
  emoji: string;
  gradient: string;
  glow: string;
  tag: string;
}

export interface WingDef {
  id: string;
  name: string;
  tag: string;
  emoji: string;
  description: string;
  gradient: string;
  glow: string;
}

/** Predicate operating on a chapter-like record (chapter_name/subject_id). */
export type ChapterPredicate = (chapter: {
  chapter_name: string;
  subject_id?: string | null;
}) => boolean;

/** Predicate operating on a subject-like record (subject_name). */
export type SubjectPredicate = (subject: { subject_name: string }) => boolean;

/* ------------------------------ Subjects & Buildings ------------------------------ */

export interface SubjectStyleContext {
  subject_name: string;
}

/**
 * A Building groups one or more Subjects behind a single campus door and
 * presents them as Wings. Concrete matching strategies:
 *
 *  - "split-chapters": one subject is fetched, chapters are partitioned into
 *    the declared wings by `chapterMatchers`.
 *  - "split-subjects": multiple subjects match; wings are declared with
 *    `subjectMatchers` and each wing shows its subject's chapters.
 *  - "per-subject": every matched subject becomes its own wing dynamically;
 *    visuals come from `perSubjectStyle`.
 */
export type BuildingWingStrategy = "split-chapters" | "split-subjects" | "per-subject";

export interface StaticWingConfig extends WingDef {
  /** For "split-chapters": decides which chapters belong to this wing. */
  chapterMatcher?: ChapterPredicate;
  /** For "split-subjects": decides which subject backs this wing. */
  subjectMatcher?: SubjectPredicate;
  /** If true, unmatched items fall into this wing. Only one may be a fallback. */
  fallback?: boolean;
}

export interface PerSubjectStyleFn {
  (ctx: SubjectStyleContext): {
    name: string;
    tag: string;
    emoji: string;
    gradient: string;
    glow: string;
    description: string;
  };
}

/* ------------------------------ Rendering / Theme ------------------------------ */

/** UI variant used by the generic Building Engine. */
export type RenderVariant = "hall" | "simple";

/** Theme tokens consumed by the generic renderers. */
export interface BuildingTheme {
  accent: AccentTheme;
  /** CSS color used for particles, highlights and the primary CTA glow. */
  primary: string;
  /** Full-screen backdrop CSS (radial-gradient recommended). */
  background: string;
  /** Particle base color (rgba/hex). */
  particle: string;
  /** Particle soft-shadow CSS value. */
  particleShadow: string;
}

/**
 * Represents an in-world mentor NPC that lives in a building. Optional; only
 * variants that render an NPC (currently the "hall" variant) will use it.
 */
export interface MentorDefinition {
  id: string;
  name: string;
  /** Short label rendered above dialogue bubbles ("Professor", "Curator"…). */
  title: string;
  /** Copy used the first time the cadet visits this building. */
  welcome?: (cadetName: string) => string;
  /**
   * Dynamic dialogue line — receives progress summary and returns a phrase.
   */
  line?: (ctx: {
    cadetName: string;
    hasDungeons: boolean;
    recommendedName: string | null;
    cleared: number;
    totalDungeons: number;
  }) => string;
}

/** How dungeon unlock state is derived from persisted progress. */
export type ProgressStrategy = "chapter-completion";

/** How the "Current Objective" is picked from the current wing's dungeons. */
export type ObjectiveStrategy = "next-unstarted-dungeon";

/** Everything the generic Building Engine needs to render a building. */
export interface BuildingRenderConfig {
  variant: RenderVariant;
  /** Small label above the hall title ("Laboratory", "Scriptorium"). */
  tagLabel: string;
  /** Header title on the info panel (defaults to building.title). */
  infoTitle?: string;
  /** Subtitle on the info panel (defaults to building.subtitle). */
  infoSubtitle?: string;
  /** Optional mentor NPC. */
  mentor?: MentorDefinition;
  /** How progress is computed. */
  progressStrategy?: ProgressStrategy;
  /** How the current objective is chosen. */
  objectiveStrategy?: ObjectiveStrategy;
  /** Theme tokens. */
  theme: BuildingTheme;
  /** Icon/emoji shown in the arrival sequence overlay. */
  icon?: string;
  /** Short welcome line shown during the arrival sequence. */
  welcome?: string;
}

/**
 * Reusable interface describing a full building definition. Building-agnostic
 * routes and the Building Engine only depend on this type.
 */
export interface BuildingDefinition extends BuildingCurriculum {
  render: BuildingRenderConfig;
}

export interface BuildingCurriculum {
  /** Stable id (matches route slug and campus building id). */
  id: string;
  /** Wing chooser title. */
  title: string;
  /** Wing chooser subtitle. */
  subtitle: string;
  /** UI accent theme. */
  accent: AccentTheme;
  /** Predicate that selects which subjects belong to this building. */
  subjectMatcher: SubjectPredicate;
  /** How wings are derived. */
  wingStrategy: BuildingWingStrategy;
  /** Wing configuration for split-chapters / split-subjects strategies. */
  wings?: StaticWingConfig[];
  /** Visual factory for per-subject strategy. */
  perSubjectStyle?: PerSubjectStyleFn;
  /** Human-readable name transformer (e.g. strip "language" prefix). */
  labelSubject?: (subjectName: string) => string;
  /** Copy shown when there are zero wings/dungeons. */
  emptyText?: string;
  /** Renderer configuration used by BuildingEngine. */
  render?: BuildingRenderConfig;
}

/* ------------------------------ Class / Board (skeleton) ------------------------------ */

export interface ClassDef {
  id: string;
  name: string;
  /** Building ids offered to this class, in display order. */
  buildingIds: string[];
}

export interface BoardDef {
  id: string;
  name: string;
  classes: ClassDef[];
}
