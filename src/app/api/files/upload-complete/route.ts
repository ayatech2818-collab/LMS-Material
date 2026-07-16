import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserUpload } from "@/lib/upload-auth";

export const runtime = "nodejs";

/**
 * Step 2 of the upload: the browser has already PUT the file straight to S3 (see
 * /api/files/upload-url); this just records the finished object in file_uploads.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!(await canUserUpload(user.id))) {
    return NextResponse.json({ error: "Forbidden: only a Video Editor (or an uploader/admin) can upload files." }, { status: 403 });
  }

  const { id, hierarchyId, s3Key, fileName, contentType, fileSize, title } = await req.json();
  if (
    typeof id !== "string" || !id ||
    typeof hierarchyId !== "string" || !hierarchyId ||
    typeof s3Key !== "string" || !s3Key
  ) {
    return NextResponse.json({ error: "Missing id, hierarchyId, or s3Key" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const fileUrl = `/api/files/${id}`;
  const { error } = await adminClient.from("file_uploads").insert({
    id,
    hierarchy_id: hierarchyId,
    uploaded_by: user.id,
    s3_key: s3Key,
    file_url: fileUrl,
    file_name: (typeof fileName === "string" && fileName) || s3Key,
    content_type: (typeof contentType === "string" && contentType) || "application/octet-stream",
    file_size: typeof fileSize === "number" ? fileSize : null,
    title: (typeof title === "string" && title) || fileName || s3Key,
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
