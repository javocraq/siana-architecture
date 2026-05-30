
-- Create public storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can read project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

-- Admins can upload
CREATE POLICY "Admins can upload project images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update
CREATE POLICY "Admins can update project images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete
CREATE POLICY "Admins can delete project images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-images' AND public.has_role(auth.uid(), 'admin'));
