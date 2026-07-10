"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canUserUpload } from "@/lib/upload-auth";
import { s3Configured, buildObjectKey, presignPutUrl, publicObjectUrl, deleteObject } from "@/lib/s3";
import { revalidatePath } from "next/cache";

function revalidateUploads() {
  revalidatePath("/uploader");
  revalidatePath("/uploader/upload");
  revalidatePath("/admin/uploads");
  revalidatePath("/loader");
}

/**
 * Initialize an S3 file upload: create the DB record and return a presigned PUT URL for the
 * browser to upload the file directly. Mirrors initializeVimeoUpload. hierarchyId can point to
 * a board, class, subject, or chapter row — attachment is level-agnostic.
 */
export async function initializeFileUpload(
  hierarchyId: string,
  fileName: string,
  contentType: string,
  fileSize: number,
  title?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!(await canUserUpload(user.id))) {
    return { error: "Forbidden: only a Video Editor (or an uploader/admin) can upload files." };
  }

  if (!s3Configured()) return { error: "S3 storage is not configured" };

  const type = contentType || "application/octet-stream";

  try {
    const key = buildObjectKey(hierarchyId, fileName);
    const uploadUrl = await presignPutUrl(key, type);
    const fileUrl = publicObjectUrl(key);

    const adminClient = createAdminClient();
    const { data: upload, error: dbError } = await adminClient
      .from("file_uploads")
      .insert({
        hierarchy_id: hierarchyId,
        uploaded_by: user.id,
        s3_key: key,
        file_url: fileUrl,
        file_name: fileName,
        content_type: type,
        file_size: fileSize,
        title: title || fileName,
        status: "uploading",
      })
      .select()
      .single();

    if (dbError) {
      console.error("file_uploads insert error:", dbError);
      return { error: dbError.message };
    }

    return { success: true, uploadUrl, uploadId: upload.id, fileUrl, contentType: type };
  } catch (err: unknown) {
    console.error("initializeFileUpload error:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Finalize a file upload: mark the record "available". */
export async function finalizeFileUpload(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("file_uploads")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };
  revalidateUploads();
  return { success: true };
}

/** Mark a file upload as failed. */
export async function markFileUploadError(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("file_uploads")
    .update({ status: "error", updated_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };
  return { success: true };
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

  revalidateUploads();
  return { success: true };
}
