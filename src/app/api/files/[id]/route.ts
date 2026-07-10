import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { presignGetUrl } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Permanent, shareable link for an uploaded file. The bucket is private, so this looks the file
 * up, mints a fresh short-lived presigned GET URL, and redirects to it. The app URL never
 * expires; the signed S3 URL it points to is generated fresh on every request.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("file_uploads")
    .select("s3_key")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`/api/files/${id} lookup error:`, error);
    return new NextResponse(`File lookup error: ${error.message}`, { status: 500 });
  }
  if (!data) {
    console.error(`/api/files/${id}: no file_uploads row with this id`);
    return new NextResponse("File not found", { status: 404 });
  }
  if (!data.s3_key) {
    console.error(`/api/files/${id}: row exists but s3_key is empty`);
    return new NextResponse("File has no stored object", { status: 404 });
  }

  try {
    const url = await presignGetUrl(data.s3_key);
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error("presignGetUrl failed:", err);
    return new NextResponse("Could not generate file link", { status: 502 });
  }
}
