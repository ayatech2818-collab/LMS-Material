import { Header } from "@/components/shared/header";
import { createAdminClient } from "@/lib/supabase/admin";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ProductivityTable } from "@/components/dashboard/productivity-table";
import { formatSubRole } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const supabase = createAdminClient();

  const [{ count: activeTasks }, { count: completedTasks }, { count: creators }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("current_status", "final_approved"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin")
  ]);

  const { data: rawTasks } = await supabase.from("tasks").select("current_status");
  const statusCounts: Record<string, number> = {};
  if (rawTasks) {
    rawTasks.forEach(task => {
      statusCounts[task.current_status] = (statusCounts[task.current_status] || 0) + 1;
    });
  }
  const chartData = [
    { status: "Assigned", count: statusCounts["assigned"] || 0 },
    { status: "Script Done", count: statusCounts["script_generated"] || 0 },
    { status: "Script App.", count: statusCounts["script_approved"] || 0 },
    { status: "Video Done", count: statusCounts["video_generated"] || 0 },
    { status: "Edited", count: statusCounts["video_edited"] || 0 },
    { status: "Final", count: statusCounts["final_approved"] || 0 },
  ];

  const { data: users } = await supabase.from("profiles").select("id, full_name, role, sub_role");
  const { data: assignments } = await supabase.from("task_assignments").select("user_id");

  const productivityData = (users || []).map(u => {
    const handles = (assignments || []).filter(a => a.user_id === u.id).length;
    return {
      fullName: u.full_name,
      role: u.role,
      subRole: formatSubRole(u.sub_role),
      tasksAssigned: handles
    };
  }).sort((a,b) => b.tasksAssigned - a.tasksAssigned);

  const { data: recentHistory } = await supabase
    .from("task_history")
    .select(`
      *,
      task:task_id(title, board:board_id(name), chapter:chapter_id(name))
    `)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>
      <Header title="Overview" />

      <div className="max-w-[1920px] mx-auto">
        <section className="mb-12">
          <h2 className="text-xs font-bold text-[#7e7e7e] mb-6 tracking-[3px] uppercase">
            Project Metrics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <StatCard title="Total Tasks Assigned" value={activeTasks || 0} />
            <StatCard title="Total Tasks Completed" value={completedTasks || 0} />
            <StatCard title="Total Creators" value={creators || 0} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <section>
            <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8 h-full">
              <h2 className="text-sm font-bold text-white tracking-[2px] uppercase mb-1">Pipeline Health</h2>
              <p className="text-[#7e7e7e] text-xs mb-4">Volume of tasks distributed across pipeline stages.</p>
              <BarChart data={chartData} />
            </div>
          </section>

          <section>
            <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8 h-full">
              <h2 className="text-sm font-bold text-white tracking-[2px] uppercase mb-1">Team Productivity</h2>
              <p className="text-[#7e7e7e] text-xs mb-6">Performance metrics highlighting task assignments by employee.</p>
              <ProductivityTable data={productivityData} />
            </div>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-xs font-bold text-[#7e7e7e] mb-6 tracking-[3px] uppercase">
            Recent Activity
          </h2>
          <div className="bg-[#1a1a1a] border border-[#3c3c3c] overflow-hidden">
            <div className="divide-y divide-[#3c3c3c]">
              {recentHistory?.map((event) => (
                <div key={event.id} className="px-4 md:px-6 py-4 hover:bg-[#262626] transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-1.5 h-1.5 shrink-0 bg-[#0066b1]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        Task <span className="font-bold">#{event.task_id.slice(0, 5)}</span> moved to{" "}
                        <span className="text-[#0066b1] font-bold uppercase">{event.new_status.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-[#7e7e7e] mt-0.5 truncate">
                        {event.task?.board?.name} • {event.task?.chapter?.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#7e7e7e] shrink-0">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {(!recentHistory || recentHistory.length === 0) && (
                <div className="p-12 text-center text-[#7e7e7e] italic">No recent activity found.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#3c3c3c] p-6 md:p-8 hover:bg-[#262626] transition-colors">
      <h3 className="text-[#7e7e7e] text-xs font-bold tracking-[1.5px] uppercase mb-4">{title}</h3>
      <p className="text-[44px] font-light text-white leading-none">
        {value}
      </p>
    </div>
  );
}
