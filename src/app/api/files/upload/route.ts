import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserUpload } from "@/lib/upload-auth";
import { s3Configured, buildObjectKey, putObject } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Server-side file upload to S3. The browser POSTs the file to us (same-origin, so no bucket
 * CORS is needed); we validate the uploader, store the object in the private bucket, and record
 * it in file_uploads. The file is then served via the signed-redirect route (/api/files/[id]),
 * so the bucket never needs public access.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!(await canUserUpload(user.id))) {
    return NextResponse.json({ error: "Forbidden: only a Video Editor (or an uploader/admin) can upload files." }, { status: 403 });
  }
  if (!s3Configured()) return NextResponse.json({ error: "S3 storage is not configured" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file");
  const hierarchyId = form.get("hierarchyId");
  const title = form.get("title");

  if (!(file instanceof File) || typeof hierarchyId !== "string" || !hierarchyId) {
    return NextResponse.json({ error: "Missing file or destination" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const key = buildObjectKey(hierarchyId, file.name);
  const contentType = file.type || "application/octet-stream";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await putObject(key, buffer, contentType);
  } catch (err) {
    console.error("S3 putObject failed:", err);
    return NextResponse.json({ error: "Upload to storage failed" }, { status: 502 });
  }

  const adminClient = createAdminClient();
  const fileUrl = `/api/files/${id}`;
  const { error } = await adminClient.from("file_uploads").insert({
    id,
    hierarchy_id: hierarchyId,
    uploaded_by: user.id,
    s3_key: key,
    file_url: fileUrl,
    file_name: file.name,
    content_type: contentType,
    file_size: file.size,
    title: (typeof title === "string" && title) || file.name,
    status: "available",
  });

  if (error) {
    console.error("file_uploads insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/uploader");
  revalidatePath("/uploader/upload");
  revalidatePath("/admin/uploads");
  revalidatePath("/loader");

  return NextResponse.json({ id, fileUrl });
}
