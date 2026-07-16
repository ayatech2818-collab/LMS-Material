import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserUpload } from "@/lib/upload-auth";
import { s3Configured, buildObjectKey, presignPutUrl } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Step 1 of the upload: mint a presigned S3 PUT URL so the browser can send the file bytes
 * directly to S3, never through this server. Keeps the request body tiny (just JSON), which
 * avoids the platform's serverless request-body size cap that a proxied upload would hit.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!(await canUserUpload(user.id))) {
    return NextResponse.json({ error: "Forbidden: only a Video Editor (or an uploader/admin) can upload files." }, { status: 403 });
  }
  if (!s3Configured()) return NextResponse.json({ error: "S3 storage is not configured" }, { status: 500 });

  const { hierarchyId, fileName, contentType } = await req.json();
  if (typeof hierarchyId !== "string" || !hierarchyId || typeof fileName !== "string" || !fileName) {
    return NextResponse.json({ error: "Missing hierarchyId or fileName" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const key = buildObjectKey(hierarchyId, fileName);
  const resolvedContentType = (typeof contentType === "string" && contentType) || "application/octet-stream";

  try {
    const url = await presignPutUrl(key, resolvedContentType, 900);
    return NextResponse.json({ id, key, url, contentType: resolvedContentType });
  } catch (err) {
    console.error("presignPutUrl failed:", err);
    return NextResponse.json({ error: "Could not create upload URL" }, { status: 502 });
  }
}
