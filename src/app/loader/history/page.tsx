import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HistoryBoard } from "./history-board";

export const revalidate = 0;

export default async function LoaderHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, sub_role")
    .eq("id", user?.id)
    .single();

  // 1. All task assignments for this loader (includes completed)
  const { data: assignments } = await adminClient
    .from("task_assignments")
    .select(`
      task_id, stage,
      tasks (
        id, current_status, created_at, updated_at,
        title,
        board:board_id(name),
        class:class_id(name),
        subject:subject_id(name),
        chapter:chapter_id(name)
      )
    `)
    .eq("user_id", user?.id);

  // Deduplicate tasks
  const taskMap = new Map<string, any>();
  (assignments || []).forEach((a: any) => {
    const t = a.tasks;
    if (t && !taskMap.has(t.id)) taskMap.set(t.id, t);
  });
  const allTasks = Array.from(taskMap.values());

  // 2. Full history for this user's tasks (all actions by everyone)
  const taskIds = allTasks.map((t: any) => t.id);
  let historyRecords: any[] = [];
  if (taskIds.length > 0) {
    let offset = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: batch } = await adminClient
        .from("task_history")
        .select("id, task_id, action, notes, proof_url, new_status, previous_status, created_at, changed_by")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (!batch || batch.length === 0) break;
      historyRecords = historyRecords.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  // 3. Compute performance stats
  const completedTasks = allTasks.filter((t: any) => t.current_status === "final_approved");
  const activeTasks = allTasks.filter((t: any) => t.current_status !== "final_approved");
  const mySubmissions = historyRecords.filter((h: any) => h.changed_by === user?.id && h.action === "submitted");
  const approvals = historyRecords.filter((h: any) =>
    h.action === "qc_approved_script" || h.action === "qc_approved_video"
  );
  const rejections = historyRecords.filter((h: any) =>
    h.action === "qc_rejected_script" || h.action === "qc_rejected_video"
  );

  const totalReviewed = approvals.length + rejections.length;
  const approvalRate = totalReviewed > 0 ? Math.round((approvals.length / totalReviewed) * 100) : 0;

  // Average time to complete (only for final_approved tasks)
  const finalApprovalDates: number[] = [];
  completedTasks.forEach((task: any) => {
    const finalEntry = historyRecords.find(
      (h: any) => h.task_id === task.id && h.action === "qc_approved_video"
    );
    if (finalEntry) {
      const created = new Date(task.created_at).getTime();
      const completed = new Date(finalEntry.created_at).getTime();
      const days = (completed - created) / (1000 * 60 * 60 * 24);
      if (days > 0) finalApprovalDates.push(days);
    }
  });
  const avgCompletionDays = finalApprovalDates.length > 0
    ? Math.round((finalApprovalDates.reduce((a, b) => a + b, 0) / finalApprovalDates.length) * 10) / 10
    : 0;

  // Build proof_url map for ALL tasks (latest submission proof)
  const proofMap: Record<string, string | null> = {};
  allTasks.forEach((t: any) => {
    const submission = historyRecords.find(
      (h: any) => h.task_id === t.id && h.action === "submitted" && h.changed_by === user?.id
    );
    proofMap[t.id] = submission?.proof_url ?? null;
  });

  // Build per-task timeline from history records
  const taskTimelines: Record<string, any[]> = {};
  allTasks.forEach((t: any) => {
    taskTimelines[t.id] = historyRecords
      .filter((h: any) => h.task_id === t.id)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

  const stats = {
    totalTasks: allTasks.length,
    totalCompleted: completedTasks.length,
    totalActive: activeTasks.length,
    totalSubmissions: mySubmissions.length,
    approvals: approvals.length,
    rejections: rejections.length,
    approvalRate,
    avgCompletionDays,
  };

  return (
    <>
      <Header title="My Performance" />
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">
        <section>
          <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">
            Performance & History
          </h2>
          <p className="text-[#bbbbbb] text-sm">
            Track your work, approval rates, and task progress.
          </p>
        </section>

        <HistoryBoard
          allTasks={allTasks}
          stats={stats}
          proofMap={proofMap}
          taskTimelines={taskTimelines}
          subRole={profile?.sub_role || null}
          userName={profile?.full_name || "Loader"}
        />
      </div>
    </>
  );
}
