-- Combined, one-shot migration: run this entire file once in the Supabase SQL Editor.
-- Covers both pending migrations that were never applied to the live database:
--   1) Uploader role: 'uploader' enum value + video_uploads table + RLS policies
--   2) Dashboard aggregation RPCs (get_completed_task_counts, get_loader_stats, etc.)
-- Safe to re-run: every statement uses IF NOT EXISTS / DROP-then-CREATE / CREATE OR REPLACE.

-- ============================================================================
-- PART 1: Uploader role + video_uploads table
-- ============================================================================

-- 1a. Extend the user_role enum with 'uploader'.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'uploader';

-- Postgres cannot use a brand-new enum value in the same transaction that added it
-- ("unsafe use of new value" error). Committing here splits the transaction so the
-- rest of this script — which does reference 'uploader' — is safe to run right after.
COMMIT;

-- 1b. Create a table to track uploaded videos. Attachment is level-agnostic: hierarchy_id
--     can reference a board, class, subject, or chapter row — the referenced row's own
--     `type` column tells you which level. (Originally named chapter_id; renamed below if
--     an earlier partial run already created it under that name.)
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

DROP POLICY IF EXISTS "Uploaders can read hierarchies" ON public.hierarchies;
CREATE POLICY "Uploaders can read hierarchies"
ON public.hierarchies FOR SELECT
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'uploader' );

-- ============================================================================
-- PART 2: Dashboard aggregation RPCs
-- Compute dashboard counts in the database so the API only ever returns small summary
-- result sets — this makes the PostgREST 1000-row cap irrelevant by design.
-- ============================================================================

-- Per-user "completed" count.
--   loaders: distinct tasks they submitted that are no longer assigned to them
--            (passed QC / advanced to the next stage / finalized)
--   QC:      distinct tasks they approved
-- A user is a loader XOR a QC, so UNION (which dedups the (user, task) pairs) never
-- double-counts.
CREATE OR REPLACE FUNCTION public.get_completed_task_counts()
RETURNS TABLE (user_id uuid, completed int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select uid, count(*)::int from (
    select distinct h.changed_by as uid, h.task_id
    from task_history h
    where h.action = 'submitted'
      and not exists (select 1 from task_assignments a
                      where a.user_id = h.changed_by and a.task_id = h.task_id)
    union
    select distinct h.changed_by, h.task_id
    from task_history h
    where h.action in ('qc_approved_script', 'qc_approved_video')
  ) t group by uid;
$$;

-- Single loader (their own dashboard): distinct submissions + completed ("handed off").
CREATE OR REPLACE FUNCTION public.get_loader_stats(p_user_id uuid)
RETURNS TABLE (total_submissions int, completed int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select
    count(distinct h.task_id)::int,
    count(distinct h.task_id) filter (
      where not exists (select 1 from task_assignments a
                        where a.user_id = p_user_id and a.task_id = h.task_id))::int
  from task_history h
  where h.changed_by = p_user_id and h.action = 'submitted';
$$;

-- Pipeline status chart: one row per current_status.
CREATE OR REPLACE FUNCTION public.get_task_status_counts()
RETURNS TABLE (status text, count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select current_status::text, count(*)::int from tasks group by current_status;
$$;

-- Per-user active assignment count ("handles"): one row per user_id.
CREATE OR REPLACE FUNCTION public.get_assignment_counts()
RETURNS TABLE (user_id uuid, count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select user_id, count(*)::int from task_assignments group by user_id;
$$;

-- QC approved / rejected distinct-task counts, with an optional created_at range.
CREATE OR REPLACE FUNCTION public.get_qc_review_counts(
  p_user_id uuid, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
RETURNS TABLE (approved int, rejected int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select
    count(distinct h.task_id) filter (where h.action in ('qc_approved_script', 'qc_approved_video'))::int,
    count(distinct h.task_id) filter (where h.action in ('qc_rejected_script', 'qc_rejected_video'))::int
  from task_history h
  where h.changed_by = p_user_id
    and (p_from is null or h.created_at >= p_from)
    and (p_to   is null or h.created_at <= p_to);
$$;

-- Only the app's service-role client calls these; keep them off the public API roles.
REVOKE EXECUTE ON FUNCTION
  public.get_completed_task_counts(),
  public.get_loader_stats(uuid),
  public.get_task_status_counts(),
  public.get_assignment_counts(),
  public.get_qc_review_counts(uuid, timestamptz, timestamptz)
  FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.get_completed_task_counts(),
  public.get_loader_stats(uuid),
  public.get_task_status_counts(),
  public.get_assignment_counts(),
  public.get_qc_review_counts(uuid, timestamptz, timestamptz)
  TO service_role;
