import { Header } from "@/components/shared/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoaderBoard, type LoaderTask } from "@/components/loader/loader-board";
import { formatSubRole } from "@/lib/utils";

export const revalidate = 0;

export default async function LoaderDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

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

  const allTasksMap = new Map<string, LoaderTask>();
  (assignments || []).forEach((a) => {
    const t = a.tasks as unknown as LoaderTask | null;
    if (!t) return;
    if (!allTasksMap.has(t.id)) {
      allTasksMap.set(t.id, t);
    }
  });
  const allTasks = Array.from(allTasksMap.values());

  const { count: totalSubmissions } = await adminClient
    .from("task_history")
    .select("*", { count: "exact", head: true })
    .eq("changed_by", user?.id)
    .eq("action", "submitted");

  const totalAssigned = allTasks.filter((t) => t.current_status !== "final_approved").length;
  const revisionsCount = allTasks.filter((t) => t.current_status === "needs_revision").length;
  const completedCount = totalSubmissions || 0;

  return (
    <>
      <Header title="My Workspace" />
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">

        {/* Welcome Banner */}
        <section className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8">
          {/* M-stripe accent */}
          <div className="m-stripe mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="text-[#7e7e7e] text-xs tracking-[2px] uppercase mb-2">Welcome back</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-[1px] uppercase mb-3">
                {profile?.full_name}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 border border-[#0066b1] text-[#0066b1] text-xs font-bold tracking-[1px] uppercase">
                  Material Loader
                </span>
                <span className="text-[#bbbbbb] text-sm">
                  {formatSubRole(profile?.sub_role)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase mb-3">Total Assigned</h3>
            <p className="text-[40px] font-light text-white leading-none">{totalAssigned}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase mb-3">Pending Revisions</h3>
            <p className="text-[40px] font-light text-[#e22718] leading-none">{revisionsCount}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 hover:bg-[#262626] transition-colors">
            <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase mb-3">Total Submissions</h3>
            <p className="text-[40px] font-light text-[#0fa336] leading-none">{completedCount}</p>
          </div>
        </section>

        {/* Task Board */}
        <section>
          <h2 className="text-xs font-bold text-[#7e7e7e] mb-4 tracking-[3px] uppercase">Task Board</h2>
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
