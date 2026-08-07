/** Client-safe DTO shapes for the Shared Curriculum admin surface. */
export type CourseSummary = {
  id: string;
  subject_name: string;
  description: string | null;
  is_shared: boolean;
  status: string;
  version: number;
  previous_version_id: string | null;
  standard_ids: string[];
  standard_names: string[];
  student_count: number;
  chapter_count: number;
  lecture_count: number;
  completion_rate: number;
  updated_at: string | null;
  updated_by_name: string | null;
};
