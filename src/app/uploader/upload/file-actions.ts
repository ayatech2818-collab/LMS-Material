"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteObject, presignGetUrl } from "@/lib/s3";
import { revalidatePath } from "next/cache";

// A copied file link should be directly usable, so we hand out the longest-lived presigned GET
// URL S3 allows (7 days). "Open File" still goes through /api/files/[id], which re-signs on
// every click and therefore never expires.
const COPY_LINK_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Returns a fresh, directly-openable presigned S3 URL for a file (for the Copy Link button).
 * Any signed-in user may fetch it — file links are shareable across the platform, matching how
 * /api/files/[id] serves them publicly.
 */
export async function getFilePresignedUrl(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("file_uploads")
    .select("s3_key")
    .eq("id", uploadId)
    .maybeSingle();
  if (!data?.s3_key) return { error: "File not found" };

  try {
    const url = await presignGetUrl(data.s3_key, COPY_LINK_EXPIRY_SECONDS);
    return { url };
  } catch (err) {
    console.error("getFilePresignedUrl error:", err);
    return { error: err instanceof Error ? err.message : "Could not generate link" };
  }
}

/**
 * Delete a file upload. Allowed for the uploader who owns it or an admin. Removes the object
 * from S3 (best-effort) and then deletes the DB record. Mirrors deleteVideoUpload.
 */
export async function deleteFileUpload(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { data: upload } = await adminClient
    .from("file_uploads")
    .select("uploaded_by, s3_key")
    .eq("id", uploadId)
    .single();
  if (!upload) return { error: "File not found" };

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = upload.uploaded_by === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: "Forbidden" };

  if (upload.s3_key) {
    try {
      await deleteObject(upload.s3_key);
    } catch (err) {
      console.error(`S3 delete failed for ${upload.s3_key} (continuing):`, err);
    }
  }

  const { error } = await adminClient.from("file_uploads").delete().eq("id", uploadId);
  if (error) return { error: error.message };

  revalidatePath("/uploader");
  revalidatePath("/uploader/upload");
  revalidatePath("/admin/uploads");
  revalidatePath("/loader");
  return { success: true };
}
