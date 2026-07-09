import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { getUploadsBrowserData } from "@/lib/video-uploads";
import { UploaderWorkspace } from "@/components/uploader/uploader-workspace";

export const revalidate = 0;

export default async function UploadVideoPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ rows, taskCounts, completedTasks, taskWorkLinks }, hierarchies, { data: profile }] = await Promise.all([
    getUploadsBrowserData(),
    getHierarchies(),
    adminClient.from("profiles").select("role").eq("id", user?.id).single(),
  ]);

  return (
    <>
      <Header title="Upload & Videos" />
      <div className="max-w-[1920px] mx-auto">
        <UploaderWorkspace
          hierarchies={hierarchies}
          uploads={rows}
          currentUserId={user?.id ?? ""}
          isAdmin={profile?.role === "admin"}
          taskCounts={taskCounts}
          completedTasks={completedTasks}
          taskWorkLinks={taskWorkLinks}
        />
      </div>
    </>
  );
}
