import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical "completed" rule, defined once: the number of distinct tasks a loader
 * submitted that are no longer in their active assignments — i.e. the task passed QC,
 * advanced to the next stage, or was finalized ("submitted & handed off").
 *
 * The dashboard counts are computed in the database (see sql/aggregation-rpcs.sql); this
 * pure helper is still used by the loader-history page, which already has the full,
 * paginated history in memory and computes its headline count from it.
 */
export function countHandedOff(submitted: Set<string>, assigned: Set<string>): number {
  let n = 0;
  submitted.forEach((id) => {
    if (!assigned.has(id)) n++;
  });
  return n;
}

/**
 * Completed-task count for every user, keyed by user id. Used by the admin dashboard and
 * the admin user-management table so both show the same figure as each loader's own view.
 *
 * Aggregated in the DB via the `get_completed_task_counts` RPC, so it returns only one small
 * row per user and can never hit PostgREST's 1000-row cap. Loaders are credited for tasks
 * they submitted and handed off; QC users for the distinct tasks they approved.
 */
export async function getCompletedTaskCounts(
  supabase: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("get_completed_task_counts");
  if (error) {
    console.error("get_completed_task_counts RPC error:", error);
    return {};
  }
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { user_id: string; completed: number }) => {
    if (r.user_id) counts[r.user_id] = r.completed ?? 0;
  });
  return counts;
}

/**
 * Submission and completed counts for a single loader — used by the loader dashboard.
 * Aggregated in the DB via the `get_loader_stats` RPC.
 */
export async function getLoaderStatsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ totalSubmissions: number; completed: number }> {
  const { data, error } = await supabase.rpc("get_loader_stats", { p_user_id: userId });
  if (error) {
    console.error("get_loader_stats RPC error:", error);
    return { totalSubmissions: 0, completed: 0 };
  }
  const row = data?.[0] ?? { total_submissions: 0, completed: 0 };
  return { totalSubmissions: row.total_submissions ?? 0, completed: row.completed ?? 0 };
}
