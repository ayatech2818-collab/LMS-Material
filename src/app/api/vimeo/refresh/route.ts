import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPendingStatuses } from "@/lib/video-uploads";

export async function GET() {
  try {
    const adminClient = createAdminClient();
    const { data: uploads } = await adminClient
      .from("video_uploads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!uploads || uploads.length === 0) {
      return Response.json({ refreshed: 0 });
    }

    await refreshPendingStatuses(uploads);
    return Response.json({ refreshed: uploads.filter((r) => r.status === "uploading" || r.status === "processing").length });
  } catch (err) {
    console.error("Vimeo refresh error:", err);
    return Response.json({ error: "Refresh failed" }, { status: 500 });
  }
}
