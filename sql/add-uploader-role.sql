-- Migration: Add "uploader" role and video_uploads table
-- Safe to re-run regardless of whether a prior run partially or fully succeeded:
-- ALTER TYPE / CREATE TABLE use IF NOT EXISTS, every CREATE POLICY is preceded by
-- DROP POLICY IF EXISTS, and the chapter_id -> hierarchy_id rename only fires if needed.
-- Apply via Supabase SQL editor or `node run-add-uploader-role.mjs`.

-- 1. Extend the user_role enum with 'uploader'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'uploader';

-- Postgres cannot use a brand-new enum value in the same transaction that added it
-- ("unsafe use of new value" error). Since this whole file is sent as one implicit
-- transaction (both by the Supabase SQL editor and by the raw-pg runner script),
-- commit here so the policy below — which references 'uploader' — is safe to create.
COMMIT;

-- 2. Create a table to track uploaded videos. Attachment is level-agnostic: hierarchy_id can
--    reference a board, class, subject, or chapter row — the referenced row's own `type`
--    column tells you which level. (Originally named chapter_id; renamed below if needed.)
CREATE TABLE IF NOT EXISTS public.video_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hierarchy_id  UUID NOT NULL REFERENCES public.hierarchies(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id),
  vimeo_video_id TEXT NOT NULL,        -- e.g. "123456789"
  vimeo_uri      TEXT NOT NULL,        -- full Vimeo URI e.g. "/videos/123456789"
  vimeo_link     TEXT,                 -- playable link (from Vimeo response)
  title          TEXT,
  description    TEXT,
  status         TEXT DEFAULT 'uploading', -- uploading | processing | available | error
  file_size      BIGINT,               -- bytes
  duration       NUMERIC,              -- seconds (filled in once Vimeo finishes transcoding)
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 2b. If an earlier run already created this table with the old column name, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video_uploads' AND column_name = 'chapter_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'video_uploads' AND column_name = 'hierarchy_id'
  ) THEN
    ALTER TABLE public.video_uploads RENAME COLUMN chapter_id TO hierarchy_id;
  END IF;
END $$;

-- 3. RLS policies for video_uploads
ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to video_uploads" ON public.video_uploads;
CREATE POLICY "Admins have full access to video_uploads"
ON public.video_uploads FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Uploaders can read own uploads" ON public.video_uploads;
CREATE POLICY "Uploaders can read own uploads"
ON public.video_uploads FOR SELECT
USING ( auth.uid() = uploaded_by );

DROP POLICY IF EXISTS "Uploaders can insert uploads" ON public.video_uploads;
CREATE POLICY "Uploaders can insert uploads"
ON public.video_uploads FOR INSERT
WITH CHECK ( auth.uid() = uploaded_by );

DROP POLICY IF EXISTS "Uploaders can update own uploads" ON public.video_uploads;
CREATE POLICY "Uploaders can update own uploads"
ON public.video_uploads FOR UPDATE
USING ( auth.uid() = uploaded_by );

-- 4. RLS policy for uploaders reading hierarchy (read-only)
DROP POLICY IF EXISTS "Uploaders can read hierarchies" ON public.hierarchies;
CREATE POLICY "Uploaders can read hierarchies"
ON public.hierarchies FOR SELECT
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'uploader' );
