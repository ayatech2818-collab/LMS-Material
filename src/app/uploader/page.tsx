import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Upload, Film, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { getBreadcrumb, type HierarchyNode } from "@/lib/hierarchy";
import { DashboardVideoActions } from "@/components/uploads/dashboard-video-actions";

export const revalidate = 0;

export default async function UploaderDashboard() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Platform-wide upload stats (every uploader + loader-published video).
  const { count: totalUploads } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true });

  const { count: processingCount } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true })
    .in("status", ["uploading", "processing"]);

  const { count: availableCount } = await adminClient
    .from("video_uploads")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");

  // Platform-wide completed task count (all final_approved tasks).
  const { count: completedTasksCount } = await adminClient
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("current_status", "final_approved");

  // Recent uploads across everyone — no resource embedding joins to avoid
  // silent query failures when FK relationships are unresolvable.
  const { data: recentUploads } = await adminClient
    .from("video_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const uploadIds = (recentUploads || []).map((u) => u.uploaded_by);
  const [hierarchies, { data: uploaderProfiles }] = await Promise.all([
    getHierarchies(),
    uploadIds.length > 0
      ? adminClient.from("profiles").select("id, full_name").in("id", uploadIds)
      : { data: [] },
  ]);

  const hierarchyMap = new Map(
    (hierarchies || []).map((h: HierarchyNode) => [h.id, h.name])
  );
  const uploaderMap = new Map(
    (uploaderProfiles || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
  );

  const recent = recentUploads || [];
  const isAdmin = profile?.role === "admin";

  return (
    <>
      <Header title="Uploader Dashboard" />
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">

        {/* Welcome Banner */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
          <div className="m-stripe mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="text-[#7e7e7e] text-xs tracking-[2px] uppercase mb-2">Welcome back</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-[1px] uppercase mb-3">
                {profile?.full_name}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 border border-[#0066b1] text-[#0066b1] text-xs font-bold tracking-[1px] uppercase">
                  Video Uploader
                </span>
              </div>
            </div>
            <Link
              href="/uploader/upload"
              className="btn-m flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Video
            </Link>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Total Uploads</h3>
              <div className="p-2 bg-[#0066b1]/10 border border-[#0066b1]/20">
                <Film className="h-5 w-5 text-[#0066b1]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-white leading-none">{totalUploads || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Processing</h3>
              <div className="p-2 bg-[#f4b400]/10 border border-[#f4b400]/20">
                <Loader2 className="h-5 w-5 text-[#f4b400]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-[#f4b400] leading-none">{processingCount || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Available</h3>
              <div className="p-2 bg-[#0fa336]/10 border border-[#0fa336]/20">
                <Upload className="h-5 w-5 text-[#0fa336]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-[#0fa336] leading-none">{availableCount || 0}</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase">Completed Tasks</h3>
              <div className="p-2 bg-[#0fa336]/10 border border-[#0fa336]/20">
                <CheckCircle2 className="h-5 w-5 text-[#0fa336]" />
              </div>
            </div>
            <p className="text-[40px] font-light text-[#0fa336] leading-none">{completedTasksCount || 0}</p>
          </div>
        </section>

        {/* Recent Uploads */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-[#3c3c3c] flex justify-between items-center bg-[#0d0d0d]">
            <h3 className="text-xs font-bold text-white tracking-[2px] uppercase">Recent Uploads</h3>
            <Link href="/uploader/upload" className="text-xs font-bold text-[#0066b1] hover:text-[#1c69d4] tracking-[1px] uppercase transition-colors">
              View All →
            </Link>
          </div>
          <div>
            {recent.length > 0 ? (
              <ul className="divide-y divide-[#3c3c3c]">
                {recent.map((upload) => (
                  <li key={upload.id} className="px-5 md:px-6 py-4 hover:bg-[#262626] transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#e6e6e6] text-sm mb-1 truncate">{upload.title || "Untitled"}</p>
                      <p className="text-xs text-[#7e7e7e]">
                        {hierarchyMap.get(upload.hierarchy_id) || "Unknown"} • by{" "}
                        <span className="text-[#0066b1]">{uploaderMap.get(upload.uploaded_by) || "Unknown"}</span> •{" "}
                        <span className={`uppercase font-bold ${
                          upload.status === "available" ? "text-[#0fa336]" :
                          upload.status === "error" ? "text-[#e22718]" :
                          "text-[#f4b400]"
                        }`}>{upload.status}</span>
                      </p>
                    </div>
                    <DashboardVideoActions
                      upload={upload}
                      hierarchyLabel={getBreadcrumb(upload.hierarchy_id, hierarchies)}
                      currentUserId={user?.id ?? ""}
                      isAdmin={isAdmin}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center text-[#7e7e7e]">
                <Film className="h-10 w-10 mx-auto mb-4 opacity-40" />
                <p className="text-sm">No uploads yet. Start by uploading your first video!</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </>
  );
}
