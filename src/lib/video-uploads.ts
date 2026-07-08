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
