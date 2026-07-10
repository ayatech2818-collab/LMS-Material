"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canUserUpload } from "@/lib/upload-auth";
import { revalidatePath } from "next/cache";

const VIMEO_API_BASE = "https://api.vimeo.com";

/**
 * Initialize a Vimeo TUS upload.
 * Creates the video object on Vimeo and returns the upload_link for direct browser upload.
 * hierarchyId can point to a board, class, subject, or chapter row — attachment is level-agnostic.
 */
export async function initializeVimeoUpload(
  hierarchyId: string,
  fileSize: number,
  title: string,
  description?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Only the dedicated Video Uploader, an admin, or a Material Loader who is a Video Editor
  // (the final stage that actually produces the finished video) may publish to Vimeo.
  if (!(await canUserUpload(user.id))) {
    return { error: "Forbidden: only a Video Editor (or an uploader/admin) can upload videos." };
  }

  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) return { error: "Vimeo access token not configured" };

  try {
    // 1. Create video on Vimeo with TUS approach
    const response = await fetch(`${VIMEO_API_BASE}/me/videos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.vimeo.*+json;version=3.4",
      },
      body: JSON.stringify({
        upload: {
          approach: "tus",
          size: fileSize,
        },
        name: title,
        description: description || "",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Vimeo API error:", response.status, errBody);
      return { error: `Vimeo API error: ${response.status}` };
    }

    const data = await response.json();
    const uploadLink = data.upload?.upload_link;
    const vimeoUri = data.uri; // e.g. "/videos/123456789"
    const vimeoLink = data.link; // e.g. "https://vimeo.com/123456789"
    const vimeoVideoId = vimeoUri?.split("/").pop() || "";

    if (!uploadLink) {
      return { error: "Vimeo did not return an upload link" };
    }

    // 2. Save record in database
    const adminClient = createAdminClient();
    const { data: upload, error: dbError } = await adminClient
      .from("video_uploads")
      .insert({
        hierarchy_id: hierarchyId,
        uploaded_by: user.id,
        vimeo_video_id: vimeoVideoId,
        vimeo_uri: vimeoUri,
        vimeo_link: vimeoLink,
        title,
        description: description || null,
        file_size: fileSize,
        status: "uploading",
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return { error: dbError.message };
    }

    return {
      success: true,
      uploadLink,
      uploadId: upload.id,
      vimeoVideoId,
      vimeoLink,
    };
  } catch (err: unknown) {
    console.error("initializeVimeoUpload error:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Finalize an upload: mark the database record as "processing".
 */
export async function finalizeUpload(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("video_uploads")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/uploader");
  revalidatePath("/uploader/upload");
  revalidatePath("/admin/uploads");
  return { success: true };
}

/**
 * Mark an upload as failed.
 */
export async function markUploadError(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("video_uploads")
    .update({ status: "error", updated_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Delete an upload. Allowed for the uploader who owns it or an admin. Removes the video from
 * Vimeo (best-effort — a Vimeo hiccup or missing delete scope must not strand the DB row) and
 * then deletes the database record so it disappears from every uploads view.
 */
export async function deleteVideoUpload(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { data: upload } = await adminClient
    .from("video_uploads")
    .select("uploaded_by, vimeo_video_id")
    .eq("id", uploadId)
    .single();
  if (!upload) return { error: "Upload not found" };

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = upload.uploaded_by === user.id;
  const isAdmin = profile?.role === "admin";
  if (!isOwner && !isAdmin) return { error: "Forbidden" };

  // Best-effort removal from Vimeo.
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (token && upload.vimeo_video_id) {
    try {
      await fetch(`${VIMEO_API_BASE}/videos/${upload.vimeo_video_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.error(`Vimeo delete failed for ${upload.vimeo_video_id} (continuing):`, err);
    }
  }

  const { error } = await adminClient.from("video_uploads").delete().eq("id", uploadId);
  if (error) return { error: error.message };

  revalidatePath("/uploader");
  revalidatePath("/uploader/upload");
  revalidatePath("/admin/uploads");
  revalidatePath("/loader");
  return { success: true };
}
