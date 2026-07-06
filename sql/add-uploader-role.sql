-- Migration: Add "uploader" role and video_uploads table
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- Apply via Supabase SQL editor or `node run-sql.mjs`.

-- 1. Extend the user_role enum with 'uploader'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'uploader';

-- 2. Create a table to track uploaded videos
CREATE TABLE IF NOT EXISTS public.video_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES public.hierarchies(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id),
  vimeo_video_id TEXT NOT NULL,        -- e.g. "123456789"
  vimeo_uri      TEXT NOT NULL,        -- full Vimeo URI e.g. "/videos/123456789"
  vimeo_link     TEXT,                 -- playable link (from Vimeo response)
  title          TEXT,
  description    TEXT,
  status         TEXT DEFAULT 'uploading', -- uploading | processing | available | error
  file_size      BIGINT,               -- bytes
  duration       NUMERIC,              -- seconds (filled after Vimeo transcode)
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS policies for video_uploads
ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to video_uploads"
ON public.video_uploads FOR ALL
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Uploaders can read own uploads"
ON public.video_uploads FOR SELECT
USING ( auth.uid() = uploaded_by );

CREATE POLICY "Uploaders can insert uploads"
ON public.video_uploads FOR INSERT
WITH CHECK ( auth.uid() = uploaded_by );

CREATE POLICY "Uploaders can update own uploads"
ON public.video_uploads FOR UPDATE
USING ( auth.uid() = uploaded_by );

-- 4. RLS policy for uploaders reading hierarchy (read-only)
CREATE POLICY "Uploaders can read hierarchies"
ON public.hierarchies FOR SELECT
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'uploader' );
