
DROP POLICY IF EXISTS "Students create their own passes" ON public.user_passes;

CREATE POLICY "Students create their own pending passes"
ON public.user_passes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND used_at IS NULL
);
