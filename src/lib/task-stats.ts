import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

/**
 * Canonical "completed" rule, defined once: the number of distinct tasks a loader
 * submitted that are no longer in their active assignments — i.e. the task passed QC,
 * advanced to the next stage, or was finalized ("submitted & handed off").
 */
export function countHandedOff(submitted: Set<string>, assigned: Set<string>): number {
  let n = 0;
  submitted.forEach((id) => {
    if (!assigned.has(id)) n++;
  });
  return n;
}

/**
 * Fetch every row for a query, paging through PostgREST's 1000-row cap so results are
 * never silently truncated. `query` must apply `.range(from, to)` and return the builder.
 */
async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data } = await query(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Completed-task count for every user, keyed by user id. Used by the admin dashboard and
 * the admin user-management table so both show the same figure as each loader's own view.
 *
 * Loaders are credited for tasks they submitted and handed off; QC users (who never
 * submit) are credited for the distinct tasks they approved. A user is either a loader or
 * a QC — never both — so the two contributions never double-count.
 */
export async function getCompletedTaskCounts(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const history = await fetchAll<{ task_id: string; changed_by: string; action: string }>(
    (from, to) =>
      supabase
        .from("task_history")
        .select("task_id, changed_by, action")
        .in("action", ["submitted", "qc_approved_script", "qc_approved_video"])
        .order("created_at", { ascending: false })
        .range(from, to),
  );

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("user_id, task_id");

  const assignedByUser: Record<string, Set<string>> = {};
  (assignments || []).forEach((a) => {
    if (a.user_id && a.task_id) (assignedByUser[a.user_id] ??= new Set()).add(a.task_id);
  });

  const submittedByUser: Record<string, Set<string>> = {};
  const approvedByUser: Record<string, Set<string>> = {};
  history.forEach((h) => {
    if (!h.changed_by || !h.task_id) return;
    const bucket = h.action === "submitted" ? submittedByUser : approvedByUser;
    (bucket[h.changed_by] ??= new Set()).add(h.task_id);
  });

  const counts: Record<string, number> = {};
  new Set([...Object.keys(submittedByUser), ...Object.keys(approvedByUser)]).forEach((uid) => {
    counts[uid] =
      countHandedOff(submittedByUser[uid] ?? new Set(), assignedByUser[uid] ?? new Set()) +
      (approvedByUser[uid]?.size ?? 0);
  });
  return counts;
}

/**
 * Submission and completed counts for a single loader — used by the loader dashboard.
 * Filtered by user, so it is light and never at risk of the 1000-row cap.
 */
export async function getLoaderStatsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ totalSubmissions: number; completed: number }> {
  const history = await fetchAll<{ task_id: string }>((from, to) =>
    supabase
      .from("task_history")
      .select("task_id")
      .eq("changed_by", userId)
      .eq("action", "submitted")
      .order("created_at", { ascending: false })
      .range(from, to),
  );

  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("task_id")
    .eq("user_id", userId);

  const submitted = new Set(history.map((h) => h.task_id));
  const assigned = new Set((assignments || []).map((a) => a.task_id));
  return { totalSubmissions: submitted.size, completed: countHandedOff(submitted, assigned) };
}
