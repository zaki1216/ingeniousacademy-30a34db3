CREATE POLICY "Authenticated read lecture materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lecture-materials');

CREATE POLICY "Admins upload lecture materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lecture-materials' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update lecture materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lecture-materials' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete lecture materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lecture-materials' AND private.has_role(auth.uid(), 'admin'::app_role));