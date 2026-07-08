import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { refreshPendingStatuses, type UploadWithUploader } from "@/lib/video-uploads";
import { UploaderWorkspace } from "@/components/uploader/uploader-workspace";

export const revalidate = 0;

export default async function UploadVideoPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: uploads }, hierarchies, { data: profile }] = await Promise.all([
    adminClient
      .from("video_uploads")
      .select("*, uploader:uploaded_by(full_name)")
      .order("created_at", { ascending: false }),
    getHierarchies(),
    adminClient.from("profiles").select("role").eq("id", user?.id).single(),
  ]);

  const rows = await refreshPendingStatuses((uploads || []) as UploadWithUploader[]);

  return (
    <>
      <Header title="Upload & Videos" />
      <div className="max-w-[1920px] mx-auto">
        <UploaderWorkspace
          hierarchies={hierarchies}
          uploads={rows}
          currentUserId={user?.id ?? ""}
          isAdmin={profile?.role === "admin"}
        />
      </div>
    </>
  );
}
