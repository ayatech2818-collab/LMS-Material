import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoaderBoard, type LoaderTask } from "@/components/loader/loader-board";
import { formatSubRole } from "@/lib/utils";

export const revalidate = 0;

export default async function LoaderDashboardPage() {
  // Use the session client only for getting the current user's identity
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use adminClient for all data queries to bypass RLS
  const adminClient = createAdminClient();

  // Fetch Loader Profile
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  // Find all tasks currently assigned to this loader
  const { data: assignments, error: assignError } = await adminClient
    .from("task_assignments")
    .select(`
      task_id, stage,
      tasks (
        id, current_status, revision_target_status, created_at,
        title,
        board:board_id(name),
        subject:subject_id(name),
        chapter:chapter_id(name)
      )
    `)
    .eq("user_id", user?.id);

  if (assignError) {
    console.error("Loader assignments query error:", assignError);
  }

  // Build a deduplicated list of currently-assigned tasks
  const allTasksMap = new Map<string, LoaderTask>();
  (assignments || []).forEach((a) => {
    const t = a.tasks as unknown as LoaderTask | null;
    if (!t) return;
    if (!allTasksMap.has(t.id)) {
      allTasksMap.set(t.id, t);
    }
  });
  const allTasks = Array.from(allTasksMap.values());

  // Count total submissions this loader ever made (for an accurate "total work done" stat)
  const { count: totalSubmissions } = await adminClient
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .eq("action", "submitted");

  // Stats
  // "Total Assigned" = active pipeline tasks only (exclude final_approved which are done)
  const totalAssigned = allTasks.filter((t) => t.current_status !== "final_approved").length;
  const revisionsCount = allTasks.filter((t) => t.current_status === "needs_revision").length;
  const completedCount = totalSubmissions || 0;

  return (
    <>
      <Header title="My Workspace" />
      <div className="max-w-[1920px] mx-auto space-y-8">

        {/* Personalized Header Section */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-ps-blue/5 p-8 rounded-[24px] border border-ps-blue/20">
          <div>
            <h2 className="text-3xl font-light text-display-ink mb-2">
              Welcome back, <span className="font-semibold text-ps-blue">{profile?.full_name}</span>
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-ps-blue/10 text-ps-blue rounded-full text-sm font-semibold tracking-wide">
                Material Loader
              </span>
              <span className="text-body-gray font-medium">
                {formatSubRole(profile?.sub_role)}
              </span>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <h3 className="text-body-gray text-base mb-1">Total Assigned</h3>
            <p className="text-[36px] font-light text-display-ink">{totalAssigned}</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <h3 className="text-body-gray text-base mb-1">Pending Revisions</h3>
            <p className="text-[36px] font-light text-warning-red">{revisionsCount}</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#f3f3f3] shadow-[0_5px_9px_0_rgba(0,0,0,0.05)]">
            <h3 className="text-body-gray text-base mb-1">Total Submissions</h3>
            <p className="text-[36px] font-light text-[#2e7d32]">{completedCount}</p>
          </div>
        </section>

        {/* Drag-and-Drop Mini Kanban */}
        <section>
          <h2 className="text-2xl font-light text-display-ink mb-4">Task Board</h2>
          <LoaderBoard
            tasks={allTasks}
            userId={user?.id ?? ""}
            userName={profile?.full_name || "Unknown"}
            subRole={profile?.sub_role || null}
          />
        </section>
      </div>
    </>
  );
}
