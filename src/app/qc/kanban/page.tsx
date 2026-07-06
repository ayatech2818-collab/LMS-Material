import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QCBoard } from "./qc-board";

export const revalidate = 0;

export default async function QCKanbanPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Pending Review tasks with full hierarchy and assignment details
  const { data: pendingTasks } = await adminSupabase
    .from("tasks")
    .select(`
      *,
      board:board_id(name),
      class:class_id(name),
      subject:subject_id(name),
      chapter:hierarchies!tasks_chapter_id_fkey(name)
    `)
    .in("current_status", ["script_generated", "video_edited"]);

  // Fetch latest submission (proof_url, notes, submitted_at) from task_history for each pending task
  const pendingTaskIds = (pendingTasks || []).map((t: any) => t.id);
  let submissionMap: Record<string, { proof_url: string | null; notes: string | null; submitted_at: string | null }> = {};
  if (pendingTaskIds.length > 0) {
    const { data: submissions } = await adminSupabase
      .from("task_history")
      .select("task_id, proof_url, notes, created_at")
      .in("task_id", pendingTaskIds)
      .eq("action", "submitted")
      .order("created_at", { ascending: false });

    // Keep only the latest submission per task
    (submissions || []).forEach((s: any) => {
      if (!submissionMap[s.task_id]) {
        submissionMap[s.task_id] = {
          proof_url: s.proof_url,
          notes: s.notes,
          submitted_at: s.created_at,
        };
      }
    });
  }

  // Merge submission data into pending tasks
  const enrichedPendingTasks = (pendingTasks || []).map((t: any) => ({
    ...t,
    proof_url: submissionMap[t.id]?.proof_url ?? null,
    notes: submissionMap[t.id]?.notes ?? null,
    submitted_at: submissionMap[t.id]?.submitted_at ?? null,
  }));

  // 2. This QC user's review history — include full task hierarchy so modal shows all fields
  //    Fetch in batches to avoid Supabase default 1000-row limit
  let myHistory: any[] = [];
  let historyOffset = 0;
  const HISTORY_PAGE_SIZE = 1000;
  while (true) {
    const { data: batch, error: histErr } = await adminSupabase
      .from("task_history")
      .select(`
        id, action, notes, proof_url, created_at,
        tasks (
          id, title, current_status,
          board:board_id(name),
          class:class_id(name),
          subject:subject_id(name),
          chapter:hierarchies!tasks_chapter_id_fkey(name)
        )
      `)
      .eq("changed_by", user?.id)
      .in("action", ["qc_approved_script", "qc_approved_video", "qc_rejected_script", "qc_rejected_video"])
      .order("created_at", { ascending: false })
      .range(historyOffset, historyOffset + HISTORY_PAGE_SIZE - 1);
    if (histErr) { console.error("QC history fetch error:", histErr); break; }
    if (!batch || batch.length === 0) break;
    myHistory = myHistory.concat(batch);
    if (batch.length < HISTORY_PAGE_SIZE) break;
    historyOffset += HISTORY_PAGE_SIZE;
  }

  // Categorize historical tasks (deduplicated per category — latest action per task per type)
  const approvedTasksRaw: any[] = [];
  const rejectedTasksRaw: any[] = [];
  const approvedTaskIds: Record<string, boolean> = {};
  const rejectedTaskIds: Record<string, boolean> = {};

  (myHistory || []).forEach((history: any) => {
    if (!history.tasks) return;

    if (history.action.includes("approved") && !approvedTaskIds[history.tasks.id]) {
      approvedTaskIds[history.tasks.id] = true;
      approvedTasksRaw.push(history);
    } else if (history.action.includes("rejected") && !rejectedTaskIds[history.tasks.id]) {
      rejectedTaskIds[history.tasks.id] = true;
      rejectedTasksRaw.push(history);
    }
  });

  // 3. Fetch the loader's submission proof_url for every approved/rejected task
  //    (QC approval records don't carry a proof_url — only loader submission records do)
  const historyTaskIds = [...approvedTasksRaw, ...rejectedTasksRaw]
    .map((h: any) => h.tasks?.id)
    .filter(Boolean) as string[];

  let historyProofMap: Record<string, string | null> = {};
  if (historyTaskIds.length > 0) {
    const { data: historySubmissions } = await adminSupabase
      .from("task_history")
      .select("task_id, proof_url, created_at")
      .in("task_id", historyTaskIds)
      .eq("action", "submitted")
      .order("created_at", { ascending: false });

    (historySubmissions || []).forEach((s: any) => {
      // Keep the most recent submission per task
      if (!historyProofMap[s.task_id]) {
        historyProofMap[s.task_id] = s.proof_url;
      }
    });
  }

  // Attach the loader's proof_url to each history record
  const approvedTasks = approvedTasksRaw.map((h: any) => ({
    ...h,
    proof_url: h.proof_url || historyProofMap[h.tasks?.id] || null,
  }));
  const rejectedTasks = rejectedTasksRaw.map((h: any) => ({
    ...h,
    proof_url: h.proof_url || historyProofMap[h.tasks?.id] || null,
  }));

  return (
    <>
      <Header title="QC Reviews" />
      <div className="max-w-[1920px] mx-auto w-full flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
        <section className="shrink-0 mb-3 mt-1">
          <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">Kanban Queue</h2>
          <p className="text-[#bbbbbb] text-sm">Manage your pipeline of approvals.</p>
        </section>

        <div className="flex-1 min-h-0 overflow-hidden">
          <QCBoard
            userId={user!.id}
            pendingTasks={enrichedPendingTasks}
            approvedTasks={approvedTasks}
            rejectedTasks={rejectedTasks}
          />
        </div>
      </div>
    </>
  );
}
