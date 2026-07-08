import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { refreshPendingStatuses, type UploadWithUploader } from "@/lib/video-uploads";
import { UploadsBrowser } from "@/components/uploads/uploads-browser";

export const revalidate = 0;

export default async function AdminUploadsPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: uploads }, hierarchies, { data: completedTasks }] = await Promise.all([
    adminClient
      .from("video_uploads")
      .select("*, uploader:uploaded_by(full_name)")
      .order("created_at", { ascending: false }),
    getHierarchies(),
    adminClient
      .from("tasks")
      .select("id, board_id, class_id, subject_id, chapter_id, current_status, created_at, updated_at")
      .eq("current_status", "final_approved"),
  ]);

  // Count completed tasks per hierarchy node. Tasks store redundant ancestry IDs, so a single
  // query counting final_approved tasks counts every node in the chain: a board's count includes
  // every completed task under any of its classes, subjects, and chapters.
  const taskCounts: Record<string, number> = {};
  for (const t of completedTasks || []) {
    for (const id of [t.board_id, t.class_id, t.subject_id, t.chapter_id]) {
      taskCounts[id] = (taskCounts[id] || 0) + 1;
    }
  }

  // Build work-link map for completed tasks (latest proof_url per task).
  const taskIds = (completedTasks || []).map((t) => t.id);
  const { data: taskHistory } = taskIds.length > 0
    ? await adminClient
        .from("task_history")
        .select("task_id, proof_url, created_at")
        .in("task_id", taskIds)
        .not("proof_url", "is", null)
        .order("created_at", { ascending: false })
    : { data: [] };

  const taskWorkLinks: Record<string, string> = {};
  for (const h of taskHistory || []) {
    if (h.proof_url && !taskWorkLinks[h.task_id]) {
      taskWorkLinks[h.task_id] = h.proof_url;
    }
  }

  const rows = await refreshPendingStatuses((uploads || []) as UploadWithUploader[]);

  return (
    <>
      <Header title="Uploads" />
      <div className="max-w-[1920px] mx-auto">
        <section className="mb-4 mt-2">
          <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">All Uploads</h2>
          <p className="text-[#bbbbbb] text-sm">
            Videos uploaded across the platform. Navigate the hierarchy to see the videos attached to any level.
          </p>
        </section>

        <UploadsBrowser hierarchies={hierarchies} uploads={rows} currentUserId={user?.id ?? ""} isAdmin taskCounts={taskCounts} completedTasks={completedTasks || []} taskWorkLinks={taskWorkLinks} />
      </div>
    </>
  );
}
