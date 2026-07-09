import { createAdminClient } from "@/lib/supabase/admin";
import { getVimeoVideoInfo } from "@/lib/vimeo";

export type VideoUploadRow = {
  id: string;
  hierarchy_id: string;
  uploaded_by: string;
  vimeo_video_id: string;
  vimeo_link: string | null;
  title: string | null;
  description: string | null;
  status: string;
  duration: number | null;
  created_at: string;
};

/** A video_uploads row joined with the uploader's display name (uploader:uploaded_by(full_name)). */
export type UploadWithUploader = VideoUploadRow & { uploader: { full_name: string } | null };

/** A final-approved task, carrying the redundant ancestry IDs used to count/filter by level. */
export type CompletedTaskRow = {
  id: string;
  board_id: string;
  class_id: string;
  subject_id: string;
  chapter_id: string;
  current_status: string;
  created_at: string;
  updated_at: string;
};

export type UploadsBrowserData = {
  rows: UploadWithUploader[];
  taskCounts: Record<string, number>;
  completedTasks: CompletedTaskRow[];
  taskWorkLinks: Record<string, string>;
};

/**
 * Shared data for the "browse all uploads" view, used identically by the admin uploads page
 * and the uploader workspace so the two stay in lockstep:
 *  - `rows`          — every video_uploads row (with uploader name), statuses refreshed.
 *  - `completedTasks`— all final_approved tasks (with their board/class/subject/chapter IDs).
 *  - `taskCounts`    — completed-task count per hierarchy node (a board's count rolls up every
 *                      completed task beneath it, since tasks store the full ancestry).
 *  - `taskWorkLinks` — latest non-null task_history.proof_url per completed task.
 */
export async function getUploadsBrowserData(): Promise<UploadsBrowserData> {
  const adminClient = createAdminClient();

  const [{ data: uploads }, { data: completedTasks }] = await Promise.all([
    adminClient
      .from("video_uploads")
      .select("*, uploader:uploaded_by(full_name)")
      .order("created_at", { ascending: false }),
    adminClient
      .from("tasks")
      .select("id, board_id, class_id, subject_id, chapter_id, current_status, created_at, updated_at")
      .eq("current_status", "final_approved"),
  ]);

  const completed = (completedTasks || []) as CompletedTaskRow[];

  const taskCounts: Record<string, number> = {};
  for (const t of completed) {
    for (const id of [t.board_id, t.class_id, t.subject_id, t.chapter_id]) {
      taskCounts[id] = (taskCounts[id] || 0) + 1;
    }
  }

  const taskIds = completed.map((t) => t.id);
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

  const rows = (uploads || []) as UploadWithUploader[];

  return { rows, taskCounts, completedTasks: completed, taskWorkLinks };
}

/**
 * For any row still "uploading"/"processing", asks Vimeo for its real current status and
 * duration and persists the result — so "available" always means the video actually finished
 * transcoding, not just that the browser finished sending bytes. A Vimeo API hiccup on any one
 * row never blocks the others or the page render; that row just keeps its last-known status.
 */
export async function refreshPendingStatuses<T extends VideoUploadRow>(rows: T[]): Promise<T[]> {
  const pending = rows.filter((r) => r.status === "uploading" || r.status === "processing");
  if (pending.length === 0) return rows;

  const adminClient = createAdminClient();
  const updates = new Map<string, { status: string; duration: number | null }>();

  await Promise.allSettled(
    pending.map(async (row) => {
      try {
        const info = await getVimeoVideoInfo(row.vimeo_video_id);
        if (info.status !== row.status || info.duration !== row.duration) {
          updates.set(row.id, { status: info.status, duration: info.duration });
          await adminClient
            .from("video_uploads")
            .update({ status: info.status, duration: info.duration, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        }
      } catch (err) {
        console.error(`Failed to refresh Vimeo status for upload ${row.id}:`, err);
      }
    })
  );

  if (updates.size === 0) return rows;
  return rows.map((r) => (updates.has(r.id) ? { ...r, ...updates.get(r.id)! } : r));
}
