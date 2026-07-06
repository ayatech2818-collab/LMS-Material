"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VIMEO_API_BASE = "https://api.vimeo.com";

/**
 * Initialize a Vimeo TUS upload.
 * Creates the video object on Vimeo and returns the upload_link for direct browser upload.
 */
export async function initializeVimeoUpload(
  chapterId: string,
  fileSize: number,
  title: string,
  description?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

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
        chapter_id: chapterId,
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
 * Finalize an upload: mark the database record as "available".
 */
export async function finalizeUpload(uploadId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("video_uploads")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/uploader");
  revalidatePath("/uploader/uploads");
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
