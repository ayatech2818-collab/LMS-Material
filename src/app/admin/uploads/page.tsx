import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { getUploadsBrowserData } from "@/lib/video-uploads";
import { UploadsBrowser } from "@/components/uploads/uploads-browser";

export const revalidate = 0;

export default async function AdminUploadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ rows, taskCounts, completedTasks, taskWorkLinks }, hierarchies] = await Promise.all([
    getUploadsBrowserData(),
    getHierarchies(),
  ]);

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

        <UploadsBrowser hierarchies={hierarchies} uploads={rows} currentUserId={user?.id ?? ""} isAdmin taskCounts={taskCounts} completedTasks={completedTasks || []} taskWorkLinks={taskWorkLinks} />
      </div>
    </>
  );
}
