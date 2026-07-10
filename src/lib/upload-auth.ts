import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether a user may publish videos/files: an admin, the dedicated Video Uploader, or a
 * Material Loader who is a Video Editor (the final stage that produces the finished material).
 * Shared by the Vimeo and S3 upload server actions so both enforce the same rule.
 */
export async function canUserUpload(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, sub_role")
    .eq("id", userId)
    .single();

  return (
    profile?.role === "admin" ||
    profile?.role === "uploader" ||
    (profile?.role === "loader" && profile?.sub_role === "video_editor")
  );
}
