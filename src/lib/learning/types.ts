export type ContinueTarget = {
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  chapterNumber: number;
  lectureId: string | null;
  lectureTitle: string | null;
  lectureNumber: number | null;
  nextLectureTitle: string | null;
  nextLectureNumber: number | null;
  chapterPercent: number;
  chapterDone: number;
  chapterTotal: number;
  subjectPercent: number;
  remainingLessons: number;
  estimatedMinutes: number;
  /** true when every lesson of the chapter is done and only the Guardian reward remains */
  guardianReady: boolean;
};

export type ContinueLearningResult = {
  status: "resume" | "start" | "all_complete" | "no_content";
  target: ContinueTarget | null;
  overall: { total: number; done: number; percent: number };
  suggestion: { subjectId: string; subjectName: string } | null;
};

export type DailyMission = {
  code: string;
  label: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
  xp: number;
  coins: number;
};

export type DailyMissionsResult = {
  day: string;
  missions: DailyMission[];
  completed: number;
  total: number;
  streakDays: number;
};
