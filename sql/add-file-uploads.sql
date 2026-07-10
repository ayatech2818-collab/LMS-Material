-- Migration: file_uploads table (slide/document files stored in AWS S3)
-- Mirrors video_uploads but for arbitrary files uploaded to the S3 bucket. Attachment is
-- level-agnostic: hierarchy_id can reference a board, class, subject, or chapter row.
-- Safe to re-run: CREATE TABLE IF NOT EXISTS + DROP-then-CREATE for every policy.
-- Apply via the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.file_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hierarchy_id  UUID NOT NULL REFERENCES public.hierarchies(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id),
  s3_key        TEXT NOT NULL,        -- object key in the (private) bucket
  file_url      TEXT,                 -- app link, served via /api/files/[id] (signed redirect)
  file_name     TEXT,                 -- original filename
  content_type  TEXT,
  file_size     BIGINT,               -- bytes
  title         TEXT,
  status        TEXT DEFAULT 'uploading', -- uploading | available | error
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to file_uploads" ON public.file_uploads;
CREATE POLICY "Admins have full access to file_uploads"
ON public.file_uploads FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Uploaders can read own file_uploads" ON public.file_uploads;
CREATE POLICY "Uploaders can read own file_uploads"
ON public.file_uploads FOR SELECT
USING ( auth.uid() = uploaded_by );

DROP POLICY IF EXISTS "Uploaders can insert file_uploads" ON public.file_uploads;
CREATE POLICY "Uploaders can insert file_uploads"
ON public.file_uploads FOR INSERT
WITH CHECK ( auth.uid() = uploaded_by );

DROP POLICY IF EXISTS "Uploaders can update own file_uploads" ON public.file_uploads;
CREATE POLICY "Uploaders can update own file_uploads"
ON public.file_uploads FOR UPDATE
USING ( auth.uid() = uploaded_by );
