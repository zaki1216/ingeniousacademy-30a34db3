ALTER TABLE public.video_completions
  ADD COLUMN IF NOT EXISTS watch_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_watched_at timestamptz NOT NULL DEFAULT now();

UPDATE public.video_completions SET last_watched_at = completed_at WHERE last_watched_at IS NULL OR last_watched_at = completed_at;

CREATE INDEX IF NOT EXISTS video_completions_lecture_idx ON public.video_completions(lecture_id);
CREATE INDEX IF NOT EXISTS video_completions_user_idx ON public.video_completions(user_id);