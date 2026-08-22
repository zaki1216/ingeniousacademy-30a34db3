DROP POLICY IF EXISTS "Authenticated read lecture materials" ON storage.objects;

CREATE POLICY "Read published lecture materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture-materials'
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.lecture_resources lr
      WHERE lr.file_path = storage.objects.name
        AND lr.status = 'published'
    )
  )
);