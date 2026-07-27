import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { presignGetUrl } from "@/lib/s3";

export const runtime = "nodejs";

export default async function ViewFilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const adminClient = createAdminClient();
  const { data: file, error } = await adminClient
    .from("file_uploads")
    .select("s3_key, file_name, content_type, title")
    .eq("id", id)
    .maybeSingle();

  if (error || !file || !file.s3_key) {
    return notFound();
  }

  // Generate a short-lived S3 URL with inline disposition
  const s3Url = await presignGetUrl(file.s3_key, 3600, true);

  const isPdf = file.content_type === "application/pdf" || file.file_name?.toLowerCase().endsWith(".pdf");
  const isImage = file.content_type?.startsWith("image/") || file.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  let viewerUrl = s3Url;
  
  if (isPdf) {
    viewerUrl = `${s3Url}#toolbar=0`;
  } else if (!isImage) {
    // For Office docs (docx, pptx, xlsx), use Google Docs Viewer
    viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(s3Url)}&embedded=true`;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <iframe 
        src={viewerUrl} 
        style={{ width: "100%", height: "100%", border: "none" }}
        title={file.title || file.file_name || "Document Viewer"}
      />
    </div>
  );
}
