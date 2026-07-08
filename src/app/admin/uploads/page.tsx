import { Header } from "@/components/shared/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { refreshPendingStatuses, type UploadWithUploader } from "@/lib/video-uploads";
import { UploadsBrowser } from "@/components/uploads/uploads-browser";

export const revalidate = 0;

export default async function AdminUploadsPage() {
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
      <Header title="Uploads" />
      <div className="max-w-[1920px] mx-auto">
        <section className="mb-4 mt-2">
          <h2 className="text-xs font-bold text-[#7e7e7e] tracking-[3px] uppercase mb-1">All Uploads</h2>
          <p className="text-[#bbbbbb] text-sm">
            Videos uploaded across the platform. Navigate the hierarchy to see the videos attached to any level.
          </p>
        </section>

        <UploadsBrowser hierarchies={hierarchies} uploads={rows} />
      </div>
    </>
  );
}
