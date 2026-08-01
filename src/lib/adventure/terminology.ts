/**
 * Student-facing terminology for the Adventure Map.
 *
 * Internally the academic model stays unchanged (Subject / Chapter / Lecture /
 * Guardian / Chapter Completion). Only the *student* interface renames them.
 * Admin screens keep academic wording.
 *
 * Everything here is configuration so wording can change later without
 * touching components.
 */

export const ADVENTURE_TERMS = {
  building: "Academy Building", // Subject
  dungeon: "Dungeon", // Chapter
  quest: "Quest", // Lecture
  masterTrial: "Master Trial", // Guardian
  dungeonCleared: "Dungeon Cleared", // Chapter complete
  knowledgeChest: "Knowledge Chest", // Chapter reward
  entrance: "Dungeon Entrance",
} as const;

export type AdventureTerms = typeof ADVENTURE_TERMS;

/**
 * Node kinds the map can render. `quest` / `master_trial` / `knowledge_chest`
 * are used today; the rest are reserved so future content (side quests,
 * revision, seasonal events) can be dropped onto the same trail with no
 * architectural change.
 */
export type AdventureNodeKind =
  | "entrance"
  | "quest"
  | "side_quest"
  | "revision_quest"
  | "bonus_quest"
  | "event_quest"
  | "master_trial"
  | "knowledge_chest";

export type AdventureNodeState = "completed" | "current" | "available" | "locked";

export type AdventureNode = {
  id: string;
  kind: AdventureNodeKind;
  state: AdventureNodeState;
  /** Short label shown under the node, e.g. "QUEST 01" */
  badge?: string;
  title: string;
  subtitle?: string;
  xp?: number;
  coins?: number;
  /** Shows a subtle Daily Mission marker on the node */
  missionMarker?: string | null;
  disabled?: boolean;
  /** Arbitrary payload for the click handler */
  payload?: unknown;
};

export const NODE_LABEL: Record<AdventureNodeKind, string> = {
  entrance: ADVENTURE_TERMS.entrance,
  quest: ADVENTURE_TERMS.quest,
  side_quest: "Side Quest",
  revision_quest: "Revision Quest",
  bonus_quest: "Bonus Quest",
  event_quest: "Event Quest",
  master_trial: ADVENTURE_TERMS.masterTrial,
  knowledge_chest: ADVENTURE_TERMS.knowledgeChest,
};

export const STATE_LABEL: Record<AdventureNodeState, string> = {
  completed: "Cleared",
  current: "You are here",
  available: "Ready",
  locked: "Sealed",
};
