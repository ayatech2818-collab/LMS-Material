import { Header } from "@/components/shared/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { refreshPendingStatuses, type UploadWithUploader } from "@/lib/video-uploads";
import { UploaderWorkspace } from "@/components/uploader/uploader-workspace";

export const revalidate = 0;

export default async function UploadVideoPage() {
  const adminClient = createAdminClient();

  const [{ data: uploads }, hierarchies] = await Promise.all([
    adminClient
      .from("video_uploads")
      .select("*, uploader:uploaded_by(full_name)")
      .order("created_at", { ascending: false }),
    getHierarchies(),
  ]);

  const rows = await refreshPendingStatuses((uploads || []) as UploadWithUploader[]);

  return (
    <>
      <Header title="Upload & Videos" />
      <div className="max-w-[1920px] mx-auto">
        <UploaderWorkspace hierarchies={hierarchies} uploads={rows} />
      </div>
    </>
  );
}
