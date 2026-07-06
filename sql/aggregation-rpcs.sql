-- Aggregation RPCs — compute dashboard counts in the database so the API only ever
-- returns small summary result sets. This makes the PostgREST 1000-row cap irrelevant by
-- design (no page fetches a whole table to count rows in JS). Safe to re-run: every
-- function uses CREATE OR REPLACE. Apply with `node run-aggregation-rpcs.mjs` or by pasting
-- this file into the Supabase SQL editor.

-- Per-user "completed" count.
--   loaders: distinct tasks they submitted that are no longer assigned to them
--            (passed QC / advanced to the next stage / finalized)
--   QC:      distinct tasks they approved
-- A user is a loader XOR a QC, so UNION (which dedups the (user, task) pairs) never
-- double-counts.
create or replace function public.get_completed_task_counts()
returns table (user_id uuid, completed int)
language sql stable security definer set search_path = public as $$
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
create or replace function public.get_loader_stats(p_user_id uuid)
returns table (total_submissions int, completed int)
language sql stable security definer set search_path = public as $$
  select
    count(distinct h.task_id)::int,
    count(distinct h.task_id) filter (
      where not exists (select 1 from task_assignments a
                        where a.user_id = p_user_id and a.task_id = h.task_id))::int
  from task_history h
  where h.changed_by = p_user_id and h.action = 'submitted';
$$;

-- Pipeline status chart: one row per current_status.
create or replace function public.get_task_status_counts()
returns table (status text, count int)
language sql stable security definer set search_path = public as $$
  select current_status::text, count(*)::int from tasks group by current_status;
$$;

-- Per-user active assignment count ("handles"): one row per user_id.
create or replace function public.get_assignment_counts()
returns table (user_id uuid, count int)
language sql stable security definer set search_path = public as $$
  select user_id, count(*)::int from task_assignments group by user_id;
$$;

-- QC approved / rejected distinct-task counts, with an optional created_at range.
create or replace function public.get_qc_review_counts(
  p_user_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (approved int, rejected int)
language sql stable security definer set search_path = public as $$
  select
    count(distinct h.task_id) filter (where h.action in ('qc_approved_script', 'qc_approved_video'))::int,
    count(distinct h.task_id) filter (where h.action in ('qc_rejected_script', 'qc_rejected_video'))::int
  from task_history h
  where h.changed_by = p_user_id
    and (p_from is null or h.created_at >= p_from)
    and (p_to   is null or h.created_at <= p_to);
$$;

-- Only the app's service-role client calls these; keep them off the public API roles.
revoke execute on function
  public.get_completed_task_counts(),
  public.get_loader_stats(uuid),
  public.get_task_status_counts(),
  public.get_assignment_counts(),
  public.get_qc_review_counts(uuid, timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute on function
  public.get_completed_task_counts(),
  public.get_loader_stats(uuid),
  public.get_task_status_counts(),
  public.get_assignment_counts(),
  public.get_qc_review_counts(uuid, timestamptz, timestamptz)
  to service_role;
